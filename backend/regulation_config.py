"""
Authoritative Regulation Configuration.

Defines metadata, ordering, degree credit minimums, grade points,
curriculum code series, and hall-ticket pattern rules for all supported
and future JNTUH regulations.

Adding a new regulation in the future is purely configuration-driven.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class RegulationMetadata:
    regulation_id: str                   # e.g. "R18"
    display_name: str                    # e.g. "R18 Regulation"
    order: int                           # Chronological ordering rank (lower = older)
    academic_start_year: int             # e.g. 2018
    academic_end_year: Optional[int]     # e.g. 2022
    required_credits: int                # e.g. 160
    registered_credits: Optional[int]    # e.g. 160 or 164
    grade_points: Dict[str, int]         # Grade to grade-points mapping
    valid_grades: List[str]              # Valid letter grades
    curriculum_code_prefixes: List[str]  # e.g. ["15"] -> R18 codes
    ht_year_prefixes: List[str]          # e.g. ["18", "19", "20", "21"]
    scheme_family: str = "modern"        # "old" (R13, R15, R16) or "modern" (R18+)
    is_active: bool = True
    notes: str = ""


# Official Grade Points by Regulation
_GRADE_POINTS_MODERN: Dict[str, int] = {
    "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "D": 4, "F": 0, "Ab": 0, "-": 0
}

_GRADE_POINTS_OLD: Dict[str, int] = {
    "S": 10, "A": 9, "B": 8, "C": 7, "D": 6, "E": 5, "O": 10, "A+": 9, "B+": 8, "C+": 7, "F": 0, "Ab": 0, "-": 0
}


REGULATION_CONFIGS: Dict[str, RegulationMetadata] = {
    "R13": RegulationMetadata(
        regulation_id="R13",
        display_name="R13 Regulation",
        order=1,
        academic_start_year=2013,
        academic_end_year=2015,
        required_credits=216,
        registered_credits=224,
        grade_points=_GRADE_POINTS_OLD,
        valid_grades=list(_GRADE_POINTS_OLD.keys()),
        curriculum_code_prefixes=["13"],
        ht_year_prefixes=["13", "14"],
        scheme_family="old",
        notes="Register 224, earn 216 minimum.",
    ),
    "R15": RegulationMetadata(
        regulation_id="R15",
        display_name="R15 Regulation",
        order=2,
        academic_start_year=2015,
        academic_end_year=2016,
        required_credits=218,
        registered_credits=226,
        grade_points=_GRADE_POINTS_OLD,
        valid_grades=list(_GRADE_POINTS_OLD.keys()),
        curriculum_code_prefixes=["14"],
        ht_year_prefixes=["15"],
        scheme_family="old",
        notes="Register 226, earn 218 minimum.",
    ),
    "R16": RegulationMetadata(
        regulation_id="R16",
        display_name="R16 Regulation",
        order=3,
        academic_start_year=2016,
        academic_end_year=2018,
        required_credits=192,
        registered_credits=192,
        grade_points=_GRADE_POINTS_OLD,
        valid_grades=list(_GRADE_POINTS_OLD.keys()),
        curriculum_code_prefixes=["16"],
        ht_year_prefixes=["16", "17"],
        scheme_family="old",
        notes="24 credits x 8 semesters = 192 credits.",
    ),
    "R18": RegulationMetadata(
        regulation_id="R18",
        display_name="R18 Regulation",
        order=4,
        academic_start_year=2018,
        academic_end_year=2022,
        required_credits=160,
        registered_credits=160,
        grade_points=_GRADE_POINTS_MODERN,
        valid_grades=list(_GRADE_POINTS_MODERN.keys()),
        curriculum_code_prefixes=["15"],
        ht_year_prefixes=["18", "19", "20", "21"],
        scheme_family="modern",
        notes="160 credits CBCS framework.",
    ),
    "R22": RegulationMetadata(
        regulation_id="R22",
        display_name="R22 Regulation",
        order=5,
        academic_start_year=2022,
        academic_end_year=2024,
        required_credits=160,
        registered_credits=160,
        grade_points=_GRADE_POINTS_MODERN,
        valid_grades=list(_GRADE_POINTS_MODERN.keys()),
        curriculum_code_prefixes=["18"],
        ht_year_prefixes=["22", "23"],
        scheme_family="modern",
        notes="AICTE Model Curriculum aligned 160 credits.",
    ),
    "R24": RegulationMetadata(
        regulation_id="R24",
        display_name="R24 Regulation",
        order=6,
        academic_start_year=2024,
        academic_end_year=2025,
        required_credits=160,
        registered_credits=160,
        grade_points=_GRADE_POINTS_MODERN,
        valid_grades=list(_GRADE_POINTS_MODERN.keys()),
        curriculum_code_prefixes=["20"],
        ht_year_prefixes=["24"],
        scheme_family="modern",
        notes="Transitional regulation alias.",
    ),
    "R25": RegulationMetadata(
        regulation_id="R25",
        display_name="R25 Regulation",
        order=7,
        academic_start_year=2025,
        academic_end_year=None,
        required_credits=160,
        registered_credits=164,
        grade_points=_GRADE_POINTS_MODERN,
        valid_grades=list(_GRADE_POINTS_MODERN.keys()),
        curriculum_code_prefixes=["22"],
        ht_year_prefixes=["25", "26"],
        scheme_family="modern",
        notes="Register 164, earn 160 minimum.",
    ),
}

DEFAULT_REGULATION_ID = "R18"
