"""
Parse dhethi API payloads (consolidated academic + getAllResult attempt history).
"""
from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from backend.non_credit import normalize_non_credit_subject
from backend.shared import get_grade_points, resolve_subject_regulation

logger = logging.getLogger("jntuh_api")

_MALFORMED_SEM_LOGGED: set[str] = set()

# "1-1", "1 - 1", "I-I", "1/1", "Year 1 Sem 1"
_SEM_PATTERNS = [
    re.compile(r"^\s*([1-4])\s*[-–/_.]\s*([12])\s*$"),
    re.compile(r"^\s*([1-4])\s*[Yy](?:ear)?\s*[Ss](?:em(?:ester)?)?\s*([12])\s*$"),
]


def parse_year_sem(sem_str: str) -> Optional[Tuple[int, int]]:
    """Parse '1-1' / '4-2' style semester codes (tolerant of separators)."""
    raw = str(sem_str or "").strip()
    if not raw:
        return None
    for pat in _SEM_PATTERNS:
        m = pat.match(raw)
        if m:
            try:
                return int(m.group(1)), int(m.group(2))
            except (ValueError, TypeError):
                return None
    parts = re.split(r"[-–/_.\s]+", raw)
    if len(parts) >= 2:
        try:
            y, s = int(parts[0]), int(parts[1])
            if 1 <= y <= 4 and s in (1, 2):
                return y, s
        except (ValueError, TypeError):
            pass
    return None


def _subject_row_from_api(
    subj: Dict[str, Any],
    year: int,
    sem: int,
    htno: str,
    ht_reg: str,
    exam_code: str = "",
) -> Dict[str, Any]:
    grade = str(subj.get("grades") or "").strip()
    subj_reg = resolve_subject_regulation(grade, ht_reg)
    gp = get_grade_points(grade, subj_reg)
    code = str(subj.get("subjectCode") or "").strip()
    name = str(subj.get("subjectName") or "").strip()
    try:
        credits = float(subj.get("credits", 0.0) or 0.0)
    except (TypeError, ValueError):
        credits = 0.0

    normalized = normalize_non_credit_subject(
        subj.get("internalMarks"),
        subj.get("externalMarks"),
        subj.get("totalMarks"),
        credits,
    )

    row: Dict[str, Any] = {
        "subject_code": code,
        "subject_name": name,
        "grade": grade,
        "credits": normalized["credits"],
        "grade_points": gp,
        "year": year,
        "sem": sem,
        "htno": htno,
        "regulation": subj_reg,
        "non_credit": bool(normalized.get("non_credit")),
    }
    if exam_code:
        row["exam_code"] = exam_code
        try:
            row["exam_code_num"] = int(re.sub(r"\D", "", str(exam_code)) or "0")
        except (TypeError, ValueError):
            row["exam_code_num"] = 0
    if "internal" in normalized:
        row["internal"] = normalized["internal"]
    if "external" in normalized:
        row["external"] = normalized["external"]
    if "total" in normalized:
        row["total"] = normalized["total"]
    return row


def flatten_academic_results(
    api_json: Dict[str, Any],
    htno: str,
    ht_reg: str,
) -> Dict[str, Any]:
    """Flatten consolidated getAcademicResult payload."""
    subjects: List[Dict[str, Any]] = []
    semesters: List[Dict[str, Any]] = []
    results = api_json.get("results") or {}
    raw_sems = results.get("semesters") or []
    if not isinstance(raw_sems, list):
        raw_sems = []

    for sem_data in raw_sems:
        if not isinstance(sem_data, dict):
            continue
        parsed = parse_year_sem(sem_data.get("semester", ""))
        if not parsed:
            key = str(sem_data.get("semester", ""))
            if key and key not in _MALFORMED_SEM_LOGGED:
                _MALFORMED_SEM_LOGGED.add(key)
                logger.warning("[API] Skipping malformed academic semester key: %r", key)
            continue
        year, sem = parsed
        for subj in sem_data.get("subjects") or []:
            if isinstance(subj, dict):
                subjects.append(_subject_row_from_api(subj, year, sem, htno, ht_reg))

        sgpa_raw = sem_data.get("semesterSGPA", 0.0)
        sgpa_val = (
            float(sgpa_raw)
            if str(sgpa_raw).replace(".", "", 1).isdigit()
            else 0.0
        )
        try:
            sem_credits = float(sem_data.get("semesterCredits", 0.0) or 0.0)
        except (TypeError, ValueError):
            sem_credits = 0.0

        semesters.append(
            {
                "year": year,
                "sem": sem,
                "sgpa": sgpa_val,
                "credits": sem_credits,
                "regulation": ht_reg,
            }
        )

    official_cgpa = None
    cgpa_val = results.get("CGPA")
    # Accept 0 / "0.0" / 6.76 — only reject missing / non-numeric
    if cgpa_val is not None and str(cgpa_val).strip() != "":
        try:
            official_cgpa = float(cgpa_val)
        except (TypeError, ValueError):
            cleaned = str(cgpa_val).replace(".", "", 1)
            if cleaned.isdigit():
                official_cgpa = float(cgpa_val)

    return {
        "subjects": subjects,
        "semesters": semesters,
        "official_cgpa": official_cgpa,
        "student_name": (api_json.get("details") or {}).get("name", "Unknown"),
    }


