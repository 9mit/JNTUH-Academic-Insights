import asyncio
import io
import json
import logging
import re
import requests
import shutil
import time
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List, Optional, Dict, Any

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.data_processor import AcademicProcessor
from backend.analyzer import AcademicAnalyzer
from backend.shared import (
    GRADE_POINTS_BY_REGULATION,
    VALID_GRADES_BY_REGULATION,
    detect_regulation,
    get_grade_points,
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
BROWSER_SEMAPHORE: Optional[asyncio.Semaphore] = None
THREAD_POOL: Optional[ThreadPoolExecutor] = None


# ==========================================
# LIFESPAN & APP INIT
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern FastAPI lifecycle manager for startup/shutdown events."""
    global SYLLABUS_DATA, BROWSER_SEMAPHORE, THREAD_POOL
    
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

    # Initialize Concurrency Limits globally
    BROWSER_SEMAPHORE = asyncio.Semaphore(3)
    THREAD_POOL = ThreadPoolExecutor(max_workers=3)
    
    # Ensure upload dir exists
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    logger.info("Application startup complete. Lifespan triggered successfully.")
    
    yield  # App runs here

    # Cleanup
    if THREAD_POOL:
        THREAD_POOL.shutdown(wait=False)
    logger.info("Application shutdown complete.")

app = FastAPI(title="JNTUH Academic Insights API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if DIST_PATH.exists():
    app.mount("/assets", StaticFiles(directory=DIST_PATH / "assets"), name="assets")

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

class AdvancedAnalysisRequest(BaseModel):
    semesters: List[dict]
    subjects: List[dict]



def infer_credits(code: str, name: str, year: int, sem: int, regulation: str) -> float:
    name_lower = name.lower().strip() if name else ""
    code_upper = code.upper().strip() if code else ""
    code_lower = code.lower().strip() if code else ""
    is_old_regulation = regulation in ("R13", "R15", "R16")
    
    zero_credit_courses = [
        "environmental", "constitution", "ethics", "gender sensitization", 
        "human values", "cyber security", "audit", "non-credit", "ncc", "nss", "sports"
    ]
    if any(kw in name_lower for kw in zero_credit_courses):
        return 0.0 if not is_old_regulation else 2.0

    if regulation in SYLLABUS_DATA and "subjects" in SYLLABUS_DATA[regulation]:
        if code_upper in SYLLABUS_DATA[regulation]["subjects"]:
            return float(SYLLABUS_DATA[regulation]["subjects"][code_upper]["credits"])
    
    project_keywords = ["project work", "main project", "major project", "dissertation"]
    if year == 4 and sem == 2 and any(kw in name_lower for kw in project_keywords): return 10.0
    if year == 4 and sem == 2 and ("viva" in name_lower or "comprehensive" in name_lower): return 2.0
    if any(kw in name_lower for kw in ["seminar", "colloq", "presentation"]): return 2.0
    if "mini project" in name_lower or "course project" in name_lower: return 3.0 if is_old_regulation else 2.0
    if "project" in name_lower: return 2.0
    if (code_lower.endswith("l") and len(code_upper) >= 5) or "lab" in name_lower or "practical" in name_lower:
        return 2.0 if is_old_regulation else 1.5
    if any(kw in name_lower for kw in ["workshop", "skill", "induction", "communication"]):
        return 2.0 if is_old_regulation else 1.0
    
    heavy_theory = ["mathematics", "calculus", "statistics", "probability", "physics", "chemistry", "mechanics"]
    if any(kw in name_lower for kw in heavy_theory): return 4.0
    return 3.0

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
        'Referer': 'https://jntuhconnect.dhethi.com/'
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
            
            # Extract marks if available in API
            internal = subj.get("internalMarks")
            external = subj.get("externalMarks")
            total = subj.get("totalMarks")
            
            subjects.append({
                "subject_code": subj.get("subjectCode", "").strip(),
                "subject_name": subj.get("subjectName", "").strip(),
                "grade": grade,
                "credits": float(subj.get("credits", 0.0)),
                "grade_points": gp,
                "year": year,
                "sem": sem,
                "htno": htno,
                "regulation": detected_regulation,
                "internal": internal if isinstance(internal, (int, float)) else None,
                "external": external if isinstance(external, (int, float)) else None,
                "total": total if isinstance(total, (int, float)) else None
            })
            
        sgpa_val = float(sem_data.get("semesterSGPA", 0.0)) if str(sem_data.get("semesterSGPA")).replace('.', '', 1).isdigit() else 0.0
        
        semesters.append({
            "year": year,
            "sem": sem,
            "sgpa": sgpa_val,
            "credits": float(sem_data.get("semesterCredits", 0.0))
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
    index_file = DIST_PATH / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text(), status_code=200)
    return {"message": "JNTUH Academic Insights API is running"}


@app.post("/fetch/htno")
async def fetch_by_hall_ticket(request: HallTicketRequest):
    htno = request.htno.strip().upper().replace(" ", "")
    
    global THREAD_POOL
    if THREAD_POOL is None:
        logger.warning("THREAD_POOL was None. Initializing manually.")
        THREAD_POOL = ThreadPoolExecutor(max_workers=3)
    
    try:
        loop = asyncio.get_running_loop()
        try:
            result = await loop.run_in_executor(THREAD_POOL, fetch_api_and_parse, htno)
            logger.info(f"Successfully fetched {result['total_subjects']} subjects for {htno} via REST API")
            return result
        except Exception as e:
            # Re-raise HTTP exceptions explicitly defined in fetch_api_and_parse
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"API failure for {htno}: {e}")
            raise HTTPException(status_code=500, detail="Data provider failed. Please use PDF Upload.")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error processing {htno}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch results: {str(e)}")


@app.post("/analyze/pdf")
async def analyze_pdf(files: List[UploadFile] = File(...)):
    processor = AcademicProcessor()
    processed_count = 0
    
    try:
        for file in files:
            contents = await file.read()
            if processor.parse_pdf(io.BytesIO(contents)):
                processed_count = int(processed_count) + 1
                
        if processed_count == 0:
            raise HTTPException(status_code=400, detail="Could not parse provided PDFs")
            
        def clean_dict_list(d_list):
            return [{k: (None if pd.isna(v) else v) for k, v in d.items()} for d in d_list]

        subjects = clean_dict_list(processor.subjects_df.to_dict(orient='records'))
        semesters = clean_dict_list(processor.semesters_df.to_dict(orient='records'))
        
        student_info = processor.get_student_info()
        htno = student_info.get('htno') or (subjects[0].get('htno') if subjects else None)
        
        # Get student status
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
            "regulation": student_info.get('regulation', detect_regulation(htno or ''))
        }
    except Exception as e:
        logger.error(f"PDF Analysis error: {e}")
        raise HTTPException(status_code=500, detail="Error analyzing PDF documents.")


@app.post("/predict/sgpa")
async def predict_next_sgpa(data: List[dict]):
    try:
        analyzer = AcademicAnalyzer(pd.DataFrame(data))
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
            semesters_df=pd.DataFrame(request.semesters), 
            subjects_df=pd.DataFrame(request.subjects)
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
@app.get("/notes/catalog")
async def get_notes_catalog():
    catalog = {"regulations": []}
    
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
                                # Recursively find all PDFs inside the subject folder (including subfolders like HWN)
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
        if r18_data["years"]: catalog["regulations"].append(r18_data)
    
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
        if r22_data["files"]: catalog["regulations"].append(r22_data)
    
    return catalog

@app.get("/notes/download")
async def download_note(path: str):
    try:
        requested_path = Path(path)
        
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
        parts = [p for p in [regulation, year, semester, subject] if p]
        save_path = UPLOAD_DIR.joinpath(*parts).resolve()
        
        if not save_path.is_relative_to(UPLOAD_DIR.resolve()):
            raise HTTPException(status_code=403, detail="Forbidden upload path")
            
        save_path.mkdir(parents=True, exist_ok=True)
        file_path = save_path / file.filename
        
        if file_path.exists():
            file_path = save_path / f"{int(time.time())}_{file.filename}"
            
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"message": "File uploaded successfully", "path": str(file_path.relative_to(BASE_DIR))}
        
    except Exception as e:
        logger.error(f"Error uploading note: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")


# ==========================================
# RUNNER SCRIPT
# ==========================================
if __name__ == "__main__":
    import uvicorn
    # IMPORTANT FIX: Pass the `app` instance object directly instead of the string "server:app".
    # This guarantees the lifespan context manager executes correctly when running `python server.py`.
    uvicorn.run(app, host="0.0.0.0", port=8000)
