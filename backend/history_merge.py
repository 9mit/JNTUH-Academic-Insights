"""
Academic history helpers: same-HT multi-regulation careers (detention → continue)
and optional multi-HT merge.
"""
from __future__ import annotations

import logging
import re
from collections import Counter, defaultdict
from typing import Any, Callable, Dict, List, Optional, Tuple

from backend.shared import (
    detect_regulation,
    get_grade_points,
    resolve_subject_regulation,
)

logger = logging.getLogger("jntuh_api")

_OLD_SIGNAL = frozenset({"S", "E", "C+"})
_MODERN_SIGNAL = frozenset({"O", "A+"})  # strong modern letters (D is ambiguous with R16)
_OLD_FAMILY = frozenset({"R13", "R15", "R16"})
_MODERN_FAMILY = frozenset({"R18", "R22", "R24", "R25"})


def _ht_year(htno: str) -> int:
    try:
        return int(str(htno)[:2])
    except (TypeError, ValueError):
        return 0


def _norm_code(code: Any) -> str:
    return str(code or "").strip().upper().replace(" ", "")


def _subject_scheme_hint(subj: Dict[str, Any]) -> Optional[str]:
    """Strong grade-letter scheme only — never guess from subject codes (R18 uses numeric codes too)."""
    g = str(subj.get("grade") or "").strip()
    if g in _OLD_SIGNAL:
        return "old"
    if g in _MODERN_SIGNAL:
        return "modern"
    return None


def _subject_key(subj: Dict[str, Any]) -> Tuple[int, int, str]:
    return (
        int(subj.get("year") or 0),
        int(subj.get("sem") or 0),
        _norm_code(subj.get("subject_code")),
    )


def _gp(subj: Dict[str, Any]) -> float:
    try:
        return float(subj.get("grade_points") or 0)
    except (TypeError, ValueError):
        return 0.0


def _scheme_family(reg: str) -> str:
    r = (reg or "").upper()
    if r in _OLD_FAMILY:
        return "old"
    if r in _MODERN_FAMILY:
        return "modern"
    return "modern"


def _modern_peer(ht_reg: str) -> str:
    """Modern scheme peer for grade points (tables identical R18–R25)."""
    ht = (ht_reg or "R18").upper()
    if ht in _MODERN_FAMILY:
        return ht
    return "R18"


def _old_peer(ht_reg: str) -> str:
    ht = (ht_reg or "R16").upper()
    if ht in _OLD_FAMILY:
        return ht
    return "R16"


