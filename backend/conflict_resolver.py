"""
Deterministic Conflict Resolution and Deduplication Engine.

Handles:
- Best attempt resolution (retaining highest grade points)
- Supplementary and backlog clearances (cleared attempt resolves previous F/Ab)
- Updated and corrected marks
- Detention restarts with semester slot remapping
- Accurate attempt history preservation
"""
from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from backend.regulation_registry import default_registry
from backend.result_normalizer import NormalizedSemester, NormalizedSubject, is_passing_grade

logger = logging.getLogger("jntuh_api")


def _norm_code(code: Any) -> str:
    return str(code or "").strip().upper().replace(" ", "")


def _subject_identity_key(s: NormalizedSubject) -> Tuple[int, int, str]:
    return (s.year, s.sem, _norm_code(s.subject_code))


def resolve_subject_attempts(subjects: List[NormalizedSubject]) -> List[NormalizedSubject]:
    """
    Deduplicate and resolve subject attempts deterministically.
    
    Rules:
    1. If a subject has multiple attempts:
       - Attempt with higher grade points takes precedence.
       - If grade points are identical:
         - A grade of 'F' takes precedence over 'Ab' (student appeared).
         - A newer exam (higher exam_code_num) takes precedence over an older one (updated result).
    2. Maintain metadata about prior attempts (e.g. was_backlog, previous_grades).
    """
    if not subjects:
        return []

    grouped: Dict[Tuple[int, int, str], List[NormalizedSubject]] = defaultdict(list)
    anon_counter = 0

    for s in subjects:
        key = _subject_identity_key(s)
        if not key[2]:  # Anonymous / missing subject code
            anon_counter += 1
            key = (key[0], key[1], f"__anon__{anon_counter}")
        grouped[key].append(s)

    resolved: List[NormalizedSubject] = []

    for key, attempts in grouped.items():
        if len(attempts) == 1:
            resolved.append(attempts[0])
            continue

        # Sort attempts deterministically:
        # 1. grade_points (descending)
        # 2. passing grade over failing
        # 3. 'F' over 'Ab'
        # 4. exam_code_num (descending, newer attempt)
        def sort_key(sub: NormalizedSubject):
            g = sub.grade.upper()
            ab_penalty = 0 if g in ("AB", "ABSENT") else 1
            exam_num = sub.exam_code_num or 0
            return (sub.grade_points, 1 if sub.is_pass else 0, ab_penalty, exam_num)

        sorted_attempts = sorted(attempts, key=sort_key, reverse=True)
        best = sorted_attempts[0]

        # Check if there was a backlog clearance
        had_fail = any(not a.is_pass for a in attempts)
        has_pass = any(a.is_pass for a in attempts)
        if had_fail and has_pass:
            best.attempt_type = "backlog_cleared"

        resolved.append(best)

    return resolved


