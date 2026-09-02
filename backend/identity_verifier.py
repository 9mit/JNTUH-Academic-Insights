"""
Student Identity Verification Engine.

Guarantees that records discovered across different regulations or sources
strictly belong to the same student before any consolidation or merging occurs.
Prevents false-positive consolidation.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class StudentIdentity:
    htno: str
    student_name: str = ""
    college_code: str = ""
    course_code: str = ""
    branch_code: str = ""
    joining_year: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> StudentIdentity:
        ht = str(data.get("htno") or "").strip().upper()
        name = str(data.get("student_name") or data.get("name") or "").strip()

        # Parse JNTUH 10-character Hall Ticket format:
        # e.g. "20B91A0501" -> year: 20, college: "B9", course: "1A", branch: "05", roll: "01"
        college = ""
        course = ""
        branch = ""
        joining_yr = None

        if len(ht) >= 10:
            try:
                joining_yr = int(ht[:2])
            except ValueError:
                pass
            college = ht[2:4]
            course = ht[4:6]
            branch = ht[6:8]

        return cls(
            htno=ht,
            student_name=name,
            college_code=data.get("college_code") or college,
            course_code=data.get("course_code") or course,
            branch_code=data.get("branch_code") or branch,
            joining_year=data.get("joining_year") or joining_yr,
            metadata=dict(data),
        )


@dataclass
class IdentityVerificationResult:
    is_match: bool
    confidence: float  # 0.0 to 1.0
    reason: str
    identifiers_checked: List[str]


def _normalize_name(name: str) -> str:
    """Normalize student name for fuzzy token matching."""
    if not name or name.lower() in ("unknown", "none", "null", "-"):
        return ""
    # Remove honorifics, punctuation, and multiple spaces
    n = re.sub(r"\b(mr|ms|mrs|dr|sri|kumari)\b\.?", "", name.lower())
    n = re.sub(r"[^a-z0-9\s]", " ", n)
    return " ".join(n.split())


def _name_similarity(name1: str, name2: str) -> float:
    """
    Calculate name token similarity score (0.0 to 1.0).
    Handles initials (e.g. 'K SAI' vs 'KANDULA SAI') and rearranged tokens.
    """
    n1 = _normalize_name(name1)
    n2 = _normalize_name(name2)
    if not n1 or not n2:
        return 0.5  # Neutral if one name is unknown

    if n1 == n2:
        return 1.0

    tokens1 = set(n1.split())
    tokens2 = set(n2.split())

    if tokens1 == tokens2:
        return 1.0

    # Jaccard index on full words
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    base_score = len(intersection) / len(union) if union else 0.0

    # Handle single-letter initials (e.g. 'k' matches 'kandula')
    initial_matches = 0
    t1_singles = [t for t in tokens1 if len(t) == 1]
    t2_singles = [t for t in tokens2 if len(t) == 1]

    for init in t1_singles:
        if any(w.startswith(init) for w in tokens2 if len(w) > 1):
            initial_matches += 1

    for init in t2_singles:
        if any(w.startswith(init) for w in tokens1 if len(w) > 1):
            initial_matches += 1

    adjusted = min(1.0, base_score + (initial_matches * 0.25))
    return adjusted


def verify_student_identity(
    primary: StudentIdentity,
    candidate: StudentIdentity,
    name_threshold: float = 0.40,
) -> IdentityVerificationResult:
    """
    Strict identity verification before cross-regulation consolidation.
    
    1. Exact HTNO match:
       - If names are both provided, verify they are not radically conflicting.
       - Confidence: 0.95 - 1.0.
    2. Readmitted / related HTNO:
       - Same college code AND same branch code required.
       - Strict name match required (confidence >= 0.75).
    3. Different college / branch:
       - Confirmed mismatch: Reject!
    """
    checked = ["htno"]

    # Scenario A: Same Hall Ticket Number (detention within same HT)
    if primary.htno and candidate.htno and primary.htno == candidate.htno:
        name_sim = _name_similarity(primary.student_name, candidate.student_name)
        checked.append("student_name")

        # If names are both non-empty and have near-zero similarity, conflict detected
        p_name = _normalize_name(primary.student_name)
        c_name = _normalize_name(candidate.student_name)

        if p_name and c_name and name_sim < 0.15:
            # Different persons sharing an ID pattern
            return IdentityVerificationResult(
                is_match=False,
                confidence=0.1,
                reason=f"Hall ticket matches ({primary.htno}) but student names conflict: '{primary.student_name}' vs '{candidate.student_name}'",
                identifiers_checked=checked,
            )

        return IdentityVerificationResult(
            is_match=True,
            confidence=0.99 if name_sim >= name_threshold else 0.90,
            reason=f"Exact hall ticket match: {primary.htno}",
            identifiers_checked=checked,
        )

    # Scenario B: Related / Readmission Hall Ticket Number
    # Requires matching College Code and Branch Code
    if primary.college_code and candidate.college_code:
        checked.append("college_code")
        if primary.college_code != candidate.college_code:
            return IdentityVerificationResult(
                is_match=False,
                confidence=0.0,
                reason=f"College mismatch: {primary.college_code} vs {candidate.college_code}",
                identifiers_checked=checked,
            )

    if primary.branch_code and candidate.branch_code:
        checked.append("branch_code")
        if primary.branch_code != candidate.branch_code:
            return IdentityVerificationResult(
                is_match=False,
                confidence=0.0,
                reason=f"Branch mismatch: {primary.branch_code} vs {candidate.branch_code}",
                identifiers_checked=checked,
            )

    # For different HTNOs, strong name verification is mandatory
    checked.append("student_name")
    name_sim = _name_similarity(primary.student_name, candidate.student_name)

    if name_sim >= 0.70:
        return IdentityVerificationResult(
            is_match=True,
            confidence=round(name_sim, 2),
            reason=f"Related student profile matched across college, branch, and name (similarity: {name_sim:.2f})",
            identifiers_checked=checked,
        )

    return IdentityVerificationResult(
        is_match=False,
        confidence=round(name_sim, 2),
        reason=f"Insufficient matching identifiers across HTNOs '{primary.htno}' and '{candidate.htno}'",
        identifiers_checked=checked,
    )
