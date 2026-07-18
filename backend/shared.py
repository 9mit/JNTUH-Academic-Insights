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
