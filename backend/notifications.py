"""JNTUH notifications aggregator — source: jntufastupdates.com (Hyderabad)."""
import hashlib
import html as html_lib
import logging
import re
import time
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger("jntuh_api")

CACHE: Dict[str, Any] = {"items": [], "fetched_at": 0}
CACHE_TTL = 1800  # 30 minutes

# Primary feed (unofficial aggregator — always verify critical dates on jntuh.ac.in)
FASTUPDATES_URL = "https://www.jntufastupdates.com/jntu-hyderabad/"
SOURCE_NAME = "JNTU Fast Updates"
FETCH_TIMEOUT = 8

FALLBACK_NOTIFICATIONS: List[Dict[str, Any]] = [
    {
        "id": "fallback-jntuh-hub",
        "title": "JNTUH Hyderabad — Latest updates on jntufastupdates.com",
        "date": "",
        "category": "general",
        "degree": ["B.Tech"],
        "regulation": ["R18", "R22", "R24"],
        "url": FASTUPDATES_URL,
        "exam_year": "2026",
        "source": SOURCE_NAME,
    },
    {
        "id": "fallback-jntuh-official",
        "title": "Official JNTUH notifications and exam circulars",
        "date": "",
        "category": "exams",
        "degree": ["B.Tech", "B.Pharm"],
        "regulation": ["R18", "R22"],
        "url": "https://jntuh.ac.in",
        "exam_year": "2026",
        "source": "JNTUH Official",
    },
]


def _html_unescape(text: str) -> str:
    return html_lib.unescape(re.sub(r"\s+", " ", text)).strip()


def _infer_regulations(title: str) -> List[str]:
    found = re.findall(r"R\d{2}", title.upper())
    return sorted(set(found)) or ["R18", "R22", "R24"]


def _categorize(title: str) -> str:
    t = title.lower()
    if "result" in t or "rc/rv" in t or "revaluation" in t:
        return "results"
    if "time table" in t or "timetable" in t:
        return "timetable"
    if "calendar" in t:
        return "calendar"
    if "notification" in t or "exam" in t or "supply" in t or "supplement" in t:
        return "exams"
    return "general"


def _infer_degrees(title: str) -> List[str]:
    t = title.upper().replace(".", "")
    mapping = [
        ("BTECH", "B.Tech"),
        ("BPHARM", "B.Pharm"),
        ("B PHARM", "B.Pharm"),
        ("MTECH", "M.Tech"),
        ("MPHARM", "M.Pharm"),
        ("MBA", "MBA"),
        ("MCA", "MCA"),
    ]
    degrees = [label for key, label in mapping if key in t]
    return degrees or ["B.Tech"]


def _infer_year(date_str: str, title: str) -> str:
    m = re.search(r"20\d{2}", date_str) or re.search(r"20\d{2}", title)
    return m.group(0) if m else "2026"


def _parse_fastupdates_html(page_html: str) -> List[Dict[str, Any]]:
    """
    Parse latest posts from jntufastupdates JNTUH hub page.
    Matches patterns like: entry-date … DD-MM-YYYY … href=… > title
    """
    items: List[Dict[str, Any]] = []
    seen: set[str] = set()

    # Date + link + title (WordPress entry cards)
    pattern = re.compile(
        r"entry-date[^>]*>.*?(\d{2}-\d{2}-\d{4}).*?href=[\"']([^\"']+)[\"'][^>]*>([^<]+)<",
        re.IGNORECASE | re.DOTALL,
    )
    for match in pattern.finditer(page_html):
        date_str, link, title = match.groups()
        title = _html_unescape(title)
        link = link.strip()
        if len(title) < 12:
            continue
        if "jntufastupdates.com" not in link:
            continue
        # Prefer JNTUH-related posts only
        if "jntuh" not in title.lower() and "jntu" not in title.lower():
            continue
        if title in seen:
            continue
        seen.add(title)

        item_id = hashlib.md5(f"{date_str}|{title}".encode()).hexdigest()[:12]
        items.append({
            "id": item_id,
            "title": title,
            "date": date_str,
            "category": _categorize(title),
            "degree": _infer_degrees(title),
            "regulation": _infer_regulations(title),
            "url": link,
            "exam_year": _infer_year(date_str, title),
            "source": SOURCE_NAME,
        })

    # Fallback: heading links if date pattern failed
    if not items:
        for match in re.finditer(
            r"<a[^>]+href=[\"']([^\"']+)[\"'][^>]*>([^<]{12,})</a>",
            page_html,
            re.IGNORECASE,
        ):
            link, title = match.groups()
            title = _html_unescape(title)
            if "jntuh" not in title.lower() and "jntu hyderabad" not in title.lower():
                continue
            if title in seen:
                continue
            seen.add(title)
            item_id = hashlib.md5(title.encode()).hexdigest()[:12]
            items.append({
                "id": item_id,
                "title": title,
                "date": "",
                "category": _categorize(title),
                "degree": _infer_degrees(title),
                "regulation": _infer_regulations(title),
                "url": link,
                "exam_year": _infer_year("", title),
                "source": SOURCE_NAME,
            })

    return items[:50]


def fetch_notifications(force: bool = False) -> List[Dict[str, Any]]:
    now = time.time()
    if not force and CACHE["items"] and (now - CACHE["fetched_at"]) < CACHE_TTL:
        return CACHE["items"]

    try:
        resp = requests.get(
            FASTUPDATES_URL,
            timeout=FETCH_TIMEOUT,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; JNTUH-Academic-Insights/1.0)",
                "Accept": "text/html,application/xhtml+xml",
            },
        )
        if resp.status_code == 200:
            parsed = _parse_fastupdates_html(resp.text)
            if parsed:
                CACHE["items"] = parsed
                CACHE["fetched_at"] = now
                logger.info(f"Loaded {len(parsed)} notifications from {SOURCE_NAME}")
                return parsed
            logger.warning("FastUpdates page parsed 0 items")
    except Exception as e:
        logger.warning(f"Notifications fetch failed: {e}")

    # Keep stale cache if available
    if CACHE["items"]:
        return CACHE["items"]

    CACHE["items"] = list(FALLBACK_NOTIFICATIONS)
    CACHE["fetched_at"] = now
    return CACHE["items"]


def filter_notifications(
    items: List[Dict[str, Any]],
    exam_year: Optional[str] = None,
    degree: Optional[str] = None,
    regulation: Optional[str] = None,
    category: Optional[str] = None,
    query: Optional[str] = None,
) -> List[Dict[str, Any]]:
    result = items
    if exam_year:
        result = [i for i in result if i.get("exam_year") == exam_year]
    if degree:
        result = [i for i in result if degree in i.get("degree", [])]
    if regulation:
        result = [i for i in result if regulation in i.get("regulation", [])]
    if category:
        result = [i for i in result if i.get("category") == category]
    if query:
        q = query.lower()
        result = [i for i in result if q in i.get("title", "").lower()]
    return result
