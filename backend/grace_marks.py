"""Grace marks & credit exemption eligibility checker — rule-based, university regulation backed."""
from typing import Any, Dict, List


def check_grace_eligibility(
    subjects: List[Dict[str, Any]],
    regulation: str = "R18",
) -> Dict[str, Any]:
    """
    JNTUH grace marks & credit exemption rules:
    1. Grace Marks Ordinance:
       - Up to 0.15% of total aggregate marks (approx 8-9 marks for B.Tech)
       - Can be distributed across at most 1 or 2 failed subjects
       - Each failed subject must be within deficit threshold (1 to 5-8 marks short of passing)
    2. Credit Exemption Ordinance (R18 / R16 / R15):
       - R18: Allows exempting up to 2 failed subjects (maximum 6 credits) from electives,
         provided all core theory and lab subjects are cleared.
       - R16/R15: Allows exempting up to 8 credits (2 or 3 subjects).
       - R22: No credit exemption permitted (all 160 credits mandatory).
    """
    backlogs = [
        s for s in subjects
        if s.get("grade") in ("F", "Ab", "AB")
    ]

    eligible_for_grace: List[Dict[str, Any]] = []
    exemptible_subjects: List[Dict[str, Any]] = []

    # Calculate deficit for each backlog
    for subj in backlogs:
        code = str(subj.get("subject_code") or subj.get("code") or "").upper().strip()
        name = str(subj.get("subject_name") or subj.get("name") or "").strip()
        name_lower = name.lower()
        external = subj.get("external") or 0
        total = subj.get("total") or 0
        credits_val = float(subj.get("credits") or 3.0)

        # Standard JNTUH External Pass mark = 26/75 (or 21/70)
        # Total Pass mark = 35 or 40/100
        marks_short = 0
        if external > 0:
            marks_short = max(0, 26 - external) + max(0, 40 - total)
        elif total > 0:
            marks_short = max(0, 40 - total)
        else:
            marks_short = 5  # default estimate when raw marks unavailable

        is_grace_fit = 0 < marks_short <= 8
        if is_grace_fit:
            eligible_for_grace.append({
                "subject_code": code,
                "subject_name": name,
                "marks_short": marks_short,
                "credits": credits_val,
                "grade": subj.get("grade"),
            })

        # Credit exemption candidate: Electives or non-core courses (typically 3 credits each)
        is_elective = any(kw in name_lower for kw in [
            "elective", "open elective", "professional elective", "pe-", "oe-", "management", "humanities"
        ]) or credits_val <= 3.0

        if is_elective:
            exemptible_subjects.append({
                "subject_code": code,
                "subject_name": name,
                "credits": credits_val,
                "grade": subj.get("grade"),
            })

    total_backlogs = len(backlogs)

    # 1. Grace marks applicability
    max_grace_marks = 8 if regulation in ("R18", "R16") else 10 if regulation == "R15" else 5
    scheme_applies = regulation in ("R13", "R15", "R16", "R18", "R22", "R24", "R25") and total_backlogs <= 2
    can_clear_with_grace = (
        scheme_applies and
        total_backlogs > 0 and
        len(eligible_for_grace) == total_backlogs and
        sum(s["marks_short"] for s in eligible_for_grace) <= max_grace_marks
    )

    # 2. Credit exemption applicability
    exemption_allowed = regulation in ("R18", "R16", "R15", "R13")
    max_exempt_credits = 6 if regulation == "R18" else 8 if regulation in ("R16", "R15") else 0
    can_clear_with_exemption = (
        exemption_allowed and
        total_backlogs > 0 and
        total_backlogs <= (2 if regulation == "R18" else 3) and
        sum(s["credits"] for s in exemptible_subjects) <= max_exempt_credits and
        len(exemptible_subjects) == total_backlogs
    )

    return {
        "scheme_applies": scheme_applies,
        "backlog_count": total_backlogs,
        "eligible_count": len(eligible_for_grace),
        "can_clear_with_grace": can_clear_with_grace,
        "max_grace_marks_quota": max_grace_marks,
        "eligible_subjects": eligible_for_grace,
        # Credit Exemption Scheme
        "exemption_allowed": exemption_allowed,
        "can_clear_with_exemption": can_clear_with_exemption,
        "max_exempt_credits": max_exempt_credits,
        "exemptible_subjects": exemptible_subjects,
        # Guidelines & Actions
        "ordinance_title": f"JNTUH {regulation} Degree Award Ordinances",
        "citation": f"JNTUH {regulation} Academic Regulations (Grace Marks & Exemption Ordinances)",
        "disclaimer": "Official confirmation required from your college examination branch before applying for PC / CMM.",
    }
