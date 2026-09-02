"""
Dynamic Regulation Discovery and Registry.

Treats regulations as ordered entities rather than hardcoded conditional branches.
Enables dynamic discovery of:
- Current regulation
- Previous regulation
- Next regulation
- Earliest available regulation
- Latest available regulation
- Regulation ordering
- Smallest necessary search paths for student resolution
"""
from __future__ import annotations

import logging
import re
from typing import Dict, List, Optional, Tuple

from backend.regulation_config import (
    DEFAULT_REGULATION_ID,
    REGULATION_CONFIGS,
    RegulationMetadata,
)

logger = logging.getLogger("jntuh_api")


class RegulationRegistry:
    """
    Registry for querying and managing regulation entities dynamically.
    No regulation-specific hardcoded branching should exist outside this registry.
    """

    def __init__(self, configs: Optional[Dict[str, RegulationMetadata]] = None):
        self._configs: Dict[str, RegulationMetadata] = dict(configs or REGULATION_CONFIGS)

    def register_regulation(self, metadata: RegulationMetadata) -> None:
        """Register or override a regulation dynamically (supports future regulations)."""
        self._configs[metadata.regulation_id.upper()] = metadata

    def get(self, reg_id: str) -> Optional[RegulationMetadata]:
        if not reg_id:
            return None
        return self._configs.get(reg_id.strip().upper())

    def get_or_default(self, reg_id: Optional[str] = None) -> RegulationMetadata:
        if reg_id:
            reg = self.get(reg_id)
            if reg:
                return reg
        return self._configs[DEFAULT_REGULATION_ID]

    def list_regulations(self, active_only: bool = True) -> List[RegulationMetadata]:
        """Return all regulations sorted in chronological order."""
        regs = list(self._configs.values())
        if active_only:
            regs = [r for r in regs if r.is_active]
        return sorted(regs, key=lambda r: (r.order, r.academic_start_year))

    def get_ordered_ids(self, active_only: bool = True) -> List[str]:
        return [r.regulation_id for r in self.list_regulations(active_only=active_only)]

    def get_earliest(self, active_only: bool = True) -> RegulationMetadata:
        ordered = self.list_regulations(active_only=active_only)
        if not ordered:
            raise ValueError("No regulations registered in registry")
        return ordered[0]

    def get_latest(self, active_only: bool = True) -> RegulationMetadata:
        ordered = self.list_regulations(active_only=active_only)
        if not ordered:
            raise ValueError("No regulations registered in registry")
        return ordered[-1]

    def get_previous(self, reg_id: str) -> Optional[RegulationMetadata]:
        ordered = self.list_regulations()
        ids = [r.regulation_id for r in ordered]
        key = reg_id.strip().upper()
        if key not in ids:
            return None
        idx = ids.index(key)
        return ordered[idx - 1] if idx > 0 else None

    def get_next(self, reg_id: str) -> Optional[RegulationMetadata]:
        ordered = self.list_regulations()
        ids = [r.regulation_id for r in ordered]
        key = reg_id.strip().upper()
        if key not in ids:
            return None
        idx = ids.index(key)
        return ordered[idx + 1] if idx < len(ordered) - 1 else None

    def get_adjacent(self, reg_id: str, direction: str = "both") -> List[RegulationMetadata]:
        """
        Get adjacent regulations.
        direction: "forward" (subsequent), "backward" (previous), or "both".
        """
        ordered = self.list_regulations()
        ids = [r.regulation_id for r in ordered]
        key = reg_id.strip().upper()
        if key not in ids:
            return []
        idx = ids.index(key)
        result: List[RegulationMetadata] = []
        if direction in ("backward", "both") and idx > 0:
            result.append(ordered[idx - 1])
        if direction in ("forward", "both") and idx < len(ordered) - 1:
            result.append(ordered[idx + 1])
        return result

    def detect_regulation_from_htno(self, htno: str) -> str:
        """Dynamically detect regulation from hall ticket number prefix."""
        if not htno or len(htno) < 2:
            return DEFAULT_REGULATION_ID

        clean = htno.strip().upper()
        prefix = clean[:2]

        # Match against configured ht_year_prefixes in descending order (latest first)
        ordered_desc = sorted(
            self.list_regulations(),
            key=lambda r: (r.order, r.academic_start_year),
            reverse=True,
        )
        for reg in ordered_desc:
            if prefix in reg.ht_year_prefixes:
                return reg.regulation_id

        # Fallback numeric heuristic for arbitrary future years
        try:
            yr = int(prefix)
            for reg in ordered_desc:
                # If roll year is >= regulation start year mod 100
                reg_start_mod = reg.academic_start_year % 100
                if yr >= reg_start_mod:
                    return reg.regulation_id
        except ValueError:
            pass

        return DEFAULT_REGULATION_ID

    def detect_regulation_from_subject_code(self, subject_code: str) -> Optional[str]:
        """Detect regulation from subject code leading series (e.g. 151AG -> R18, 18107 -> R22)."""
        if not subject_code:
            return None
        c = str(subject_code).strip().upper().replace(" ", "")
        prefix = ""
        if re.match(r"^\d{5}$", c) or re.match(r"^\d{3}[A-Z0-9]{2,}$", c):
            prefix = c[:2]
        if not prefix:
            return None

        for reg in self.list_regulations():
            if prefix in reg.curriculum_code_prefixes:
                return reg.regulation_id
        return None

    def determine_search_path(
        self,
        selected_regulation: Optional[str] = None,
        htno: Optional[str] = None,
        max_depth: Optional[int] = None,
    ) -> List[str]:
        """
        Dynamically determine the minimal, optimal search sequence of regulations.
        
        Symmetrical & Generic:
        - Primary starting point: selected_regulation (or detected from HTNO if None)
        - If HTNO indicates a different starting point (e.g. user selected R22, but HT is 18...),
          path prioritizes the detected regulation, then expands along the timeline.
        - Traversals move chronologically forward into newer regulations (for detention rejoins),
          and backward if needed (for historical semesters).
        - No hardcoded `R18 -> R19 -> R20` conditional branches!
        """
        ordered_ids = self.get_ordered_ids()
        if not ordered_ids:
            return [DEFAULT_REGULATION_ID]

        primary = (selected_regulation or "").strip().upper()
        if not primary or primary not in ordered_ids:
            primary = self.detect_regulation_from_htno(htno or "")

        primary_idx = ordered_ids.index(primary)

        detected = self.detect_regulation_from_htno(htno or "") if htno else primary
        detected_idx = ordered_ids.index(detected) if detected in ordered_ids else primary_idx

        # Build dynamic sequence without duplicates
        sequence: List[str] = [primary]

        # If detected is different from selected, prioritize detected or connection
        if detected != primary and detected in ordered_ids:
            sequence.append(detected)

        # Forward sequence: newer regulations where student could rejoin after detention
        forward_regs = ordered_ids[min(primary_idx, detected_idx) + 1 :]
        for r in forward_regs:
            if r not in sequence:
                sequence.append(r)

        # Backward sequence: older regulations (if student career began prior to selected)
        backward_regs = list(reversed(ordered_ids[: max(primary_idx, detected_idx)]))
        for r in backward_regs:
            if r not in sequence:
                sequence.append(r)

        if max_depth and max_depth > 0:
            sequence = sequence[:max_depth]

        return sequence


# Global default registry instance
default_registry = RegulationRegistry()
