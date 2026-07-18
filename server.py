import asyncio
import io
import json
import logging
import os
import re
import requests
import shutil
import time
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List, Optional, Dict, Any
from urllib.parse import quote

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from backend.data_processor import AcademicProcessor
from backend.analyzer import AcademicAnalyzer
from backend.shared import (
    GRADE_POINTS_BY_REGULATION,
    VALID_GRADES_BY_REGULATION,
    detect_regulation,
    get_grade_points,
)
from backend.share_tokens import create_share_token, verify_share_token
from backend.notifications import fetch_notifications, filter_notifications
from backend.calendars import fetch_calendars
from backend.grace_marks import check_grace_eligibility
from backend.study_packs import get_syllabus_gap, get_pyq_pack, list_pyq_packs
from backend.non_credit import normalize_non_credit_subject
from backend.security import (
    check_rate_limit,
    get_cors_origins,
    validate_production_config,
    is_production,
    mask_hall_ticket,
    FETCH_LIMIT,
    PDF_LIMIT,
    SHARE_LIMIT,
)

# Removed Playwright Imports

# ==========================================
# CONFIGURATION & LOGGING
# ==========================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("jntuh_api")

BASE_DIR = Path(__file__).parent
DIST_PATH = BASE_DIR / "dist"
SYLLABUS_PATH = BASE_DIR / "backend" / "syllabus.json"

# Notes Directories
NOTES_BASE_PATH = BASE_DIR
R18_NOTES_PATH = NOTES_BASE_PATH / "JNTUH NOTES"
R22_NOTES_PATH = NOTES_BASE_PATH / "JNTUH-CSE-BTech-Notes-R22-main" / "JNTUH-CSE-BTech-Notes-R22-main"
import tempfile
UPLOAD_DIR = Path(tempfile.gettempdir()) / "jntuh_pending_notes"

# Globals
SYLLABUS_DATA: Dict[str, Any] = {}
THREAD_POOL: Optional[ThreadPoolExecutor] = None
KEEP_ALIVE_TASK: Optional[asyncio.Task] = None

# Toggle: set ENABLE_KEEP_ALIVE=true in Render env vars to activate keep-alive.
# Currently disabled to conserve free-tier instance hours (June 2026).
ENABLE_KEEP_ALIVE = os.environ.get("ENABLE_KEEP_ALIVE", "false").lower() == "true"


# ==========================================
# KEEP-ALIVE SELF-PING (prevents Render free-tier from sleeping)
# Controlled by ENABLE_KEEP_ALIVE env var — set to "true" to activate.
# ==========================================
KEEP_ALIVE_INTERVAL = 10 * 60  # 10 minutes in seconds

async def keep_alive_ping():
    """Periodically ping our own health endpoint to prevent Render from spinning down.
    Render free-tier spins down after 15 min of inactivity. We ping every 10 min.
    Must use the EXTERNAL URL — pinging localhost does NOT reset the inactivity timer."""
    base_url = os.environ.get("RENDER_EXTERNAL_URL", "")
    if not base_url:
        logger.info("RENDER_EXTERNAL_URL not set — keep-alive disabled (local dev mode).")
        return

    health_url = f"{base_url}/api/health"
    logger.info(f"Keep-alive self-ping started. Pinging {health_url} every {KEEP_ALIVE_INTERVAL // 60} minutes.")

    while True:
        await asyncio.sleep(KEEP_ALIVE_INTERVAL)
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: requests.get(health_url, timeout=10))
            if response.status_code == 200:
                logger.debug(f"Keep-alive ping OK ({response.status_code})")
            else:
                logger.warning(f"Keep-alive ping returned {response.status_code}")
        except Exception as e:
            logger.warning(f"Keep-alive ping failed: {e}")