def flatten_all_results(
    api_json: Dict[str, Any],
    htno: str,
    ht_reg: str,
) -> Dict[str, Any]:
    """
    Flatten getAllResult payload: every exam attempt under each semester.

    Shape:
      results: [ { semester, exams: [ { examCode, subjects: [...] }, ... ] }, ... ]
    or sometimes results as a dict with similar nesting.
    """
    subjects: List[Dict[str, Any]] = []
    semester_keys: set[Tuple[int, int]] = set()

    raw = api_json.get("results")
    entries: List[Any] = []
    if isinstance(raw, list):
        entries = raw
    elif isinstance(raw, dict):
        if isinstance(raw.get("semesters"), list):
            entries = raw["semesters"]
        else:
            entries = list(raw.values())

    for sem_data in entries:
        if not isinstance(sem_data, dict):
            continue
        parsed = parse_year_sem(sem_data.get("semester", ""))
        if not parsed:
            key = str(sem_data.get("semester", ""))
            if key and key not in _MALFORMED_SEM_LOGGED:
                _MALFORMED_SEM_LOGGED.add(key)
                logger.warning("[API] Skipping malformed all-result semester key: %r", key)
            continue
        year, sem = parsed
        semester_keys.add((year, sem))

        exams = sem_data.get("exams")
        if isinstance(exams, dict):
            exam_list = list(exams.values())
        elif isinstance(exams, list):
            exam_list = exams
        else:
            exam_list = [{"examCode": "", "subjects": sem_data.get("subjects") or []}]

        for exam in exam_list:
            if not isinstance(exam, dict):
                continue
            exam_code = str(exam.get("examCode") or "")
            for subj in exam.get("subjects") or []:
                if isinstance(subj, dict):
                    subjects.append(
                        _subject_row_from_api(subj, year, sem, htno, ht_reg, exam_code)
                    )

    semesters = [
        {"year": y, "sem": s, "sgpa": 0.0, "credits": 0.0, "regulation": ht_reg}
        for y, s in sorted(semester_keys)
    ]

    return {
        "subjects": subjects,
        "semesters": semesters,
        "student_name": (api_json.get("details") or {}).get("name", "Unknown"),
        "semester_count": len(semester_keys),
        "attempt_rows": len(subjects),
    }


def flatten_credits_checker(
    api_json: Dict[str, Any],
) -> Dict[Tuple[int, int], float]:
    """Map (year, sem) → earned credits from getCreditsChecker."""
    out: Dict[Tuple[int, int], float] = {}
    results = api_json.get("results") or {}
    years = results.get("academicYears") or []
    if not isinstance(years, list):
        return out
    for year_block in years:
        if not isinstance(year_block, dict):
            continue
        sw = year_block.get("semesterWiseCredits") or {}
        if not isinstance(sw, dict):
            continue
        for sem_key, cred in sw.items():
            parsed = parse_year_sem(str(sem_key))
            if not parsed:
                continue
            try:
                out[parsed] = float(cred or 0.0)
            except (TypeError, ValueError):
                continue
    return out
