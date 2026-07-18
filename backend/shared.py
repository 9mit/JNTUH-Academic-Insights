"""
Shared utilities used by both server.py and data_processor.py.
Extracted to avoid circular imports.
"""
import json
import logging
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger("jntuh_api")

# ==========================================
# CONSTANTS & MAPPINGS
# ==========================================
GRADE_POINTS_BY_REGULATION: Dict[str, Dict[str, int]] = {
    "R25": {"O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "D": 4, "F": 0, "Ab": 0, "-": 0},
    "R24": {"O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "D": 4, "F": 0, "Ab": 0, "-": 0},
    "R22": {"O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "D": 4, "F": 0, "Ab": 0, "-": 0},
    "R18": {"O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "D": 4, "F": 0, "Ab": 0, "-": 0},
    "R16": {"S": 10, "A": 9, "B": 8, "C": 7, "D": 6, "E": 5, "O": 10, "A+": 9, "B+": 8, "C+": 7, "F": 0, "Ab": 0, "-": 0},
    "R15": {"S": 10, "A": 9, "B": 8, "C": 7, "D": 6, "E": 5, "O": 10, "A+": 9, "B+": 8, "C+": 7, "F": 0, "Ab": 0, "-": 0},
    "R13": {"S": 10, "A": 9, "B": 8, "C": 7, "D": 6, "E": 5, "O": 10, "A+": 9, "B+": 8, "C+": 7, "F": 0, "Ab": 0, "-": 0},
}

VALID_GRADES_BY_REGULATION: Dict[str, list] = {
    reg: list(grades.keys()) for reg, grades in GRADE_POINTS_BY_REGULATION.items()
}

# Degree credit minimums (keep in sync with src/constants/grading.ts REGULATION_CREDITS)
REGULATION_CREDITS: Dict[str, int] = {
    "R13": 216,
    "R15": 218,
    "R16": 192,
    "R18": 160,
    "R22": 160,
    "R24": 160,
    "R25": 160,
}

DEFAULT_REGULATION = "R18"


def get_required_credits(regulation: str | None = None) -> int:
    key = (regulation or DEFAULT_REGULATION).upper()
    return REGULATION_CREDITS.get(key, REGULATION_CREDITS[DEFAULT_REGULATION])


def detect_regulation(htno: str) -> str:
    """Detect JNTUH regulation from hall ticket number prefix."""
    if not htno or len(htno) < 2:
        return "R18"
    try:
        year = int(htno[0] + htno[1])
        if year >= 25:
            return "R25"
        if year >= 24:
            return "R24"
        if year >= 22:
            return "R22"
        if year >= 18:
            return "R18"
        if year >= 16:
            return "R16"
        if year == 15:
            return "R15"
        return "R13"
    except ValueError:
        return "R18"


def get_grade_points(grade: str, regulation: str = "R18") -> int:
    """Get grade point value for a grade under a given regulation."""
    return GRADE_POINTS_BY_REGULATION.get(
        regulation, GRADE_POINTS_BY_REGULATION["R18"]
    ).get(grade, 0)


# Grade letters that strongly indicate older (R13/R15/R16) vs modern (R18+) schemes
_OLD_SCHEME_GRADES = frozenset({"S", "E", "C+"})
_MODERN_SCHEME_GRADES = frozenset({"O", "A+", "D"})


def infer_regulation_from_grade(grade: str, fallback: str = DEFAULT_REGULATION) -> str:
    """
    Soft hint from grade letter when HT regulation may not match a memo line.
    Returns fallback for ambiguous grades (A, B, F, Ab, …).
    """
    g = (grade or "").strip()
    fb = (fallback or DEFAULT_REGULATION).upper()
    if g in _OLD_SCHEME_GRADES:
        if fb in ("R13", "R15", "R16"):
            return fb
        return "R16"
    if g in _MODERN_SCHEME_GRADES:
        if fb in ("R18", "R22", "R24", "R25"):
            return fb
        return "R18"
    return fb


def valid_grades_union(*regulations: str) -> list:
    """Union of valid grade tokens across one or more regulations."""
    regs = regulations or (DEFAULT_REGULATION,)
    seen: set[str] = set()
    out: list[str] = []
    for reg in regs:
        for g in VALID_GRADES_BY_REGULATION.get(reg, VALID_GRADES_BY_REGULATION[DEFAULT_REGULATION]):
            if g not in seen:
                seen.add(g)
                out.append(g)
    # Always include both scheme families so mixed memos parse
    for reg in ("R16", "R18"):
        for g in VALID_GRADES_BY_REGULATION[reg]:
            if g not in seen:
                seen.add(g)
                out.append(g)
    return out


def resolve_subject_regulation(grade: str, ht_regulation: str) -> str:
    """Pick regulation for grade-point lookup: HT stamp, refined by grade letter when needed."""
    ht_reg = (ht_regulation or DEFAULT_REGULATION).upper()
    g = (grade or "").strip()
    # If grade is only valid under the other family, switch
    ht_valid = set(VALID_GRADES_BY_REGULATION.get(ht_reg, []))
    if g and g not in ht_valid:
        inferred = infer_regulation_from_grade(g, ht_reg)
        if g in VALID_GRADES_BY_REGULATION.get(inferred, {}):
            return inferred
    return ht_reg