# ==========================================
# LIFESPAN & APP INIT
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern FastAPI lifecycle manager for startup/shutdown events."""
    global SYLLABUS_DATA, THREAD_POOL, KEEP_ALIVE_TASK
    
    # Load Syllabus
    if SYLLABUS_PATH.exists():
        try:
            with open(SYLLABUS_PATH, "r", encoding="utf-8") as f:
                SYLLABUS_DATA = json.load(f)
            logger.info("Successfully loaded syllabus.json")
        except Exception as e:
            logger.error(f"Could not load syllabus.json: {e}")
    else:
        logger.warning(f"Syllabus file not found at {SYLLABUS_PATH}")

    # Initialize concurrency limits globally
    THREAD_POOL = ThreadPoolExecutor(max_workers=3)

    # Warm external feeds in background threads (non-blocking for startup)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(THREAD_POOL, fetch_notifications)
    await loop.run_in_executor(THREAD_POOL, fetch_calendars)
    
    # Ensure upload dir exists
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Start keep-alive self-ping only if enabled via env var
    if ENABLE_KEEP_ALIVE:
        KEEP_ALIVE_TASK = asyncio.create_task(keep_alive_ping())
        logger.info("Keep-alive self-ping ENABLED.")
    else:
        logger.info("Keep-alive self-ping DISABLED (set ENABLE_KEEP_ALIVE=true to activate).")

    # Production security: fail fast if secrets are missing
    validate_production_config()
    logger.info("Application startup complete. Lifespan triggered successfully.")
    
    yield  # App runs here

    # Cleanup
    if KEEP_ALIVE_TASK:
        KEEP_ALIVE_TASK.cancel()
    if THREAD_POOL:
        THREAD_POOL.shutdown(wait=False)
    logger.info("Application shutdown complete.")

app = FastAPI(
    title="JNTUH Academic Insights API",
    lifespan=lifespan,
    docs_url=None if is_production() else "/docs",
    redoc_url=None if is_production() else "/redoc",
    openapi_url=None if is_production() else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# ==========================================
# SECURITY HEADERS & HELPERS
# ==========================================
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    try:
        if path.startswith("/fetch/"):
            check_rate_limit(request, FETCH_LIMIT)
        elif path.startswith("/analyze/"):
            check_rate_limit(request, PDF_LIMIT)
        elif path.startswith("/api/share") and request.method == "POST":
            check_rate_limit(request, SHARE_LIMIT)
        elif path.startswith("/api/grace-marks"):
            check_rate_limit(request, 30)
    except HTTPException as exc:
        # BaseHTTPMiddleware cannot safely re-raise HTTPException — return response
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return await call_next(request)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path.startswith(("/api/", "/fetch/", "/analyze/", "/predict/", "/notes/")):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cloud.umami.is; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: blob:; "
        "connect-src 'self' https://*.supabase.co https://jntuhresults.dhethi.com https://cloud.umami.is https://*.umami.is; "
        "frame-ancestors 'none';"
    )
    if is_production():
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

def check_pdf_file(file: UploadFile):
    # 1. Validate File Extension
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents are allowed.")
    
    # 2. Validate MIME Type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Must be application/pdf.")
        
    # 3. Validate File Size (Max 15MB)
    try:
        file.file.seek(0, os.SEEK_END)
        size = file.file.tell()
        file.file.seek(0, os.SEEK_SET)
        if size > 15 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size exceeds the 15MB limit.")
        if size < 4:
            raise HTTPException(status_code=400, detail="File is too small to be a valid PDF.")
    except HTTPException:
        raise
    except Exception:
        pass

    # 4. Validate PDF Magic Bytes (%PDF-)
    try:
        header = file.file.read(5)
        file.file.seek(0, os.SEEK_SET)
        if header[:4] != b'%PDF':
            raise HTTPException(status_code=400, detail="File does not appear to be a valid PDF (bad header).")
    except HTTPException:
        raise
    except Exception:
        pass

if DIST_PATH.exists():
    _assets_dir = DIST_PATH / "assets"
    if _assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="frontend_assets")


@app.get("/assets/{asset_path:path}", include_in_schema=False)
async def serve_frontend_asset(asset_path: str):
    """Fallback asset route — works even if StaticFiles mount was skipped at import."""
    target = DIST_PATH / "assets" / asset_path
    if target.is_file():
        return FileResponse(target)
    raise HTTPException(status_code=404, detail="Asset not found")


@app.get("/sw.js", include_in_schema=False)
async def serve_sw():
    sw = BASE_DIR / "public" / "sw.js"
    if sw.is_file():
        return FileResponse(sw, media_type="application/javascript")
    raise HTTPException(status_code=404)


@app.get("/vite.svg", include_in_schema=False)
async def serve_vite_icon():
    icon = BASE_DIR / "public" / "vite.svg"
    if icon.is_file():
        return FileResponse(icon, media_type="image/svg+xml")
    raise HTTPException(status_code=404)


@app.get("/manifest.webmanifest", include_in_schema=False)
async def serve_manifest():
    manifest = BASE_DIR / "public" / "manifest.webmanifest"
    if manifest.is_file():
        return FileResponse(manifest, media_type="application/manifest+json")
    raise HTTPException(status_code=404)


# ==========================================
# HEALTH ENDPOINT (used by keep-alive ping)
# ==========================================
@app.get("/api/health")
async def health_check():
    """Health check endpoint — pinged by the keep-alive task to prevent Render spin-down."""
    return {
        "status": "ok",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "frontend_built": (DIST_PATH / "index.html").exists(),
    }

# ==========================================
# PYDANTIC MODELS
# ==========================================
class Subject(BaseModel):
    subject_code: str
    subject_name: str
    grade: str
    credits: float
    grade_points: int
    year: int
    sem: int
    htno: Optional[str] = None

class HallTicketRequest(BaseModel):
    htno: str = Field(..., min_length=10, max_length=10, description="10-character Hall Ticket Number")

class SemesterSGPARecord(BaseModel):
    year: int = Field(..., ge=1, le=4)
    sem: int = Field(..., ge=1, le=2)
    sgpa: float = Field(..., ge=0.0, le=10.0)

class SubjectInput(BaseModel):
    subject_code: str = Field(..., min_length=1, max_length=20)
    subject_name: str = Field(..., min_length=1, max_length=100)
    grade: str = Field(..., min_length=1, max_length=10)
    credits: float = Field(..., ge=0.0, le=20.0)
    grade_points: int = Field(..., ge=0, le=10)
    year: int = Field(..., ge=1, le=4)
    sem: int = Field(..., ge=1, le=2)
    htno: Optional[str] = None
    regulation: Optional[str] = None
    internal: Optional[int] = Field(None, ge=0, le=100)
    external: Optional[int] = Field(None, ge=0, le=100)
    total: Optional[int] = Field(None, ge=0, le=100)

class AdvancedAnalysisRequest(BaseModel):
    semesters: List[SemesterSGPARecord]
    subjects: List[SubjectInput]



def infer_credits(code: str, name: str, year: int, sem: int, regulation: str, grade: str = "") -> float:
    """Infer credits when API returns 0. Prefer syllabus; avoid inventing pass-theory credits."""
    name_lower = name.lower().strip() if name else ""
    code_upper = code.upper().strip() if code else ""
    code_lower = code.lower().strip() if code else ""
    is_old_regulation = regulation in ("R13", "R15", "R16")
    grade_norm = (grade or "").strip()
    is_fail = grade_norm in ("F", "Ab", "AB", "ABSENT")

    zero_credit_courses = [
        "environmental", "constitution", "ethics", "gender sensitization",
        "human values", "cyber security", "audit", "non-credit", "ncc", "nss", "sports"
    ]
    if any(kw in name_lower for kw in zero_credit_courses):
        return 0.0 if not is_old_regulation else 2.0

    if regulation in SYLLABUS_DATA and "subjects" in SYLLABUS_DATA[regulation]:
        if code_upper in SYLLABUS_DATA[regulation]["subjects"]:
            return float(SYLLABUS_DATA[regulation]["subjects"][code_upper]["credits"])

    # Labs / workshops — safe for both pass and fail zeros
    if (code_lower.endswith("l") and len(code_upper) >= 5) or "lab" in name_lower or "practical" in name_lower:
        return 2.0 if is_old_regulation else 1.5
    if any(kw in name_lower for kw in ["workshop", "skill", "induction"]):
        return 2.0 if is_old_regulation else 1.0
    if "mini project" in name_lower or "course project" in name_lower:
        return 3.0 if is_old_regulation else 2.0

    project_keywords = ["project work", "main project", "major project", "dissertation"]
    if year == 4 and sem == 2 and any(kw in name_lower for kw in project_keywords):
        return 10.0
    if year == 4 and sem == 2 and ("viva" in name_lower or "comprehensive" in name_lower):
        return 2.0

    # Failures still need a weight for backlog/lost accounting
    if is_fail:
        if any(kw in name_lower for kw in ["seminar", "colloq", "presentation"]):
            return 2.0
        if "project" in name_lower:
            return 2.0
        heavy_theory = ["mathematics", "calculus", "statistics", "probability", "physics", "chemistry", "mechanics"]
        if any(kw in name_lower for kw in heavy_theory):
            return 4.0
        return 3.0

    # Pass with 0 and no syllabus hit: leave 0 (do not invent 3.0 theory credits)
    return 0.0


def resolve_subject_credits(raw_credits: float, code: str, name: str, year: int, sem: int, regulation: str, grade: str) -> float:
    if raw_credits and raw_credits > 0:
        return float(raw_credits)
    return infer_credits(code, name, year, sem, regulation, grade)

def get_student_status_from_semesters(semesters: List[dict], subjects: List[dict], regulation: str = "R18") -> str:
    """
    Determine student status from semester data and subjects.
    Returns: 'graduated' | 'graduated_with_backlogs' | 'studying'
    """
    completed_count = len([s for s in semesters if s.get('sgpa', 0) > 0 or s.get('credits', 0) > 0])

    if completed_count >= 8:
        # Check for active backlogs: subjects with F/Ab that were never cleared
        subject_attempts: Dict[str, List[str]] = {}
        for subj in subjects:
            code = (subj.get('subject_code') or '').upper()
            if not code:
                code = (subj.get('subject_name') or '').upper()
            if code:
                subject_attempts.setdefault(code, []).append(subj.get('grade', ''))

        has_backlogs = False
        for code, grades_list in subject_attempts.items():
            has_pass = any(g not in ('F', 'Ab', '') for g in grades_list)
            if not has_pass:
                has_backlogs = True
                break

        return 'graduated_with_backlogs' if has_backlogs else 'graduated'

    return 'studying'

# ==========================================
# SCRAPING & PARSING SERVICES
# ==========================================
def fetch_api_and_parse(htno: str) -> dict:
    """Fetches JNTUH results directly from the reliable REST API and formats it."""
    url = f"https://jntuhresults.dhethi.com/api/getAcademicResult?rollNumber={htno}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://jntuhconnect.dhethi.com',
        'Referer': 'https://jntuhconnect.dhethi.com/',
        # Required by jntuhresults.dhethi.com (same key used by jntuhconnect frontend)
        'X-Api-Key': os.environ.get('JNTUH_RESULTS_API_KEY', 'kanipinchinda'),
    }
    
    # Poll the API since it queues requests
    max_attempts = 15
    api_data = None
    
    for attempt in range(max_attempts):
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            if resp.status_code == 200:
                api_data = resp.json()
                break
            elif resp.status_code == 202:
                logger.info(f"[API] HTNO {htno} queued... waiting (attempt {attempt+1}/{max_attempts})")
                time.sleep(3)
            else:
                logger.error(f"[API] Error {resp.status_code} for {htno}")
                raise HTTPException(status_code=502, detail="Failed to fetch data from remote server.")
        except requests.exceptions.RequestException as e:
            logger.error(f"[API] Request exception for {htno}: {e}")
            if attempt == max_attempts - 1:
                raise HTTPException(status_code=404, detail="Invalid Hall Ticket Number or No Results Found.")
            time.sleep(3)
            
    if not api_data or "results" not in api_data:
        raise HTTPException(status_code=404, detail="No results found or Invalid Hall Ticket Number.")
        
    # Transform api_data into the expected format
    detected_regulation = detect_regulation(htno)
    student_name = api_data.get("details", {}).get("name", "Unknown")
    
    subjects = []
    semesters = []
    
    raw_sems = api_data.get("results", {}).get("semesters", [])
    for sem_data in raw_sems:
        # semester string looks like "1-1", "4-2"
        sem_str = sem_data.get("semester", "")
        parts = sem_str.split("-")
        try:
            year, sem = int(parts[0]), int(parts[1])
        except (ValueError, IndexError):
            continue
            
        sem_subjects = sem_data.get("subjects", [])
        for subj in sem_subjects:
            grade = subj.get("grades", "").strip()
            gp = get_grade_points(grade, detected_regulation)
            code = subj.get("subjectCode", "").strip()
            name = subj.get("subjectName", "").strip()

            # Trust upstream API credits exactly (original logic). Do not invent pass credits.
            # F/Ab often arrive as 0 — backlog planner may infer client-side without mutating earned totals.
            try:
                credits = float(subj.get("credits", 0.0) or 0.0)
            except (TypeError, ValueError):
                credits = 0.0
            
            # Extract marks if available in API; normalize non-credit Int/Ext swap
            internal = subj.get("internalMarks")
            external = subj.get("externalMarks")
            total = subj.get("totalMarks")
            normalized = normalize_non_credit_subject(internal, external, total, credits)

            subject_row = {
                "subject_code": code,
                "subject_name": name,
                "grade": grade,
                "credits": normalized["credits"],
                "grade_points": gp,
                "year": year,
                "sem": sem,
                "htno": htno,
                "regulation": detected_regulation,
                "non_credit": bool(normalized.get("non_credit")),
            }
            if "internal" in normalized:
                subject_row["internal"] = normalized["internal"]
            if "external" in normalized:
                subject_row["external"] = normalized["external"]
            if "total" in normalized:
                subject_row["total"] = normalized["total"]
            subjects.append(subject_row)
            
        sgpa_val = float(sem_data.get("semesterSGPA", 0.0)) if str(sem_data.get("semesterSGPA")).replace('.', '', 1).isdigit() else 0.0

        try:
            sem_credits = float(sem_data.get("semesterCredits", 0.0) or 0.0)
        except (TypeError, ValueError):
            sem_credits = 0.0
        
        semesters.append({
            "year": year,
            "sem": sem,
            "sgpa": sgpa_val,
            "credits": sem_credits,
        })
        
    official_cgpa = None
    cgpa_val = api_data.get("results", {}).get("CGPA")
    if cgpa_val and str(cgpa_val).replace('.', '', 1).isdigit():
        official_cgpa = float(cgpa_val)
        
    student_status = get_student_status_from_semesters(semesters, subjects, detected_regulation)
    completed_semesters = len([s for s in semesters if s['sgpa'] > 0 or s['credits'] > 0])
    
    return {
        "success": True,
        "htno": htno,
        "student_name": student_name,
        "subjects": subjects,
        "semesters": semesters,
        "total_subjects": len(subjects),
        "official_cgpa": official_cgpa,
        "regulation": detected_regulation,
        "student_status": student_status,
        "completed_semesters": completed_semesters,
        "total_semesters": 8
    }

# ==========================================
# ENDPOINTS
# ==========================================
@app.get("/")
def read_root():
    """Serve the React app when built; otherwise explain how to run the UI."""
    index_file = DIST_PATH / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text(encoding="utf-8"), status_code=200)

    # No frontend build present — this is NOT a data leak, just API-only mode.
    return HTMLResponse(
        content="""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>JNTUH Academic Insights API</title>
