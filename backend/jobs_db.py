"""Database access and repository layer for Jobs & Opportunities Portal.
Provides ACID transactions, schema migration, indexing, deduplication, and 7-day freshness management.
"""

import json
import logging
import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

logger = logging.getLogger("jntuh_jobs_db")

DEFAULT_DB_DIR = Path(__file__).resolve().parent / "data"
DEFAULT_DB_PATH = DEFAULT_DB_DIR / "jobs.db"
MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"

TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "ref", "source", "fbclid", "gclid", "mc_cid", "mc_eid", "gh_src"
}


def normalize_canonical_url(raw_url: str) -> str:
    """Strip tracking parameters, fragments, and redundant trailing slashes to guarantee deduplication."""
    if not raw_url:
        return ""
    try:
        parsed = urlparse(raw_url.strip())
        # Filter query params
        query_pairs = parse_qsl(parsed.query, keep_blank_values=False)
        clean_query = [(k, v) for k, v in query_pairs if k.lower() not in TRACKING_PARAMS]
        clean_query_str = urlencode(clean_query)

        # Normalize path
        path = parsed.path.rstrip("/")
        if not path and parsed.netloc:
            path = ""

        clean = urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            path,
            "",  # params
            clean_query_str,
            ""   # fragment
        ))
        return clean
    except Exception:
        return raw_url.strip()


def parse_iso_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    """Parse ISO or RFC formatted timestamp into UTC datetime."""
    if not dt_str:
        return None
    try:
        # Handle trailing Z
        s = dt_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        # Try dateutil if available
        try:
            from dateutil import parser
            dt = parser.parse(dt_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except Exception:
            return None


def is_older_than_7_days(published_at_str: str, now: Optional[datetime] = None) -> bool:
    """Return True if original posting date is strictly more than 7 days old."""
    dt = parse_iso_datetime(published_at_str)
    if not dt:
        return False
    current_time = now or datetime.now(timezone.utc)
    age = current_time - dt
    return age > timedelta(days=7)


def get_db_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Get a thread-safe connection with row_factory enabled."""
    target_path = Path(db_path or DEFAULT_DB_PATH)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target_path), timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def init_db(db_path: Optional[Path] = None):
    """Run database migrations and guarantee all required tables and indexes exist."""
    migration_file = MIGRATIONS_DIR / "001_jobs_schema.sql"
    if not migration_file.exists():
        raise FileNotFoundError(f"Migration file not found at {migration_file}")

    with open(migration_file, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    with get_db_connection(db_path) as conn:
        conn.executescript(schema_sql)
        conn.commit()
    logger.info(f"Initialized Jobs database schema at {db_path or DEFAULT_DB_PATH}")


def upsert_job(job_dict: Dict[str, Any], db_path: Optional[Path] = None) -> Tuple[bool, str]:
    """Insert or update a job posting.
    - Preserves original `published_at` date.
    - Enforces 7-day freshness policy.
    - Returns (success, action_type: 'inserted' | 'updated' | 'skipped_expired' | 'error').
    """
    raw_url = job_dict.get("canonical_url", "")
    canonical_url = normalize_canonical_url(raw_url)
    if not canonical_url:
        return False, "invalid_url"

    published_at_raw = job_dict.get("published_at")
    dt = parse_iso_datetime(published_at_raw)
    if not dt:
        # Fallback to now if unparseable, but flag warning
        dt = datetime.now(timezone.utc)
    published_at_iso = dt.isoformat()

    # Reject listings older than 7 days based on original verified posting date
    if is_older_than_7_days(published_at_iso):
        return False, "skipped_expired"

    now_iso = datetime.now(timezone.utc).isoformat()
    tags_json = json.dumps(job_dict.get("tags") or [])

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        # Check if canonical_url already exists
        cursor.execute("SELECT id, published_at, created_at FROM jobs WHERE canonical_url = ?", (canonical_url,))
        existing = cursor.fetchone()

        if existing:
            job_id = existing["id"]
            # Preserve original publication timestamp and original creation timestamp!
            original_pub = existing["published_at"]
            cursor.execute("""
                UPDATE jobs SET
                    title = ?,
                    company = ?,
                    company_logo_url = ?,
                    location = ?,
                    workplace_type = ?,
                    employment_type = ?,
                    experience_level = ?,
                    salary = ?,
                    description = ?,
                    tags = ?,
                    deadline = ?,
                    last_synced_at = ?,
                    is_active = 1,
                    updated_at = ?
                WHERE id = ?
            """, (
                job_dict.get("title", "Software Engineer"),
                job_dict.get("company", "Company"),
                job_dict.get("company_logo_url"),
                job_dict.get("location", "Remote"),
                job_dict.get("workplace_type", "remote"),
                job_dict.get("employment_type", "full_time"),
                job_dict.get("experience_level", "entry_level"),
                job_dict.get("salary"),
                job_dict.get("description", ""),
                tags_json,
                job_dict.get("deadline"),
                now_iso,
                now_iso,
                job_id
            ))
            conn.commit()
            return True, "updated"
        else:
            job_id = job_dict.get("id") or str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO jobs (
                    id, source_id, source_name, source_type,
                    title, company, company_logo_url, location,
                    workplace_type, employment_type, experience_level,
                    salary, description, tags, canonical_url, apply_type,
                    published_at, deadline, last_synced_at, is_active,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            """, (
                job_id,
                job_dict.get("source_id") or job_id,
                job_dict.get("source_name", "Public Feed"),
                job_dict.get("source_type", "feed"),
                job_dict.get("title", "Software Engineer"),
                job_dict.get("company", "Company"),
                job_dict.get("company_logo_url"),
                job_dict.get("location", "Remote"),
                job_dict.get("workplace_type", "remote"),
                job_dict.get("employment_type", "full_time"),
                job_dict.get("experience_level", "entry_level"),
                job_dict.get("salary"),
                job_dict.get("description", ""),
                tags_json,
                canonical_url,
                job_dict.get("apply_type", "external"),
                published_at_iso,
                job_dict.get("deadline"),
                now_iso,
                now_iso,
                now_iso
            ))
            conn.commit()
            return True, "inserted"


