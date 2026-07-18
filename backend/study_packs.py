"""Syllabus gap map + PYQ pack lookups for backlog study plans."""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("jntuh_api")

BASE = Path(__file__).parent
_UNITS: Dict[str, Any] = {}
_PYQ: Dict[str, Any] = {}


def _load() -> None:
    global _UNITS, _PYQ
    try:
        with open(BASE / "syllabus_units.json", encoding="utf-8") as f:
            _UNITS = json.load(f)
    except Exception as e:
        logger.warning(f"syllabus_units.json load failed: {e}")
        _UNITS = {"units": {}, "default": {}}
    try:
        with open(BASE / "pyq_index.json", encoding="utf-8") as f:
            _PYQ = json.load(f)
    except Exception as e:
        logger.warning(f"pyq_index.json load failed: {e}")
        _PYQ = {"packs": []}


_load()


def _norm(s: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "", (s or "").upper())


def get_syllabus_gap(subject_name: str = "", subject_code: str = "") -> Dict[str, Any]:
    units_map: Dict[str, Any] = _UNITS.get("units") or {}
    needle_name = _norm(subject_name)
    needle_code = _norm(subject_code)

    for key, payload in units_map.items():
        aliases = [_norm(key)] + [_norm(a) for a in (payload.get("aliases") or [])]
        if needle_code and needle_code in aliases:
            return {"matched": key, **payload}
        if needle_name and any(a and (a in needle_name or needle_name in a) for a in aliases):
            return {"matched": key, **payload}

    default = _UNITS.get("default") or {}
    return {
        "matched": None,
        "focus_units": default.get("focus_units") or [],
        "study_tip": default.get("study_tip")
        or "Revise Unit 1–2 thoroughly and solve recent PYQs.",
    }


def get_pyq_pack(subject_name: str = "", subject_code: str = "", regulation: str = "") -> Optional[Dict[str, Any]]:
    needle_name = _norm(subject_name)
    needle_code = _norm(subject_code)
    reg = (regulation or "").upper()

    for pack in _PYQ.get("packs") or []:
        keys = [_norm(k) for k in (pack.get("subject_keys") or [])]
        hit = False
        if needle_code and needle_code in keys:
            hit = True
        elif needle_name and any(k and (k in needle_name or needle_name in k) for k in keys):
            hit = True
        if not hit:
            continue
        regs = pack.get("regulation") or []
        if regs and reg and reg not in regs:
            # Still return — packs are broadly useful across nearby regs
            pass
        return pack
    return None


def list_pyq_packs() -> List[Dict[str, Any]]:
    return list(_PYQ.get("packs") or [])
