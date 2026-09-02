"""
Dynamic Student-Result Resolution Engine.

Implements dynamic, regulation-aware resolution across current and future
academic regulations without hardcoded traversal paths.

Handles:
- Dynamic search path discovery
- Completeness evaluation
- Source status tracking (FOUND, NOT_FOUND, SOURCE_ERROR)
- Preservation of partial results under partial source failures
- Safe caching to avoid redundant lookups
"""
from __future__ import annotations

import logging
import time
from typing import Any, Callable, Dict, List, Optional, Tuple

from backend.identity_verifier import StudentIdentity
from backend.regulation_registry import RegulationRegistry, default_registry
from backend.result_merger import GenericResultMerger, default_merger
from backend.result_normalizer import (
    NormalizedStudentResult,
    normalize_student_result,
)

logger = logging.getLogger("jntuh_api")

# In-memory lookup cache: (htno, regulation) -> (timestamp, NormalizedStudentResult)
_LOOKUP_CACHE: Dict[Tuple[str, str], Tuple[float, NormalizedStudentResult]] = {}
_CACHE_TTL = 300  # 5 minutes


class DynamicRegulationResolver:
    """
    Coordinates multi-regulation student result discovery, traversal,
    failure tolerance, and consolidation.
    """

    def __init__(
        self,
        registry: Optional[RegulationRegistry] = None,
        merger: Optional[GenericResultMerger] = None,
        source_fetcher: Optional[Callable[[str, str, bool], Optional[Dict[str, Any]]]] = None,
    ):
        self.registry = registry or default_registry
        self.merger = merger or default_merger
        self.source_fetcher = source_fetcher

    def _is_record_complete(self, result: NormalizedStudentResult) -> bool:
        """
        Determine whether a returned result represents a complete academic record
        such that further regulation traversal is unnecessary.
        """
        if not result or result.fetch_status != "FOUND":
            return False

        # Graduated or 8 semesters present without active detention restart
        if result.completed_semesters >= 8:
            return True

        # If student has 4th year semesters (e.g. 4-1 and 4-2) and pass status
        has_final_year = any(s.year == 4 for s in result.semesters)
        if has_final_year and result.completed_semesters >= 6:
            # Check if all subjects passed
            all_pass = all(s.is_pass for s in result.subjects)
            if all_pass and result.completed_semesters >= 7:
                return True

        return False

    def _has_detention_or_migration_signal(self, result: NormalizedStudentResult) -> bool:
        """
        Check if the record shows signs of detention, gap, or regulation shift.
        """
        if not result or not result.subjects:
            return False

        # Multiple code-series present in subject codes
        detected_regs = {
            self.registry.detect_regulation_from_subject_code(s.subject_code)
            for s in result.subjects
            if s.subject_code
        }
        detected_regs.discard(None)
        if len(detected_regs) > 1:
            return True

        # Multiple subjects with different regulation stamps
        reg_stamps = {s.regulation for s in result.subjects if s.regulation}
        if len(reg_stamps) > 1:
            return True

        # Duplicate (year, sem) attempts that share keys
        sem_counts: Dict[Tuple[int, int], int] = {}
        for s in result.subjects:
            k = (s.year, s.sem)
            sem_counts[k] = sem_counts.get(k, 0) + 1
        if any(cnt > 12 for cnt in sem_counts.values()):
            return True

        return False

    def resolve_student_result(
        self,
        htno: str,
        selected_regulation: Optional[str] = None,
        force_refresh: bool = False,
        status_fn: Optional[Callable[[List[Any], List[Any], str], str]] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point for resolving a student's academic result dynamically.
        
        Step 1: Determine selected regulation.
        Step 2: Generate dynamic search path.
        Step 3: Query sources, tracking FOUND / NOT_FOUND / SOURCE_ERROR.
        Step 4: Stop when record is complete or search path exhausted.
        Step 5: Merge discovered records deterministically.
        Step 6: Return normalized unified student record.
        """
        clean_htno = (htno or "").strip().upper()
        if not clean_htno:
            raise ValueError("Hall ticket number cannot be empty.")

        # Step 1: Starting regulation
        detected_reg = self.registry.detect_regulation_from_htno(clean_htno)
        start_reg = (selected_regulation or detected_reg).upper()
        if not self.registry.get(start_reg):
            start_reg = detected_reg

        # Step 2: Dynamic search path
        search_path = self.registry.determine_search_path(
            selected_regulation=start_reg,
            htno=clean_htno,
        )

        discovered_results: List[NormalizedStudentResult] = []
        resolution_audit: List[Dict[str, Any]] = []
        partial_errors: List[str] = []

        # Step 3: Traversal
        for reg_id in search_path:
            cache_key = (clean_htno, reg_id)
            now = time.time()

            # Check cache unless force_refresh
            cached = None
            if not force_refresh and cache_key in _LOOKUP_CACHE:
                c_time, c_res = _LOOKUP_CACHE[cache_key]
                if now - c_time < _CACHE_TTL:
                    cached = c_res

            if cached is not None:
                current_result = cached
            else:
                try:
                    if self.source_fetcher:
                        raw_data = self.source_fetcher(clean_htno, reg_id, force_refresh)
                    else:
                        # Fallback default source fetch
                        from server import fetch_api_and_parse
                        raw_data = fetch_api_and_parse(clean_htno, force_refresh=force_refresh)

                    if raw_data:
                        current_result = normalize_student_result(raw_data, fallback_reg=reg_id)
                        current_result.fetch_status = "FOUND"
                    else:
                        current_result = NormalizedStudentResult(
                            identity=StudentIdentity.from_dict({"htno": clean_htno}),
                            regulation=reg_id,
                            fetch_status="NOT_FOUND",
                        )
                except Exception as exc:
                    # Distinguish NOT_FOUND from SOURCE_ERROR
                    err_msg = str(exc)
                    if "404" in err_msg or "No results found" in err_msg or "Invalid" in err_msg:
                        current_result = NormalizedStudentResult(
                            identity=StudentIdentity.from_dict({"htno": clean_htno}),
                            regulation=reg_id,
                            fetch_status="NOT_FOUND",
                        )
                    else:
                        logger.warning(
                            "[resolver] Source error querying %s for %s: %s",
                            reg_id,
                            clean_htno,
                            exc,
                        )
                        current_result = NormalizedStudentResult(
                            identity=StudentIdentity.from_dict({"htno": clean_htno}),
                            regulation=reg_id,
                            fetch_status="SOURCE_ERROR",
                            source_error_detail=err_msg,
                        )
                        partial_errors.append(f"{reg_id}: {err_msg}")

                # Cache lookup result
                _LOOKUP_CACHE[cache_key] = (now, current_result)

            status_entry = {
                "regulation": reg_id,
                "status": current_result.fetch_status,
                "semesters_found": len(current_result.semesters),
                "subjects_found": len(current_result.subjects),
            }
            if current_result.source_error_detail:
                status_entry["error"] = current_result.source_error_detail
            resolution_audit.append(status_entry)

            if current_result.fetch_status == "FOUND" and (current_result.subjects or current_result.semesters):
                discovered_results.append(current_result)

                # Check if we have achieved a complete record without needing more traversals
                if self._is_record_complete(current_result) and not self._has_detention_or_migration_signal(current_result):
                    logger.info(
                        "[resolver] Complete academic record found in %s for %s. Stopping traversal.",
                        reg_id,
                        clean_htno,
                    )
                    break

        # Step 4: If no results found at all
        if not discovered_results:
            # Check if all attempts had source errors vs not found
            has_error = any(entry["status"] == "SOURCE_ERROR" for entry in resolution_audit)
            detail = (
                f"Source error while connecting to academic records: {'; '.join(partial_errors)}"
                if has_error
                else "No academic results found for Hall Ticket Number across available regulations."
            )
            return {
                "success": False,
                "htno": clean_htno,
                "selected_regulation": start_reg,
                "fetch_status": "SOURCE_ERROR" if has_error else "NOT_FOUND",
                "detail": detail,
                "resolution_audit": resolution_audit,
                "partial_errors": partial_errors,
            }

        # Step 5: Merge discovered results
        primary_id = StudentIdentity.from_dict({
            "htno": clean_htno,
            "student_name": discovered_results[0].identity.student_name,
        })
        merged = self.merger.merge(
            discovered_results,
            primary_identity=primary_id,
            status_fn=status_fn,
        )

        out = merged.to_dict()
        out["selected_regulation"] = start_reg
        out["resolution_audit"] = resolution_audit
        out["search_path"] = search_path
        out["is_consolidated"] = len(merged.regulations_seen) > 1
        if partial_errors:
            out["partial_errors"] = partial_errors
        out["meta"]["search_path"] = search_path
        out["meta"]["is_consolidated"] = len(merged.regulations_seen) > 1
        out["meta"]["resolution_audit"] = resolution_audit

        return out


# Global default resolver
default_resolver = DynamicRegulationResolver()
