"""
Result Normalization Layer.

Normalizes diverse result schemas from different regulations, API endpoints,
and scrapers into a unified, canonical internal representation.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from backend.identity_verifier import StudentIdentity
from backend.regulation_registry import default_registry
from backend.shared import get_grade_points, resolve_subject_regulation


@dataclass
class NormalizedSubject:
    subject_code: str
    subject_name: str
    grade: str
    credits: float
    grade_points: int
    year: int
    sem: int
    regulation: str
    htno: Optional[str] = None
    exam_code: Optional[str] = None
    exam_code_num: Optional[int] = None
    attempt_type: str = "regular"  # "regular", "supplementary", "revaluation"
    internal: Optional[int] = None
    external: Optional[int] = None
    total: Optional[int] = None
    non_credit: bool = False
    is_pass: bool = False

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        return {k: v for k, v in d.items() if v is not None}


@dataclass
class NormalizedSemester:
    year: int
    sem: int
    sgpa: float = 0.0
    credits: float = 0.0
    regulation: Optional[str] = None
    subjects: List[NormalizedSubject] = field(default_factory=list)
    status: str = "studying"  # "completed", "has_backlogs", "studying"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "year": self.year,
            "sem": self.sem,
            "sgpa": self.sgpa,
            "credits": self.credits,
            "regulation": self.regulation,
            "status": self.status,
            "subjects": [s.to_dict() for s in self.subjects],
        }


@dataclass
class NormalizedStudentResult:
    identity: StudentIdentity
    regulation: str
    semesters: List[NormalizedSemester] = field(default_factory=list)
    subjects: List[NormalizedSubject] = field(default_factory=list)
    official_cgpa: Optional[float] = None
    completed_semesters: int = 0
    total_semesters: int = 8
    student_status: str = "studying"  # "studying", "graduated", "graduated_with_backlogs"
    fetch_status: str = "FOUND"  # "FOUND", "NOT_FOUND", "SOURCE_ERROR"
    source_error_detail: Optional[str] = None
    regulations_seen: List[str] = field(default_factory=list)
    hall_tickets: List[str] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.fetch_status == "FOUND",
            "htno": self.identity.htno,
            "student_name": self.identity.student_name,
            "regulation": self.regulation,
            "regulations_seen": self.regulations_seen or [self.regulation],
            "hall_tickets": self.hall_tickets or ([self.identity.htno] if self.identity.htno else []),
            "semesters": [s.to_dict() for s in self.semesters],
            "subjects": [s.to_dict() for s in self.subjects],
            "total_subjects": len(self.subjects),
            "completed_semesters": self.completed_semesters,
            "total_semesters": self.total_semesters,
            "official_cgpa": self.official_cgpa,
            "student_status": self.student_status,
            "fetch_status": self.fetch_status,
            "source_error_detail": self.source_error_detail,
            "meta": self.meta,
        }


def is_passing_grade(grade: str) -> bool:
    g = str(grade or "").strip().upper()
    return g not in ("F", "AB", "ABSENT", "-", "")


def normalize_subject_payload(
    subj_data: Dict[str, Any],
    default_year: int = 0,
    default_sem: int = 0,
    default_reg: str = "R18",
    htno: str = "",
) -> NormalizedSubject:
    code = str(subj_data.get("subject_code") or subj_data.get("subjectCode") or "").strip()
    name = str(subj_data.get("subject_name") or subj_data.get("subjectName") or "").strip()
    grade = str(subj_data.get("grade") or subj_data.get("grades") or "").strip()

    try:
        y = int(subj_data.get("year", default_year) or default_year)
    except (TypeError, ValueError):
        y = default_year

    try:
        s = int(subj_data.get("sem", default_sem) or default_sem)
    except (TypeError, ValueError):
        s = default_sem

    try:
        credits = float(subj_data.get("credits", 0.0) or 0.0)
    except (TypeError, ValueError):
        credits = 0.0

    # Determine subject-level regulation
    code_reg = default_registry.detect_regulation_from_subject_code(code)
    reg = str(subj_data.get("regulation") or code_reg or default_reg).upper()
    resolved_reg = resolve_subject_regulation(grade, reg)

    try:
        gp = int(subj_data.get("grade_points") or get_grade_points(grade, resolved_reg))
    except (TypeError, ValueError):
        gp = get_grade_points(grade, resolved_reg)

    exam_code = str(subj_data.get("exam_code") or subj_data.get("examCode") or "")
    exam_num = subj_data.get("exam_code_num")
    if exam_num is None and exam_code:
        digits = "".join(c for c in exam_code if c.isdigit())
        exam_num = int(digits) if digits else 0

    attempt_type = "regular"
    if "supple" in exam_code.lower() or "supply" in exam_code.lower():
        attempt_type = "supplementary"
    elif "rv" in exam_code.lower() or "reval" in exam_code.lower():
        attempt_type = "revaluation"

    return NormalizedSubject(
        subject_code=code,
        subject_name=name,
        grade=grade,
        credits=credits,
        grade_points=gp,
        year=y,
        sem=s,
        regulation=resolved_reg,
        htno=htno or subj_data.get("htno"),
        exam_code=exam_code or None,
        exam_code_num=exam_num,
        attempt_type=attempt_type,
        internal=subj_data.get("internal"),
        external=subj_data.get("external"),
        total=subj_data.get("total"),
        non_credit=bool(subj_data.get("non_credit")),
        is_pass=is_passing_grade(grade),
    )


def normalize_student_result(
    raw: Dict[str, Any],
    fallback_reg: Optional[str] = None,
) -> NormalizedStudentResult:
    """Normalize any result payload into canonical NormalizedStudentResult."""
    htno = str(raw.get("htno") or "").strip().upper()
    active_reg = (
        raw.get("regulation")
        or fallback_reg
        or default_registry.detect_regulation_from_htno(htno)
    ).upper()

    identity = StudentIdentity.from_dict(raw)

    raw_subs = raw.get("subjects") or []
    norm_subs: List[NormalizedSubject] = []
    for s in raw_subs:
        if isinstance(s, dict):
            norm_subs.append(
                normalize_subject_payload(
                    s,
                    default_year=s.get("year", 0),
                    default_sem=s.get("sem", 0),
                    default_reg=active_reg,
                    htno=htno,
                )
            )

    raw_sems = raw.get("semesters") or []
    norm_sems: List[NormalizedSemester] = []
    for sem in raw_sems:
        if not isinstance(sem, dict):
            continue
        try:
            y, s = int(sem.get("year", 0)), int(sem.get("sem", 0))
        except (TypeError, ValueError):
            continue
        if y <= 0 or s <= 0:
            continue

        sem_reg = (sem.get("regulation") or active_reg).upper()
        try:
            sgpa = float(sem.get("sgpa", 0.0) or 0.0)
        except (TypeError, ValueError):
            sgpa = 0.0
        try:
            credits = float(sem.get("credits", 0.0) or 0.0)
        except (TypeError, ValueError):
            credits = 0.0

        matching_subs = [sub for sub in norm_subs if sub.year == y and sub.sem == s]
        has_fail = any(not sub.is_pass for sub in matching_subs)

        norm_sems.append(
            NormalizedSemester(
                year=y,
                sem=s,
                sgpa=sgpa,
                credits=credits,
                regulation=sem_reg,
                subjects=matching_subs,
                status="has_backlogs" if has_fail else "completed" if (sgpa > 0 or credits > 0) else "studying",
            )
        )

    norm_sems.sort(key=lambda s: (s.year, s.sem))

    completed_count = len([s for s in norm_sems if s.sgpa > 0 or s.credits > 0 or s.subjects])
    official_cgpa = raw.get("official_cgpa")
    try:
        official_cgpa = float(official_cgpa) if official_cgpa is not None else None
    except (TypeError, ValueError):
        official_cgpa = None

    regulations_seen = raw.get("regulations_seen") or [active_reg]

    return NormalizedStudentResult(
        identity=identity,
        regulation=active_reg,
        semesters=norm_sems,
        subjects=norm_subs,
        official_cgpa=official_cgpa,
        completed_semesters=completed_count,
        total_semesters=8,
        student_status=raw.get("student_status", "studying"),
        fetch_status="FOUND" if (norm_subs or norm_sems) else "NOT_FOUND",
        regulations_seen=regulations_seen,
        hall_tickets=raw.get("hall_tickets") or ([htno] if htno else []),
        meta=dict(raw.get("fetch_meta") or {}),
    )
