"""
Dynamic non-credit detection from fetched marks (no name/code hardcoding).

Mirrors src/utils/nonCreditSubjects.ts — keep logic in sync.
"""
from __future__ import annotations

from typing import Any, Optional


def _as_num(v: Any) -> Optional[float]:
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        try:
            return float(v.strip())
        except ValueError:
            return None
    return None


def _is_zero_or_missing(v: Optional[float]) -> bool:
    return v is None or v == 0


def is_inverted_single_mark(
    internal: Optional[float],
    external: Optional[float],
    total: Optional[float],
) -> bool:
    if internal is None or internal <= 0:
        return False
    if not _is_zero_or_missing(external):
        return False
    if total is not None and total != internal:
        return False
    return True


def is_correct_audit_mark(
    internal: Optional[float],
    external: Optional[float],
    total: Optional[float],
) -> bool:
    if external is None or external <= 0:
        return False
    if not _is_zero_or_missing(internal):
        return False
    if total is not None and total != external:
        return False
    return True


def normalize_non_credit_subject(
    internal: Any = None,
    external: Any = None,
    total: Any = None,
    credits: Any = None,
) -> dict:
    """
    Normalize marks + flag non-credit for a fetched subject row.
    Never forces credits=0 when API/PDF already reported credits > 0.
    """
    internal_n = _as_num(internal)
    external_n = _as_num(external)
    total_n = _as_num(total)
    raw_credits = _as_num(credits)
    credit_val = raw_credits if raw_credits is not None and raw_credits > 0 else 0.0

    def _pack(non_credit: bool, **marks: Any) -> dict:
        out: dict = {"credits": credit_val if credit_val > 0 else 0.0, "non_credit": non_credit}
        for key in ("internal", "external", "total"):
            if key in marks and marks[key] is not None:
                out[key] = marks[key]
        return out

    if credit_val > 0:
        return _pack(
            False,
            internal=internal_n,
            external=external_n,
            total=total_n,
        )

    if is_inverted_single_mark(internal_n, external_n, total_n):
        mark = internal_n
        return {
            "internal": 0.0,
            "external": mark,
            "total": total_n if total_n is not None else mark,
            "credits": 0.0,
            "non_credit": True,
        }

    if is_correct_audit_mark(internal_n, external_n, total_n):
        return {
            "internal": 0.0,
            "external": external_n,
            "total": total_n if total_n is not None else external_n,
            "credits": 0.0,
            "non_credit": True,
        }

    if (
        _is_zero_or_missing(internal_n)
        and _is_zero_or_missing(external_n)
        and total_n is not None
        and total_n > 0
    ):
        return {
            "internal": 0.0,
            "external": total_n,
            "total": total_n,
            "credits": 0.0,
            "non_credit": True,
        }

    return _pack(False, internal=internal_n, external=external_n, total=total_n)