<style>body{font-family:system-ui;max-width:40rem;margin:3rem auto;padding:0 1rem;line-height:1.5}
code{background:#f3f4f6;padding:.1rem .35rem;border-radius:4px}</style></head>
<body>
<h1>API is running</h1>
<p>You opened the <strong>backend only</strong>. The React UI is not being served from this port because <code>dist/</code> is missing.</p>
<p><strong>Local development (recommended):</strong></p>
<ol>
<li>Keep this API on port <code>8000</code></li>
<li>In another terminal run <code>npm run dev</code></li>
<li>Open <a href="http://localhost:5173">http://localhost:5173</a> — use that for all features</li>
</ol>
<p><strong>Or single-port mode:</strong> run <code>npm run build</code>, restart this server, then reload this page.</p>
<p>Health: <a href="/api/health"><code>/api/health</code></a> · Docs: <a href="/docs"><code>/docs</code></a></p>
<p style="color:#666;font-size:.9rem">This page does not contain student grades or hall-ticket data.</p>
</body></html>""",
        status_code=200,
    )


@app.post("/fetch/htno")
async def fetch_by_hall_ticket(request: HallTicketRequest):
    htno = request.htno.strip().upper().replace(" ", "")
    
    if not re.match(r"^[0-9]{2}[A-Z0-9]{8}$", htno):
        raise HTTPException(status_code=400, detail="Invalid Hall Ticket Number format. Must be 10 alphanumeric characters.")
        
    global THREAD_POOL
    if THREAD_POOL is None:
        logger.warning("THREAD_POOL was None. Initializing manually.")
        THREAD_POOL = ThreadPoolExecutor(max_workers=3)
    
    try:
        loop = asyncio.get_running_loop()
        try:
            result = await loop.run_in_executor(THREAD_POOL, fetch_api_and_parse, htno)
            logger.info(f"Successfully fetched {result['total_subjects']} subjects for {mask_hall_ticket(htno)} via REST API")
            return result
        except Exception as e:
            # Re-raise HTTP exceptions explicitly defined in fetch_api_and_parse
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"API failure for {mask_hall_ticket(htno)}: {e}")
            raise HTTPException(status_code=500, detail="Data provider failed. Please use PDF Upload.")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error processing {mask_hall_ticket(htno)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch results: {str(e)}")


@app.post("/analyze/pdf")
async def analyze_pdf(files: List[UploadFile] = File(...)):
    file_buffers: List[bytes] = []
    try:
        for file in files:
            check_pdf_file(file)
            file_buffers.append(await file.read())

        if not file_buffers:
            raise HTTPException(status_code=400, detail="No PDF files provided")

        def parse_pdfs_sync(buffers: List[bytes]) -> Dict[str, Any]:
            processor = AcademicProcessor()
            processed_count = 0
            for contents in buffers:
                if processor.parse_pdf(io.BytesIO(contents)):
                    processed_count += 1

            if processed_count == 0:
                raise ValueError("Could not parse provided PDFs")

            def clean_dict_list(d_list):
                return [{k: (None if pd.isna(v) else v) for k, v in d.items()} for d in d_list]

            subjects = clean_dict_list(processor.subjects_df.to_dict(orient='records'))
            semesters = clean_dict_list(processor.semesters_df.to_dict(orient='records'))
            student_info = processor.get_student_info()
            htno = student_info.get('htno') or (subjects[0].get('htno') if subjects else None)
            student_status = processor.get_student_status()
            completed_semesters = processor.get_completed_semester_count()
            backlogs = processor.get_backlogs()

            return {
                "success": True,
                "processed_count": processed_count,
                "subjects": subjects,
                "semesters": semesters,
                "cgpa": None if pd.isna(processor.get_cgpa()) else processor.get_cgpa(),
                "official_cgpa": None if pd.isna(processor.official_cgpa) else processor.official_cgpa,
                "percentage": None if pd.isna(processor.get_percentage()) else processor.get_percentage(),
                "htno": htno,
                "student_name": student_info.get('name'),
                "student_status": student_status,
                "completed_semesters": completed_semesters,
                "total_semesters": 8,
                "backlogs_count": len(backlogs),
                "regulation": student_info.get('regulation', detect_regulation(htno or '')),
            }

        loop = asyncio.get_event_loop()
        try:
            return await loop.run_in_executor(THREAD_POOL, parse_pdfs_sync, file_buffers)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF Analysis error: {e}")
        raise HTTPException(status_code=500, detail="Error analyzing PDF documents.")


@app.post("/predict/sgpa")
async def predict_next_sgpa(data: List[SemesterSGPARecord]):
    try:
        analyzer = AcademicAnalyzer(pd.DataFrame([d.model_dump() for d in data]))
        return {
            "prediction": analyzer.predict_next_sgpa(),
            "insights": analyzer.get_insights()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/advanced")
async def analyze_advanced(request: AdvancedAnalysisRequest):
    try:
        if not request.semesters or not request.subjects:
             return {
                 "success": False,
                 "message": "Insufficient data. Import subjects first."
             }
        
        analyzer = AcademicAnalyzer(
            semesters_df=pd.DataFrame([d.model_dump() for d in request.semesters]),
            subjects_df=pd.DataFrame([d.model_dump() for d in request.subjects])
        )
        
        return {
            "success": True,
            "performance": analyzer.analyze_performance(),
            "prediction": analyzer.predict_next_sgpa()
        }
    except Exception as e:
        logger.error(f"Advanced analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Error performing advanced analysis.")

# ==========================================
# FILE DOWNLOAD/UPLOAD SYSTEM
# ==========================================
def _build_notes_catalog() -> Dict[str, Any]:
    catalog: Dict[str, Any] = {"regulations": []}

    if R18_NOTES_PATH.exists():
        r18_data: Dict[str, Any] = {"name": "R18", "path": "R18", "years": []}
        for year_folder in sorted(R18_NOTES_PATH.iterdir()):
            if year_folder.is_dir() and "year" in year_folder.name.lower():
                year_data: Dict[str, Any] = {"name": year_folder.name, "path": year_folder.name, "semesters": []}
                for sem_folder in sorted(year_folder.iterdir()):
                    if sem_folder.is_dir() and "sem" in sem_folder.name.lower():
                        sem_data: Dict[str, Any] = {"name": sem_folder.name, "path": f"{year_folder.name}/{sem_folder.name}", "subjects": []}
                        for subject_folder in sorted(sem_folder.iterdir()):
                            if subject_folder.is_dir():
                                subject_data: Dict[str, Any] = {"name": subject_folder.name, "path": f"{year_folder.name}/{sem_folder.name}/{subject_folder.name}", "files": []}
                                for pdf_file in sorted(subject_folder.rglob("*.pdf")):
                                    if pdf_file.is_file():
                                        rel_to_notes = pdf_file.relative_to(R18_NOTES_PATH)
                                        subject_data["files"].append({
                                            "name": pdf_file.name,
                                            "path": f"R18/{rel_to_notes.as_posix()}",
                                            "size": pdf_file.stat().st_size
                                        })
                                if subject_data["files"]:
                                    sem_data["subjects"].append(subject_data)
                        if sem_data["subjects"]:
                            year_data["semesters"].append(sem_data)
                if year_data["semesters"]:
                    r18_data["years"].append(year_data)
        if r18_data["years"]:
            catalog["regulations"].append(r18_data)

    if R22_NOTES_PATH.exists():
        r22_data: Dict[str, Any] = {"name": "R22", "path": "R22", "files": []}
        for pdf_file in sorted(R22_NOTES_PATH.rglob("*.pdf")):
            if pdf_file.is_file():
                rel_to_notes = pdf_file.relative_to(R22_NOTES_PATH)
                r22_data["files"].append({
                    "name": pdf_file.stem,
                    "filename": pdf_file.name,
                    "path": f"R22/{rel_to_notes.as_posix()}",
                    "size": pdf_file.stat().st_size
                })
        if r22_data["files"]:
            catalog["regulations"].append(r22_data)

    return catalog


@app.get("/notes/catalog")
async def get_notes_catalog():
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(THREAD_POOL, _build_notes_catalog)

@app.get("/notes/download")
async def download_note(path: str):
    try:
        if "\0" in path:
            raise HTTPException(status_code=400, detail="Null byte injection detected")
            
        requested_path = Path(path)
        
        if ".." in path or "\\" in path:
            logger.warning(f"Path traversal sequence blocked: {path}")
            raise HTTPException(status_code=403, detail="Forbidden path")
            
        if path.startswith("R18/"):
            base_dir = R18_NOTES_PATH.resolve()
            target_file = (base_dir / requested_path.relative_to("R18")).resolve()
        elif path.startswith("R22/"):
            base_dir = R22_NOTES_PATH.resolve()
            target_file = (base_dir / requested_path.relative_to("R22")).resolve()
        else:
            raise HTTPException(status_code=400, detail="Invalid regulation prefix")
        
        if not target_file.is_relative_to(base_dir):
            logger.warning(f"Path traversal attempt detected: {path}")
            raise HTTPException(status_code=403, detail="Forbidden path")

        if not target_file.is_file():
            raise HTTPException(status_code=404, detail="File not found")
            
        return FileResponse(path=str(target_file), filename=target_file.name, media_type="application/pdf")
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Malformed path")
    except Exception as e:
        logger.error(f"Download error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/notes/upload")
async def upload_note(
    file: UploadFile = File(...),
    regulation: str = Form(...),
    year: str = Form(None),
    semester: str = Form(None),
    subject: str = Form(...)
):
    try:
        # 1. Strictly validate the PDF size & extension
        check_pdf_file(file)
        
        # 2. Validate Form fields to block potential command injections
        if not re.match(r"^[a-zA-Z0-9_-]{2,10}$", regulation):
            raise HTTPException(status_code=400, detail="Invalid regulation format.")
        if year and not re.match(r"^[a-zA-Z0-9_\s-]{1,20}$", year):
            raise HTTPException(status_code=400, detail="Invalid year format.")
        if semester and not re.match(r"^[a-zA-Z0-9_\s-]{1,20}$", semester):
            raise HTTPException(status_code=400, detail="Invalid semester format.")
        if not re.match(r"^[a-zA-Z0-9\s._-]{1,50}$", subject):
            raise HTTPException(status_code=400, detail="Invalid subject format.")
            
        # 3. Sanitize filename completely (leaves only alphanumeric, dots, dashes, underscores)
        original_filename = file.filename or "upload.pdf"
        safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', original_filename)
        if not safe_filename.lower().endswith(".pdf"):
            safe_filename += ".pdf"
            
        parts = [p.strip() for p in [regulation, year, semester, subject] if p]
        for part in parts:
            if ".." in part or "/" in part or "\\" in part:
                raise HTTPException(status_code=400, detail="Invalid characters in folder structure.")
                
        save_path = UPLOAD_DIR.joinpath(*parts).resolve()
        
        # 4. Strict parent directory boundary check
        if not save_path.is_relative_to(UPLOAD_DIR.resolve()):
            raise HTTPException(status_code=403, detail="Forbidden upload path")
            
        save_path.mkdir(parents=True, exist_ok=True)
        file_path = (save_path / safe_filename).resolve()
        
        # 5. Airtight file target boundary check
        if not file_path.is_relative_to(save_path):
            raise HTTPException(status_code=403, detail="Forbidden file destination path")
            
        if file_path.exists():
            file_path = save_path / f"{int(time.time())}_{safe_filename}"
            file_path = file_path.resolve()
            if not file_path.is_relative_to(save_path):
                raise HTTPException(status_code=403, detail="Forbidden file destination path")
            
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"message": "File uploaded successfully", "path": str(file_path.relative_to(BASE_DIR))}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error uploading note: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")


# ==========================================
# HELPFUL APIs (Notifications, Search, Syllabus, Grace Marks, Share)
# ==========================================
class ShareTokenRequest(BaseModel):
    data: Dict[str, Any]


class GraceMarksRequest(BaseModel):
    subjects: List[Dict[str, Any]]
    regulation: str = "R18"


@app.get("/api/notifications")
async def get_notifications(
    exam_year: Optional[str] = None,
    degree: Optional[str] = None,
    regulation: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    refresh: Optional[bool] = False,
):
    loop = asyncio.get_event_loop()
    items = await loop.run_in_executor(
        THREAD_POOL,
        lambda: fetch_notifications(force=bool(refresh)),
    )
    return {
        "items": filter_notifications(items, exam_year, degree, regulation, category, q),
        "source": "https://www.jntufastupdates.com/jntu-hyderabad/",
        "disclaimer": "Unofficial aggregator. Verify critical dates on jntuh.ac.in.",
    }


@app.get("/api/calendars")
async def get_calendars(degree: Optional[str] = None):
    loop = asyncio.get_event_loop()
    items = await loop.run_in_executor(THREAD_POOL, fetch_calendars)
    if degree:
        items = [c for c in items if c.get("degree") == degree]
    return {"items": items}


@app.get("/api/syllabus/gap")
async def syllabus_gap(subject_name: str = "", subject_code: str = ""):
    return get_syllabus_gap(subject_name=subject_name, subject_code=subject_code)


@app.get("/api/pyq/pack")
async def pyq_pack(subject_name: str = "", subject_code: str = "", regulation: str = ""):
    pack = get_pyq_pack(subject_name=subject_name, subject_code=subject_code, regulation=regulation)
    if not pack:
        # Always return a usable fallback pack
        q = " ".join(x for x in ["JNTUH", regulation, subject_code, subject_name, "previous year question paper PDF"] if x)
        return {
            "title": f"{subject_name or subject_code or 'Subject'} — PYQ pack",
            "matched": False,
            "links": [{"label": "Search PYQs", "url": f"https://www.google.com/search?q={quote(q)}", "type": "search"}],
            "topics": [],
        }
    return {**pack, "matched": True}


@app.get("/api/pyq/packs")
async def pyq_packs():
    return {"items": list_pyq_packs()}


@app.post("/api/grace-marks")
async def grace_marks_check(body: GraceMarksRequest):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        THREAD_POOL,
        lambda: check_grace_eligibility(body.subjects, body.regulation),
    )


@app.post("/api/share/create")
async def create_share(body: ShareTokenRequest):
    try:
        token = create_share_token(body.data)
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))
    return {"token": token}


@app.get("/api/share/verify")
async def verify_share(token: str):
    data = verify_share_token(token)
    if not data:
        raise HTTPException(status_code=400, detail="Invalid or expired share token")
    return {"data": data}


# ==========================================
# RUNNER SCRIPT
# ==========================================
if __name__ == "__main__":
    import uvicorn
    # IMPORTANT FIX: Pass the `app` instance object directly instead of the string "server:app".
    # This guarantees the lifespan context manager executes correctly when running `python server.py`.
    uvicorn.run(app, host="0.0.0.0", port=8000)
