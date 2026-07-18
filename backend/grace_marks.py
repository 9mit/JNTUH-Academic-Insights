"""Grace marks eligibility checker — rule-based, citation-backed."""
from typing import Any, Dict, List


def check_grace_eligibility(
    subjects: List[Dict[str, Any]],
    regulation: str = "R18",
) -> Dict[str, Any]:
    """
    JNTUH grace marks scheme (simplified rules for B.Tech):
    - Student must have cleared all subjects except at most 2 backlogs
    - Each backlog subject must be within grace threshold (typically 5 marks short)
    - Only applicable to final year / degree completion scenarios
    """
    backlogs = [
        s for s in subjects
        if s.get("grade") in ("F", "Ab")
    ]

    eligible_subjects: List[Dict[str, Any]] = []
    for subj in backlogs:
        external = subj.get("external") or 0
        total = subj.get("total") or 0
        marks_short = max(0, 40 - external) if external else max(0, 40 - (total // 2))
        if 0 < marks_short <= 5:
            eligible_subjects.append({
                "subject_code": subj.get("subject_code") or subj.get("code", ""),
                "subject_name": subj.get("subject_name") or subj.get("name", ""),
                "marks_short": marks_short,
                "grade": subj.get("grade"),
            })

    scheme_applies = regulation in ("R16", "R18", "R22", "R24", "R25") and len(backlogs) <= 2
    can_clear = scheme_applies and len(eligible_subjects) == len(backlogs) and len(backlogs) > 0

    return {
        "scheme_applies": scheme_applies,
        "backlog_count": len(backlogs),
        "eligible_count": len(eligible_subjects),
        "can_clear_with_grace": can_clear,
        "eligible_subjects": eligible_subjects,
        "citation": "JNTUH B.Tech grace marks scheme — verify with latest official notification",
        "disclaimer": "This is an estimate. Always confirm with your college examination branch.",
    }