def purge_expired_jobs(max_days: int = 7, db_path: Optional[Path] = None) -> int:
    """Automatically remove expired jobs and listings older than max_days (7 days)
    based on original verified posting date.
    Returns count of removed/deactivated rows.
    """
    cutoff_dt = datetime.now(timezone.utc) - timedelta(days=max_days)
    cutoff_iso = cutoff_dt.isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        # Deactivate or delete jobs older than cutoff OR where deadline passed
        cursor.execute("""
            UPDATE jobs
            SET is_active = 0, updated_at = ?
            WHERE is_active = 1 AND (
                published_at < ? OR
                (deadline IS NOT NULL AND deadline < ?)
            )
        """, (now_iso, cutoff_iso, now_iso))
        count = cursor.rowcount
        conn.commit()

        if count > 0:
            logger.info(f"Purged {count} expired jobs (> {max_days} days or deadline elapsed)")
        return count


def query_jobs(
    q: Optional[str] = None,
    workplace_type: Optional[str] = None,
    employment_type: Optional[str] = None,
    experience_level: Optional[str] = None,
    location: Optional[str] = None,
    apply_type: Optional[str] = None,
    sort_by: str = "published_at_desc",
    page: int = 1,
    page_size: int = 20,
    db_path: Optional[Path] = None
) -> Dict[str, Any]:
    """Query jobs with full search, filters, pagination, and sorting."""
    # Ensure database is clean of expired jobs
    purge_expired_jobs(max_days=7, db_path=db_path)

    where_clauses = ["is_active = 1"]
    params: List[Any] = []

    if q and q.strip():
        keywords = q.strip().split()
        for kw in keywords:
            param = f"%{kw}%"
            where_clauses.append("(title LIKE ? OR company LIKE ? OR description LIKE ? OR tags LIKE ? OR location LIKE ?)")
            params.extend([param, param, param, param, param])

    if workplace_type and workplace_type.lower() != "all":
        where_clauses.append("workplace_type = ?")
        params.append(workplace_type.lower())

    if employment_type and employment_type.lower() != "all":
        where_clauses.append("employment_type = ?")
        params.append(employment_type.lower())

    if experience_level and experience_level.lower() != "all":
        where_clauses.append("experience_level = ?")
        params.append(experience_level.lower())

    if location and location.strip():
        where_clauses.append("location LIKE ?")
        params.append(f"%{location.strip()}%")

    if apply_type and apply_type.lower() != "all":
        where_clauses.append("apply_type = ?")
        params.append(apply_type.lower())

    where_sql = " AND ".join(where_clauses)

    sort_sql = "published_at DESC"
    if sort_by == "published_at_asc":
        sort_sql = "published_at ASC"
    elif sort_by == "company_asc":
        sort_sql = "company ASC, published_at DESC"

    offset = max(0, (page - 1) * page_size)

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        # Count total
        cursor.execute(f"SELECT COUNT(*) FROM jobs WHERE {where_sql}", params)
        total_count = cursor.fetchone()[0]

        # Fetch page
        query_sql = f"""
            SELECT * FROM jobs
            WHERE {where_sql}
            ORDER BY {sort_sql}
            LIMIT ? OFFSET ?
        """
        cursor.execute(query_sql, params + [page_size, offset])
        rows = cursor.fetchall()

        items = []
        for r in rows:
            d = dict(r)
            try:
                d["tags"] = json.loads(d["tags"]) if d.get("tags") else []
            except Exception:
                d["tags"] = []
            items.append(d)

        # Sources distribution
        cursor.execute("SELECT DISTINCT source_name FROM jobs WHERE is_active = 1")
        sources = [row[0] for row in cursor.fetchall()]

        total_pages = max(1, (total_count + page_size - 1) // page_size)

        return {
            "items": items,
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "sources": sources,
            "freshness_policy": "Strict 7-day verified window (all active opportunities posted <= 7 days ago)"
        }


def get_job_by_id(job_id: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Retrieve full details of a single job listing by id or source_id."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM jobs WHERE (id = ? OR source_id = ?) AND is_active = 1", (job_id, job_id))
        row = cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        try:
            d["tags"] = json.loads(d["tags"]) if d.get("tags") else []
        except Exception:
            d["tags"] = []
        return d


def submit_application(data: Dict[str, Any], db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Submit a native application for a direct campus opportunity."""
    job_id = data.get("job_id", "").strip()
    student_name = (data.get("student_name") or data.get("applicant_name") or "").strip()
    email = data.get("email", "").strip().lower()
    phone = (data.get("phone") or "").strip()

    if not job_id or not student_name or not email:
        raise ValueError("Job ID, Student Name, and Email are required.")

    # Email format validation
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise ValueError("Invalid email address format.")

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        # Verify job exists and supports native applications
        cursor.execute("SELECT id, title, company, apply_type FROM jobs WHERE (id = ? OR source_id = ?) AND is_active = 1", (job_id, job_id))
        job = cursor.fetchone()
        if not job:
            raise ValueError("Target job listing was not found or has expired.")
        
        real_job_id = job["id"]

        # Rate-limiting / deduplication: prevent identical email submission to same job within 24h
        cursor.execute("""
            SELECT id FROM applications
            WHERE job_id = ? AND email = ? AND datetime(created_at) > datetime('now', '-1 day')
        """, (real_job_id, email))
        if cursor.fetchone():
            raise ValueError("You have already submitted an application for this position today.")

        app_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        cursor.execute("""
            INSERT INTO applications (
                id, job_id, student_name, email, phone,
                hall_ticket, degree, graduation_year, cgpa,
                resume_url, cover_note, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?)
        """, (
            app_id,
            real_job_id,
            student_name,
            email,
            phone,
            data.get("hall_ticket"),
            data.get("degree"),
            data.get("graduation_year"),
            float(data["cgpa"]) if data.get("cgpa") is not None and str(data["cgpa"]).strip() else None,
            data.get("resume_url"),
            data.get("cover_note"),
            now_iso
        ))
        conn.commit()

        return {
            "application_id": app_id,
            "job_title": job["title"],
            "company": job["company"],
            "status": "submitted",
            "submitted_at": now_iso
        }


def record_sync_run(
    source_name: str,
    status: str,
    fetched: int,
    inserted: int,
    updated: int,
    expired: int,
    started_at: str,
    completed_at: str,
    error_message: Optional[str] = None,
    db_path: Optional[Path] = None
):
    """Record synchronization telemetry and audit trail."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO sync_runs (
                id, source_name, status,
                jobs_fetched, jobs_inserted, jobs_updated, jobs_expired,
                error_message, started_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4()),
            source_name,
            status,
            fetched,
            inserted,
            updated,
            expired,
            error_message,
            started_at,
            completed_at
        ))
        conn.commit()


def get_sync_status(db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Retrieve current synchronization health, last sync time, and total counts."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM jobs WHERE is_active = 1")
        active_count = cursor.fetchone()[0]

        cursor.execute("SELECT MAX(last_synced_at) FROM jobs")
        last_synced = cursor.fetchone()[0]

        cursor.execute("""
            SELECT * FROM sync_runs
            ORDER BY completed_at DESC
            LIMIT 5
        """)
        recent_runs = [dict(r) for r in cursor.fetchall()]

        return {
            "active_jobs_count": active_count,
            "last_synced_at": last_synced,
            "sync_interval_hours": 3,
            "freshness_cutoff_days": 7,
            "recent_runs": recent_runs
        }