def dedupe_subjects_best_attempt(subjects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Keep highest grade_points per (year, sem, subject_code)."""
    best: Dict[Tuple[int, int, str], Dict[str, Any]] = {}
    anon = 0
    for subj in subjects:
        key = _subject_key(subj)
        if not key[2]:
            anon += 1
            key = (key[0], key[1], f"__anon__{anon}")
        existing = best.get(key)
        if existing is None or _gp(subj) > _gp(existing):
            best[key] = subj
        elif (
            _gp(subj) == _gp(existing)
            and str(subj.get("grade")) == "F"
            and str(existing.get("grade")) == "Ab"
        ):
            best[key] = subj
    return list(best.values())


def _majority_regulation(subjects: List[Dict[str, Any]], fallback: str) -> str:
    regs = [str(s.get("regulation") or "").upper() for s in subjects if s.get("regulation")]
    if not regs:
        return fallback
    return Counter(regs).most_common(1)[0][0]


def _semester_scheme_vote(subjects: List[Dict[str, Any]]) -> Optional[str]:
    """Return 'old' | 'modern' | None from grade letters + subject-code shape."""
    old_n = 0
    modern_n = 0
    for s in subjects:
        hint = _subject_scheme_hint(s)
        if hint == "old":
            old_n += 1
        elif hint == "modern":
            modern_n += 1
    if old_n == 0 and modern_n == 0:
        return None
    if old_n > modern_n:
        return "old"
    if modern_n > old_n:
        return "modern"
    return None


def _slot_order() -> List[Tuple[int, int]]:
    return [(y, s) for y in range(1, 5) for s in (1, 2)]


def expand_detention_restart(subjects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    When a student restarts under a new regulation after detention, dhethi keeps
    both careers under the same 1-1 / 1-2 keys. Peel the later (modern) exam wave
    out of slots that also contain an earlier old-scheme wave, onto the next free
    year-sem slots so the post-detention timeline is visible.
    """
    if not subjects:
        return subjects

    by_sem: Dict[Tuple[int, int], List[Dict[str, Any]]] = defaultdict(list)
    for subj in subjects:
        by_sem[(int(subj.get("year") or 0), int(subj.get("sem") or 0))].append(subj)

    last_old: Optional[Tuple[int, int]] = None
    mixed_keys: List[Tuple[int, int]] = []
    for key in sorted(k for k in by_sem if k[0] > 0):
        old_subs = [s for s in by_sem[key] if _subject_scheme_hint(s) == "old"]
        modern_subs = [s for s in by_sem[key] if _subject_scheme_hint(s) == "modern"]
        if old_subs:
            last_old = key
        if old_subs and modern_subs:
            mixed_keys.append(key)

    if not mixed_keys or last_old is None:
        return subjects

    peel_ids: set[int] = set()
    for key in mixed_keys:
        rows = by_sem[key]
        old_exam_max = max(
            (int(s.get("exam_code_num") or 0) for s in rows if _subject_scheme_hint(s) == "old"),
            default=0,
        )
        for idx, subj in enumerate(rows):
            hint = _subject_scheme_hint(subj)
            exam_n = int(subj.get("exam_code_num") or 0)
            # Peel modern-letter rows, or any row from a later exam wave than old grades
            if hint == "modern" or (old_exam_max and exam_n > old_exam_max):
                peel_ids.add(id(subj))

    if not peel_ids:
        return subjects

    peel: List[Dict[str, Any]] = []
    keep: List[Dict[str, Any]] = []
    for subj in subjects:
        if id(subj) in peel_ids:
            peel.append(dict(subj))
        else:
            keep.append(subj)

    peel_groups: Dict[Tuple[int, int], List[Dict[str, Any]]] = defaultdict(list)
    for subj in peel:
        peel_groups[(int(subj.get("year") or 0), int(subj.get("sem") or 0))].append(subj)

    occupied = {
        (int(s.get("year") or 0), int(s.get("sem") or 0))
        for s in keep
        if int(s.get("year") or 0) > 0
    }
    free = [slot for slot in _slot_order() if slot > last_old and slot not in occupied]

    ordered_keys = sorted(
        peel_groups.keys(),
        key=lambda k: (
            min((int(s.get("exam_code_num") or 0) for s in peel_groups[k]), default=0),
            k,
        ),
    )

    remapped: List[Dict[str, Any]] = list(keep)
    for i, src_key in enumerate(ordered_keys):
        if i >= len(free):
            remapped.extend(peel_groups[src_key])
            continue
        dest_y, dest_s = free[i]
        for subj in peel_groups[src_key]:
            row = dict(subj)
            row["year"] = dest_y
            row["sem"] = dest_s
            row["career_phase"] = 2
            row["original_year"] = src_key[0]
            row["original_sem"] = src_key[1]
            remapped.append(row)

    logger.info(
        "[merge] detention restart remap: peeled=%s groups=%s free_used=%s last_old=%s",
        len(peel),
        len(ordered_keys),
        min(len(ordered_keys), len(free)),
        last_old,
    )
    return remapped


def consolidate_semester_rows(semesters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Merge duplicate (year, sem) rows from the API (supply / rejoin attempts).
    Prefer the last non-zero SGPA and non-zero credits.
    """
    buckets: Dict[Tuple[int, int], Dict[str, Any]] = {}
    order: List[Tuple[int, int]] = []
    for sem in semesters:
        try:
            y, s = int(sem["year"]), int(sem["sem"])
        except (KeyError, TypeError, ValueError):
            continue
        key = (y, s)
        if key not in buckets:
            buckets[key] = {
                "year": y,
                "sem": s,
                "sgpa": float(sem.get("sgpa") or 0),
                "credits": float(sem.get("credits") or 0),
                "regulation": sem.get("regulation"),
            }
            order.append(key)
            continue
        cur = buckets[key]
        try:
            sgpa = float(sem.get("sgpa") or 0)
        except (TypeError, ValueError):
            sgpa = 0.0
        try:
            credits = float(sem.get("credits") or 0)
        except (TypeError, ValueError):
            credits = 0.0
        if sgpa > 0:
            cur["sgpa"] = sgpa
        if credits > 0:
            cur["credits"] = credits
        if sem.get("regulation"):
            cur["regulation"] = sem.get("regulation")
    return [buckets[k] for k in sorted(order)]


def annotate_same_ht_career(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Same hall ticket, possible regulation change after detention.

    - Keep every (year, sem) that appears (no drops)
    - Consolidate duplicate semester rows
    - Detect old→modern scheme shift from grade letters; stamp per subject/semester
    - Top-level regulation = chronologically latest semester scheme (for degree min / UI)
    """
    htno = str(result.get("htno") or "")
    ht_reg = (result.get("regulation") or detect_regulation(htno)).upper()
    subjects = [dict(s) for s in (result.get("subjects") or [])]
    # Peel restarted modern career out of shared 1-1.. slots before consolidating
    subjects = expand_detention_restart(subjects)
    semesters = consolidate_semester_rows(list(result.get("semesters") or []))

    by_sem: Dict[Tuple[int, int], List[Dict[str, Any]]] = defaultdict(list)
    for subj in subjects:
        by_sem[(int(subj.get("year") or 0), int(subj.get("sem") or 0))].append(subj)

    existing = {(int(s["year"]), int(s["sem"])) for s in semesters}
    for key in by_sem:
        if key[0] > 0 and key not in existing:
            semesters.append({"year": key[0], "sem": key[1], "sgpa": 0.0, "credits": 0.0})
            existing.add(key)
    semesters.sort(key=lambda x: (int(x["year"]), int(x["sem"])))

    career_family = _scheme_family(ht_reg)
    seen_old = career_family == "old"
    sticky_modern = False
    regulations_seen: List[str] = []

    for sem_row in semesters:
        key = (int(sem_row["year"]), int(sem_row["sem"]))
        subs = by_sem.get(key, [])
        vote = _semester_scheme_vote(subs)

        if vote == "old":
            seen_old = True
            sticky_modern = False
            sem_reg = _old_peer(ht_reg)
        elif vote == "modern":
            if seen_old or _scheme_family(ht_reg) == "old":
                sticky_modern = True
                sem_reg = _modern_peer(ht_reg)
            else:
                sem_reg = ht_reg
        else:
            if sticky_modern:
                sem_reg = _modern_peer(ht_reg)
            else:
                sem_reg = ht_reg

        sem_row["regulation"] = sem_reg
        if sem_reg not in regulations_seen:
            regulations_seen.append(sem_reg)

        for subj in subs:
            grade = str(subj.get("grade") or "").strip()
            if grade in _OLD_SIGNAL:
                subj_reg = _old_peer(ht_reg)
            elif sticky_modern and grade not in _OLD_SIGNAL:
                subj_reg = sem_reg
            else:
                subj_reg = resolve_subject_regulation(grade, sem_reg)
            subj["regulation"] = subj_reg
            subj["grade_points"] = get_grade_points(grade, subj_reg)
            if not subj.get("htno"):
                subj["htno"] = htno

    subjects = dedupe_subjects_best_attempt(subjects)

    by_sem = defaultdict(list)
    for subj in subjects:
        by_sem[(int(subj.get("year") or 0), int(subj.get("sem") or 0))].append(subj)
    for sem_row in semesters:
        key = (int(sem_row["year"]), int(sem_row["sem"]))
        sem_row["regulation"] = _majority_regulation(
            by_sem.get(key, []), sem_row.get("regulation") or ht_reg
        )

    latest_reg = ht_reg
    if semesters:
        latest_reg = semesters[-1].get("regulation") or ht_reg
    if seen_old and any(_scheme_family(str(s.get("regulation"))) == "modern" for s in semesters):
        for s in reversed(semesters):
            if _scheme_family(str(s.get("regulation"))) == "modern":
                latest_reg = s["regulation"]
                break

    out = dict(result)
    out["subjects"] = subjects
    out["semesters"] = semesters
    out["total_subjects"] = len(subjects)
    out["regulation"] = latest_reg
    out["regulations_seen"] = regulations_seen or [latest_reg]
    out["hall_tickets"] = out.get("hall_tickets") or ([htno] if htno else [])
    out["completed_semesters"] = len(
        [
            s
            for s in semesters
            if float(s.get("sgpa") or 0) > 0
            or float(s.get("credits") or 0) > 0
            or by_sem.get((int(s["year"]), int(s["sem"])))
        ]
    )
    return out


def normalize_htno_list(primary: str, related: Optional[List[str]] = None) -> List[str]:
    """Parse primary (+ optional related) into unique ordered 10-char HTs (max 2)."""
    tokens: List[str] = []
    for chunk in re.split(r"[,;\s]+", (primary or "").upper()):
        t = chunk.strip()
        if t:
            tokens.append(t)
    for extra in related or []:
        for chunk in re.split(r"[,;\s]+", str(extra).upper()):
            t = chunk.strip()
            if t:
                tokens.append(t)

    seen: set[str] = set()
    result: List[str] = []
    for t in tokens:
        if not re.match(r"^[0-9]{2}[A-Z0-9]{8}$", t):
            continue
        if t not in seen:
            seen.add(t)
            result.append(t)
        if len(result) >= 2:
            break
    return result


def merge_academic_histories(
    parts: List[Dict[str, Any]],
    status_fn: Optional[Callable[[List[dict], List[dict], str], str]] = None,
) -> Dict[str, Any]:
    """
    Merge one or more fetch results. Single part → annotate same-HT career.
    Multiple parts (rare) → concatenate then annotate.
    """
    if not parts:
        raise ValueError("No academic histories to merge")

    if len(parts) == 1:
        merged = annotate_same_ht_career(parts[0])
        if status_fn:
            merged["student_status"] = status_fn(
                merged["semesters"], merged["subjects"], merged["regulation"]
            )
        return merged

    ordered = sorted(
        parts,
        key=lambda p: (_ht_year(str(p.get("htno") or "")), str(p.get("htno") or "")),
    )

    all_subjects: List[Dict[str, Any]] = []
    all_semesters: List[Dict[str, Any]] = []
    hall_tickets: List[str] = []
    names: List[str] = []

    for part in ordered:
        annotated = annotate_same_ht_career(part)
        ht = str(annotated.get("htno") or "").upper()
        if ht and ht not in hall_tickets:
            hall_tickets.append(ht)
        name = annotated.get("student_name")
        if name and str(name) not in names:
            names.append(str(name))
        all_subjects.extend(annotated.get("subjects") or [])
        all_semesters.extend(annotated.get("semesters") or [])

    latest = ordered[-1]
    combined = {
        "success": True,
        "htno": str(latest.get("htno") or (hall_tickets[-1] if hall_tickets else "")),
        "student_name": names[-1] if names else latest.get("student_name", "Unknown"),
        "subjects": all_subjects,
        "semesters": all_semesters,
        "official_cgpa": None,
        "regulation": latest.get("regulation"),
        "hall_tickets": hall_tickets,
    }
    for part in ordered:
        cgpa = part.get("official_cgpa")
        if cgpa is not None:
            try:
                val = float(cgpa)
                if val > 0:
                    combined["official_cgpa"] = val
            except (TypeError, ValueError):
                pass

    merged = annotate_same_ht_career(combined)
    if status_fn:
        merged["student_status"] = status_fn(
            merged["semesters"], merged["subjects"], merged["regulation"]
        )
    else:
        merged["student_status"] = (
            "graduated" if merged.get("completed_semesters", 0) >= 8 else "studying"
        )
    merged["total_semesters"] = 8
    return merged
