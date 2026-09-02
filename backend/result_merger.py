"""
Generic Academic Result Merging Engine.

Orchestrates:
1. Normalization
2. Identity Verification
3. Deduplication
4. Semester / Subject Ordering
5. Deterministic Conflict Resolution
6. Unified Student Result Construction
"""
from __future__ import annotations

import logging
from typing import Any, Callable, Dict, List, Optional

from backend.conflict_resolver import (
    consolidate_semesters,
    remap_detention_restarted_careers,
    resolve_subject_attempts,
)
from backend.identity_verifier import (
    IdentityVerificationResult,
    StudentIdentity,
    verify_student_identity,
)
from backend.regulation_registry import default_registry
from backend.result_normalizer import (
    NormalizedSemester,
    NormalizedStudentResult,
    NormalizedSubject,
    normalize_student_result,
)

logger = logging.getLogger("jntuh_api")


class GenericResultMerger:
    """
    Generic, reusable merger that consolidates student result records across regulations.
    Strictly verifies identity and applies deterministic conflict resolution.
    """

    def __init__(self, registry=None):
        self.registry = registry or default_registry

    def merge(
        self,
        results: List[NormalizedStudentResult | Dict[str, Any]],
        primary_identity: Optional[StudentIdentity] = None,
        status_fn: Optional[Callable[[List[Any], List[Any], str], str]] = None,
    ) -> NormalizedStudentResult:
        """
        Merge one or more regulation result sets into a unified student record.
        """
        if not results:
            raise ValueError("No result sets provided to merge.")

        # Step 1: Normalize all inputs
        norm_results: List[NormalizedStudentResult] = []
        for r in results:
            if isinstance(r, NormalizedStudentResult):
                norm_results.append(r)
            elif isinstance(r, dict):
                norm_results.append(normalize_student_result(r))

        # Filter only results that have data
        valid_results = [r for r in norm_results if r.subjects or r.semesters]
        if not valid_results:
            # Return first result shell as NOT_FOUND
            return norm_results[0]

        # Determine primary identity
        primary = primary_identity or valid_results[0].identity

        # Step 2: Identity Verification
        accepted_results: List[NormalizedStudentResult] = []
        rejected_audits: List[Dict[str, Any]] = []

        for res in valid_results:
            verif = verify_student_identity(primary, res.identity)
            if verif.is_match:
                accepted_results.append(res)
            else:
                logger.warning(
                    "[merger] Identity mismatch for %s (candidate: %s): %s",
                    primary.htno,
                    res.identity.htno,
                    verif.reason,
                )
                rejected_audits.append({
                    "htno": res.identity.htno,
                    "regulation": res.regulation,
                    "reason": verif.reason,
                })

        if not accepted_results:
            # None matched primary identity; fallback to the primary candidate
            accepted_results = [valid_results[0]]

        # Step 3: Combine raw subjects and semesters
        all_subjects: List[NormalizedSubject] = []
        all_semesters: List[NormalizedSemester] = []
        hall_tickets: List[str] = []
        regulations_found: List[str] = []
        student_names: List[str] = []
        official_cgpas: List[float] = []

        for res in accepted_results:
            if res.regulation and res.regulation not in regulations_found:
                regulations_found.append(res.regulation)
            ht = res.identity.htno
            if ht and ht not in hall_tickets:
                hall_tickets.append(ht)
            name = res.identity.student_name
            if name and name not in student_names and name.lower() != "unknown":
                student_names.append(name)
            if res.official_cgpa and res.official_cgpa > 0:
                official_cgpas.append(res.official_cgpa)

            all_subjects.extend(res.subjects)
            all_semesters.extend(res.semesters)

        # Step 4: Detention restart remapping
        mapped_subjects = remap_detention_restarted_careers(all_subjects)

        # Step 5: Deduplication & Conflict Resolution
        resolved_subjects = resolve_subject_attempts(mapped_subjects)

        # Step 6: Semester consolidation & subject assignment
        consolidated_sems = consolidate_semesters(all_semesters, resolved_subjects)

        # Step 7: Chronological regulations seen & active regulation
        regulations_seen: List[str] = []
        for s in consolidated_sems:
            if s.regulation and s.regulation not in regulations_seen:
                regulations_seen.append(s.regulation)

        # Fallback to regulations_found if no semester-level tags
        if not regulations_seen:
            regulations_seen = regulations_found or [primary.htno[:2]]

        # Latest regulation is the highest chronological rank seen
        ordered_ids = self.registry.get_ordered_ids()
        latest_reg = max(
            regulations_seen,
            key=lambda r: ordered_ids.index(r) if r in ordered_ids else -1,
            default=self.registry.get_or_default().regulation_id,
        )

        completed_count = len([s for s in consolidated_sems if s.sgpa > 0 or s.credits > 0 or s.subjects])
        best_name = student_names[-1] if student_names else (primary.student_name or "Unknown")
        best_cgpa = official_cgpas[-1] if official_cgpas else None

        # Check for active backlogs across entire consolidated record
        subject_attempts: Dict[str, List[NormalizedSubject]] = {}
        for s in resolved_subjects:
            code = s.subject_code or s.subject_name
            subject_attempts.setdefault(code, []).append(s)

        has_active_backlogs = any(
            not any(sub.is_pass for sub in atts)
            for atts in subject_attempts.values()
        )

        if status_fn:
            calc_status = status_fn(
                [s.to_dict() for s in consolidated_sems],
                [s.to_dict() for s in resolved_subjects],
                latest_reg,
            )
        else:
            if completed_count >= 8:
                calc_status = "graduated_with_backlogs" if has_active_backlogs else "graduated"
            else:
                calc_status = "studying"

        is_consolidated = len(regulations_seen) > 1 or len(hall_tickets) > 1

        merged_result = NormalizedStudentResult(
            identity=StudentIdentity(
                htno=hall_tickets[0] if hall_tickets else primary.htno,
                student_name=best_name,
                college_code=primary.college_code,
                branch_code=primary.branch_code,
            ),
            regulation=latest_reg,
            semesters=consolidated_sems,
            subjects=resolved_subjects,
            official_cgpa=best_cgpa,
            completed_semesters=completed_count,
            total_semesters=8,
            student_status=calc_status,
            fetch_status="FOUND",
            regulations_seen=regulations_seen,
            hall_tickets=hall_tickets,
            meta={
                "is_consolidated": is_consolidated,
                "sources_found": regulations_found,
                "consolidation_count": len(accepted_results),
                "rejected_mismatches": rejected_audits,
            },
        )
        return merged_result


# Global merger instance
default_merger = GenericResultMerger()