def remap_detention_restarted_careers(
    subjects: List[NormalizedSubject],
) -> List[NormalizedSubject]:
    """
    When a student restarts under a newer regulation after detention, upstream feeds
    often store both career phases under duplicate (year=1, sem=1) keys.
    
    This function detects distinct regulation phases and remaps the restarted phase
    onto chronologically free year-sem slots without collision.
    """
    if not subjects:
        return subjects

    # Group subjects by year-sem
    by_sem: Dict[Tuple[int, int], List[NormalizedSubject]] = defaultdict(list)
    for s in subjects:
        by_sem[(s.year, s.sem)].append(s)

    # Detect regulations present
    regs_present = {s.regulation for s in subjects if s.regulation}
    if len(regs_present) < 2:
        return subjects

    # Get ordering from registry
    ordered_regs = default_registry.get_ordered_ids()
    ranks = {
        r: ordered_regs.index(r) if r in ordered_regs else 99
        for r in regs_present
    }
    distinct_ranks = set(ranks.values())
    if len(distinct_ranks) < 2:
        return subjects

    earlier_rank = min(distinct_ranks)
    earlier_regs = {r for r, rk in ranks.items() if rk == earlier_rank}
    later_regs = {r for r, rk in ranks.items() if rk > earlier_rank}

    # Find the last semester key belonging to the earlier phase
    last_earlier: Optional[Tuple[int, int]] = None
    for key in sorted(k for k in by_sem if k[0] > 0):
        if any(s.regulation in earlier_regs for s in by_sem[key]):
            last_earlier = key

    if last_earlier is None:
        return subjects

    # Identify subjects that need to be peeled (later phase running concurrently in early slots)
    peel_ids: set[int] = set()
    for key, rows in by_sem.items():
        if key[0] <= 0:
            continue
        earlier_rows = [s for s in rows if s.regulation in earlier_regs]
        later_rows = [s for s in rows if s.regulation in later_regs]

        if earlier_rows and later_rows:
            for s in later_rows:
                peel_ids.add(id(s))
        elif later_rows and key <= last_earlier:
            for s in later_rows:
                peel_ids.add(id(s))

    if not peel_ids:
        return subjects

    keep: List[NormalizedSubject] = []
    peel: List[NormalizedSubject] = []
    for s in subjects:
        if id(s) in peel_ids:
            peel.append(s)
        else:
            keep.append(s)

    # Re-slot peeled subjects into free chronological semester slots
    slots = [(y, s) for y in range(1, 5) for s in (1, 2)]
    occupied = {(s.year, s.sem) for s in keep if s.year > 0}
    free_slots = [slot for slot in slots if slot > last_earlier and slot not in occupied]

    peel_groups: Dict[Tuple[int, int], List[NormalizedSubject]] = defaultdict(list)
    for s in peel:
        peel_groups[(s.year, s.sem)].append(s)

    ordered_peel_keys = sorted(peel_groups.keys())
    remapped: List[NormalizedSubject] = list(keep)

    for i, src_key in enumerate(ordered_peel_keys):
        if i >= len(free_slots):
            remapped.extend(peel_groups[src_key])
            continue
        dest_y, dest_s = free_slots[i]
        for s in peel_groups[src_key]:
            s.year = dest_y
            s.sem = dest_s
            remapped.append(s)

    logger.info(
        "[conflict_resolver] Remapped %d post-detention subjects across %d groups.",
        len(peel),
        len(peel_groups),
    )
    return remapped


def consolidate_semesters(
    semesters: List[NormalizedSemester],
    subjects: List[NormalizedSubject],
) -> List[NormalizedSemester]:
    """
    Consolidate duplicate semester rows (e.g. from multiple attempt feeds).
    Preserves highest valid SGPA and official earned credits.
    """
    buckets: Dict[Tuple[int, int], NormalizedSemester] = {}

    for sem in semesters:
        key = (sem.year, sem.sem)
        if key not in buckets:
            buckets[key] = sem
            continue

        cur = buckets[key]
        if sem.sgpa > 0 and (cur.sgpa == 0 or sem.sgpa > cur.sgpa):
            cur.sgpa = sem.sgpa
        if sem.credits > 0 and (cur.credits == 0 or sem.credits > cur.credits):
            cur.credits = sem.credits
        if sem.regulation and not cur.regulation:
            cur.regulation = sem.regulation

    # Group subjects by semester
    sub_map: Dict[Tuple[int, int], List[NormalizedSubject]] = defaultdict(list)
    for s in subjects:
        sub_map[(s.year, s.sem)].append(s)

    # Ensure every semester with subjects has a semester entry
    for key, subs in sub_map.items():
        if key[0] <= 0:
            continue
        if key not in buckets:
            majority_reg = subs[0].regulation if subs else None
            buckets[key] = NormalizedSemester(
                year=key[0],
                sem=key[1],
                sgpa=0.0,
                credits=sum(s.credits for s in subs if s.is_pass),
                regulation=majority_reg,
            )

    # Attach consolidated subjects
    for key, sem in buckets.items():
        sem.subjects = sub_map.get(key, [])
        has_fail = any(not s.is_pass for s in sem.subjects)
        if sem.subjects:
            sem.status = "has_backlogs" if has_fail else "completed"
        # Determine dominant regulation for semester if mixed
        if sem.subjects and not sem.regulation:
            sem.regulation = sem.subjects[-1].regulation

    return sorted(buckets.values(), key=lambda s: (s.year, s.sem))
