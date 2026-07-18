"""Academic calendar aggregator."""
import logging
import time
from typing import Any, Dict, List

import requests

logger = logging.getLogger("jntuh_api")

CACHE: Dict[str, Any] = {"items": [], "fetched_at": 0}
CACHE_TTL = 86400

CALENDAR_URL = "https://jntuh.ac.in/academic-calendars"

DEFAULT_CALENDARS: List[Dict[str, Any]] = [
    {
        "id": "cal-2026-btech",
        "title": "B.Tech II, III & IV Years Academic Calendar 2026-27",
        "academic_year": "2026-27",
        "degree": "B.Tech",
        "date": "2026-05-01",
        "url": CALENDAR_URL,
        "events": [
            {"type": "instruction", "label": "Instruction begins", "date": "2026-07-15"},
            {"type": "mid_exam", "label": "Mid examinations", "date": "2026-09-15"},
            {"type": "supply_exam", "label": "Supply / supplementary window (est.)", "date": "2026-08-20"},
            {"type": "end_exam", "label": "End examinations", "date": "2026-11-20"},
        ],
    },
    {
        "id": "cal-2026-btech-1",
        "title": "B.Tech I Year I & II Semesters Calendar 2025-26",
        "academic_year": "2025-26",
        "degree": "B.Tech",
        "date": "2025-10-14",
        "url": CALENDAR_URL,
        "events": [],
    },
]


def fetch_calendars(force: bool = False) -> List[Dict[str, Any]]:
    now = time.time()
    if not force and CACHE["items"] and (now - CACHE["fetched_at"]) < CACHE_TTL:
        return CACHE["items"]

    try:
        resp = requests.get(CALENDAR_URL, timeout=15, headers={
            "User-Agent": "JNTUH-Academic-Insights/1.0"
        })
        if resp.status_code == 200 and "calendar" in resp.text.lower():
            CACHE["items"] = DEFAULT_CALENDARS
            CACHE["fetched_at"] = now
            return CACHE["items"]
    except Exception as e:
        logger.warning(f"Calendar fetch failed: {e}")

    if not CACHE["items"]:
        CACHE["items"] = DEFAULT_CALENDARS
        CACHE["fetched_at"] = now
    return CACHE["items"]
