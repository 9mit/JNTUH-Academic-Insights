from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
import io
import pandas as pd
import asyncio
import shutil
import time
import os
import re
from backend.data_processor import AcademicProcessor
from backend.analyzer import AcademicAnalyzer

app = FastAPI(title="JNTUH Academic Insights API")

# CORS Configuration - Allow all origins for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files from dist folder (built React app)
DIST_PATH = Path(__file__).parent / "dist"
if DIST_PATH.exists():
    app.mount("/assets", StaticFiles(directory=DIST_PATH / "assets"), name="assets")

# Models
class Subject(BaseModel):
    subject_code: str
    subject_name: str
    grade: str
    credits: float
    grade_points: int
    year: int
    sem: int
    htno: Optional[str] = None

class AnalysisRequest(BaseModel):
    semesters: List[dict]

class HallTicketRequest(BaseModel):
    htno: str

@app.get("/")
def read_root():
    """Serve React app or API message"""
    index_file = DIST_PATH / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text(), status_code=200)
    return {"message": "JNTUH Academic Insights API is running"}
@app.post("/fetch/htno")
async def fetch_by_hall_ticket(request: HallTicketRequest):
    """
    Fetches academic results using Playwright browser automation.
    Includes concurrency limiting (max 3 browsers) to support 500+ req/day safely.
    """
    import concurrent.futures
    from playwright.sync_api import sync_playwright
    from bs4 import BeautifulSoup
    import asyncio
    
    # Global semaphore to limit concurrent browser instances
    # 3 concurrent browsers = ~9 requests/min = ~540 requests/hour
    # This easily handles the 500/day requirement without crashing the server RAM.
    if not hasattr(app.state, 'browser_semaphore'):
        app.state.browser_semaphore = asyncio.Semaphore(3)

    htno = request.htno.strip().upper().replace(" ", "")
    
    if len(htno) < 10:
        raise HTTPException(status_code=400, detail="Invalid hall ticket number format. Must be 10 characters.")
    
    def scrape_with_browser(hall_ticket: str):
        """Use Playwright to render JavaScript and get the full HTML"""
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            try:
                # Navigate to the results page
                url = f"https://jntuhresults.vercel.app/academicresult/result?htno={hall_ticket}"
                page.goto(url, timeout=60000)
                
                # Wait for the page to fully load
                page.wait_for_load_state("networkidle", timeout=30000)
                
                # Wait additional time for React to render
                page.wait_for_timeout(5000)
                
                # Get the rendered HTML
                html_content = page.content()
                
                browser.close()
                return html_content
                
            except Exception as e:
                browser.close()
                raise e
    
    try:
        # Acquire semaphore to limit concurrency
        async with app.state.browser_semaphore:
            # Run Playwright in thread pool (it's sync)
            loop = asyncio.get_event_loop()
            try:
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    html_content = await loop.run_in_executor(executor, scrape_with_browser, htno)
            except Exception as e:
                print(f"Playwright failed: {e}")
                raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")
        
        # Parse with BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Check for error in page
        page_text = soup.get_text().lower()
        if "not found" in page_text or "invalid" in page_text:
            raise HTTPException(status_code=404, detail="Hall ticket number not found.")
        
        # Find all tables
        tables = soup.find_all('table')
        
        if len(tables) < 2:
            raise HTTPException(status_code=404, detail="No result tables found. Please verify the hall ticket number or try PDF upload.")
        
        # First table is student info
        student_name = ""
        student_table = tables[0]
        for cell in student_table.find_all(['td', 'th']):
            text = cell.get_text(strip=True)
            # Name is usually all uppercase letters, 5+ chars
            if len(text) > 5 and text.isupper() and text.replace(" ", "").isalpha():
                student_name = text
                break
        
        # Parse semester tables (tables 1+)
        subjects = []
        current_year = 1
        current_sem = 1
        
        for table in tables[1:]:
            rows = table.find_all('tr')
            if not rows: continue

            # Dynamic Column Mapping
            header_map = {}
            header_row = rows[0]
            header_cells = header_row.find_all(['td', 'th'])
            
            # If first row looks like data (no headers), assume standard R18 format
            # Standard: Code, Name, Internal, External, Total, Grade, Credits
            if len(header_cells) > 0 and header_cells[0].get_text(strip=True).upper() != "SUBJECT CODE":
                 header_map = {0: 'code', 1: 'name', 2: 'internal', 3: 'external', 4: 'total', 5: 'grade', 6: 'credits'}
                 start_row_idx = 0
            else:
                # Map headers to indices
                for idx, cell in enumerate(header_cells):
                    txt = cell.get_text(strip=True).upper()
                    if "CODE" in txt: header_map[idx] = 'code'
                    elif "NAME" in txt: header_map[idx] = 'name'
                    elif "INT" in txt: header_map[idx] = 'internal'
                    elif "EXT" in txt: header_map[idx] = 'external'
                    elif "TOT" in txt: header_map[idx] = 'total'
                    elif "GRADE" in txt and "POINT" not in txt: header_map[idx] = 'grade' # Avoid Grade Points
                    elif "CREDIT" in txt or txt == "C" or txt == "CR" or "CRD" in txt: header_map[idx] = 'credits'
                start_row_idx = 1

            for row in rows[start_row_idx:]:
                # Get all cells (td or th)
                cells = row.find_all(['td', 'th'])
                
                # Parse semester headers dynamically
                # Search for the header immediately preceding the table
                # Headers are usually in <b>, <h4>, <h5>, or <p> tags
                # Example text: "IV Year I Semester" or "1-1"
                
                header_text = ""
                prev_element = table.find_previous(['b', 'h4', 'h5', 'p', 'center'])
                if prev_element:
                    header_text = prev_element.get_text(strip=True)
                
                # Try to parse year/sem from header
                parsed_sem = None
                
                # Regex for "IV Year I Semester" or "IV YEAR I SEMESTER"
                roman_map = {'I': 1, 'II': 2, 'III': 3, 'IV': 4}
                roman_match = re.search(r"(I{1,4}|IV)\s*Year\s*(I{1,2})\s*Semester", header_text, re.IGNORECASE)
                if roman_match:
                    y_str, s_str = roman_match.groups()
                    parsed_sem = (roman_map.get(y_str.upper(), 0), roman_map.get(s_str.upper(), 0))
                
                # Regex for "1-1", "1-2" etc
                if not parsed_sem:
                    num_match = re.search(r"(\d)\s*-\s*(\d)", header_text)
                    if num_match:
                        parsed_sem = (int(num_match.group(1)), int(num_match.group(2)))
                
                if parsed_sem:
                    current_year, current_sem = parsed_sem
                else:
                    # Fallback to sequential logic if parsing fails (but log/warn internally if needed)
                    # We only increment if we didn't find a header, to maintain legacy behavior for weird pages
                    pass

                # Check for SGPA row (marks end of semester)
                if cells:
                    first_text = cells[0].get_text(strip=True)
                    if "SGPA" in first_text:
                        # Extract SGPA value (e.g. "SGPA : 8.69")
                        try:
                            # Try to find a float in the text
                            sgpa_match = re.search(r"(\d+\.\d+)", first_text)
                            if not sgpa_match and len(cells) > 1:
                                sgpa_match = re.search(r"(\d+\.\d+)", cells[1].get_text(strip=True))
                            
                            if sgpa_match:
                                official_sgpa = float(sgpa_match.group(1))
                                
                                # Attach this SGPA to all subjects of the CURRENT detected semester
                                # Since we parse the header BEFORE the table, current_year/sem are correct for THIS table.
                                for s in reversed(subjects):
                                    if s['year'] == min(current_year, 4) and s['sem'] == current_sem:
                                        s['official_sem_sgpa'] = official_sgpa
                                    else:
                                        # Stop if we hit a subject from a different semester (optimization)
                                        break 
                        except:
                            pass

                        # For sequential fallback logic: Move to next semester ONLY if we rely on it
                        # But with dynamic parsing, we don't strictly need to increment.
                        # However, for tables WITHOUT headers, we might still need it.
                        if not parsed_sem:
                            if current_sem == 1:
                                current_sem = 2
                            else:
                                current_year += 1
                                current_sem = 1
                        continue
                
                # Parse subject row using map
                code = name = grade = ""
                internal = external = total = None
                credits = None
                
                # If map failed (empty), fallback to index based
                if not header_map and len(cells) >= 7:
                     header_map = {0: 'code', 1: 'name', 2: 'internal', 3: 'external', 4: 'total', 5: 'grade', 6: 'credits'}

                for idx, cell in enumerate(cells):
                    if idx not in header_map: continue
                    val = cell.get_text(strip=True)
                    field = header_map[idx]
                    
                    if field == 'code': code = val
                    elif field == 'name': name = val
                    elif field == 'grade': grade = val
                    elif field == 'internal': 
                        try: internal = int(val) 
                        except: pass
                    elif field == 'external':
                        try: external = int(val)
                        except: pass
                    elif field == 'total':
                        try: total = int(val)
                        except: pass
                    elif field == 'credits':
                        try: 
                            c = float(val)
                            if 0 <= c <= 10: credits = c
                        except: pass

                # Safety net: If credits still None, try scanning typical columns (6 or 7) for float values
                if credits is None and len(cells) >= 7:
                    # Look for a small float in any column after index 5
                    for i in range(5, len(cells)):
                        try:
                            val = cells[i].get_text(strip=True)
                            c = float(val)
                            # Credits are usually {0, 1, 1.5, 2, 3, 4}
                            if c in [0.0, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]:
                                credits = c
                                break
                        except: pass

                # Smart credit fallback based on subject type
                if credits is None:  
                    name_lower = name.lower() if name else ""
                    code_lower = code.lower() if code else ""
                    
                    # Labs typically have 1-1.5 credits
                    if "lab" in name_lower or code_lower.endswith("l"):
                        credits = 1.5
                    # Workshops and skill courses
                    elif "workshop" in name_lower or "skill" in name_lower:
                        credits = 1.0
                    # Projects
                    elif "project" in name_lower or "seminar" in name_lower:
                        credits = 2.0
                    # Theory subjects with tutorials (usually 4 credits)
                    elif "mathematics" in name_lower or "calculus" in name_lower or "statistics" in name_lower:
                        credits = 4.0
                    # Regular theory subjects (default 3 credits)
                    else:
                        credits = 3.0

                # Fallback for Grade if not mapped (sometimes header says 'Gr')
                if not grade:
                    for cell in cells:
                        val = cell.get_text(strip=True)
                        if val in ['O', 'A+', 'A', 'B+', 'B', 'C', 'F', 'Ab']:
                             grade = val; break
                             
                # Valid subject check
                if code and name and grade and len(code) < 15:

                    
                    if code and code != "Subject Code":
                        subject_data = {
                            "subject_code": code,
                            "subject_name": name,
                            "grade": grade,
                            "credits": credits if credits is not None else 3.0,
                            "grade_points": get_grade_points(grade),
                            "year": min(current_year, 4),
                            "sem": current_sem,
                            "htno": htno
                        }
                        # Add marks if available
                        if internal is not None:
                            subject_data["internal"] = internal
                        if external is not None:
                            subject_data["external"] = external
                        if total is not None:
                            subject_data["total"] = total
                        
                        subjects.append(subject_data)
        
        if not subjects:
            raise HTTPException(status_code=404, detail="Could not extract subject data. Please try PDF upload instead.")
        
        # Try to find overall CGPA in page text
        official_cgpa = None
        try:
            # Look for "CGPA : 7.69" pattern
            cgpa_match = re.search(r"CGPA\s*[:\-]?\s*(\d+\.\d+)", page_text, re.IGNORECASE)
            if cgpa_match:
                official_cgpa = float(cgpa_match.group(1))
        except:
            pass

        return {
            "success": True,
            "htno": htno,
            "student_name": student_name,
            "subjects": subjects,
            "total_subjects": len(subjects),
            "official_cgpa": official_cgpa
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}. Please try PDF upload instead.")




def parse_exam_code(exam_code: str) -> dict:
    """Parse exam code to extract year and semester."""
    # Common patterns: "1-1", "1-2", "2-1", etc.
    try:
        if "-" in exam_code:
            parts = exam_code.split("-")
            return {"year": int(parts[0]), "sem": int(parts[1])}
    except:
        pass
    # Default fallback
    return {"year": 1, "sem": 1}


def get_grade_points(grade: str) -> int:
    """Convert grade to grade points."""
    grade_map = {
        "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "D": 4,
        "F": 0, "Ab": 0, "-": 0
    }
    return grade_map.get(grade, 0)


@app.post("/analyze/pdf")
async def analyze_pdf(files: List[UploadFile] = File(...)):
    """
    Accepts multiple PDF files, parses them, and returns:
    - subjects: List of all extracted subjects
    - semesters_summary: Calculated SGPA per semester
    - student_info: Name/HTNO
    """
    processor = AcademicProcessor()
    processed_count = 0
    
    try:
        for file in files:
            # Read file into memory
            contents = await file.read()
            pdf_file = io.BytesIO(contents)
            
            if processor.parse_pdf(pdf_file):
                processed_count += 1
                
        if processed_count == 0:
            raise HTTPException(status_code=400, detail="Could not parse any provided PDFs")
            
        # Convert DataFrames to dicts for JSON response
        subjects = processor.subjects_df.to_dict(orient='records')
        semesters = processor.semesters_df.to_dict(orient='records')
        
        # Get Student Info
        student_info = processor.get_student_info()
        htno = student_info.get('htno') or (subjects[0]['htno'] if subjects and 'htno' in subjects[0] else None)
        student_name = student_info.get('name')
        
        return {
            "success": True,
            "processed_count": processed_count,
            "subjects": subjects,
            "semesters": semesters,
            "cgpa": processor.get_cgpa(),
            "percentage": processor.get_percentage(),
            "htno": htno,
            "student_name": student_name
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/sgpa")
async def predict_next_sgpa(data: List[dict]):
    """
    Accepts semester history and returns ML prediction for next SGPA.
    Expects list of dicts with keys: 'year', 'sem', 'sgpa'
    """
    try:
        df = pd.DataFrame(data)
        analyzer = AcademicAnalyzer(df)
        
        prediction = analyzer.predict_next_sgpa()
        insights = analyzer.get_insights()
        
        return {
            "prediction": prediction,
            "insights": insights
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/advanced")
async def analyze_advanced(request_data: dict):
    """
    Advanced analysis endpoint using Pandas/Numpy
    """
    try:
        semesters_data = request_data.get('semesters', [])
        subjects_data = request_data.get('subjects', [])
        
        sem_df = pd.DataFrame(semesters_data)
        sub_df = pd.DataFrame(subjects_data)
        
        analyzer = AcademicAnalyzer(semesters_df=sem_df, subjects_df=sub_df)
        
        # Get advanced performance stats
        performance_stats = analyzer.analyze_performance()
        
        # Get next SGPA prediction
        prediction = analyzer.predict_next_sgpa()
        
        return {
            "success": True,
            "performance": performance_stats,
            "prediction": prediction
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ════════════════════════════════════════════════════════════════════════════════
# NOTES DOWNLOAD API
# ════════════════════════════════════════════════════════════════════════════════

# Notes folder paths
NOTES_BASE_PATH = Path(__file__).parent
R18_NOTES_PATH = NOTES_BASE_PATH / "jntunotes-main" / "jntunotes-main"
R22_NOTES_PATH = NOTES_BASE_PATH / "JNTUH-CSE-BTech-Notes-R22-main" / "JNTUH-CSE-BTech-Notes-R22-main"

@app.get("/notes/catalog")
async def get_notes_catalog():
    """
    Scan notes folders and return available notes catalog.
    Returns structure: { regulations: [{ name, years: [{ name, semesters: [{ name, subjects: [{ name, files: [...] }] }] }] }] }
    """
    catalog = {"regulations": []}
    
    # Scan R18 Notes (hierarchical: Year > Sem > Subject > Files)
    if R18_NOTES_PATH.exists():
        r18_data = {
            "name": "R18",
            "path": "R18",
            "years": []
        }
        
        for year_folder in sorted(R18_NOTES_PATH.iterdir()):
            if year_folder.is_dir() and "year" in year_folder.name.lower():
                year_data = {
                    "name": year_folder.name,
                    "path": year_folder.name,
                    "semesters": []
                }
                
                for sem_folder in sorted(year_folder.iterdir()):
                    if sem_folder.is_dir() and "sem" in sem_folder.name.lower():
                        sem_data = {
                            "name": sem_folder.name,
                            "path": f"{year_folder.name}/{sem_folder.name}",
                            "subjects": []
                        }
                        
                        for subject_folder in sorted(sem_folder.iterdir()):
                            if subject_folder.is_dir():
                                subject_data = {
                                    "name": subject_folder.name,
                                    "path": f"{year_folder.name}/{sem_folder.name}/{subject_folder.name}",
                                    "files": []
                                }
                                
                                for file in sorted(subject_folder.iterdir()):
                                    if file.is_file() and file.suffix.lower() == ".pdf":
                                        subject_data["files"].append({
                                            "name": file.name,
                                            "path": f"R18/{year_folder.name}/{sem_folder.name}/{subject_folder.name}/{file.name}",
                                            "size": file.stat().st_size
                                        })
                                
                                if subject_data["files"]:
                                    sem_data["subjects"].append(subject_data)
                        
                        if sem_data["subjects"]:
                            year_data["semesters"].append(sem_data)
                
                if year_data["semesters"]:
                    r18_data["years"].append(year_data)
        
        if r18_data["years"]:
            catalog["regulations"].append(r18_data)
    
    # Scan R22 Notes (flat: all PDFs in one folder)
    if R22_NOTES_PATH.exists():
        r22_data = {
            "name": "R22",
            "path": "R22",
            "files": []  # Flat structure for R22
        }
        
        for file in sorted(R22_NOTES_PATH.iterdir()):
            if file.is_file() and file.suffix.lower() == ".pdf":
                r22_data["files"].append({
                    "name": file.stem,  # Subject name without .pdf
                    "filename": file.name,
                    "path": f"R22/{file.name}",
                    "size": file.stat().st_size
                })
        
        if r22_data["files"]:
            catalog["regulations"].append(r22_data)
    
    return catalog


@app.get("/notes/download")
async def download_note(path: str):
    """
    Download a specific PDF file.
    Path format: R18/1st year/1st sem/M1/filename.pdf or R22/filename.pdf
    """
    try:
        # Validate path to prevent directory traversal
        if ".." in path or path.startswith("/"):
            raise HTTPException(status_code=400, detail="Invalid path")
        
        # Determine base path based on regulation
        if path.startswith("R18/"):
            file_path = R18_NOTES_PATH / path[4:]  # Remove "R18/" prefix
        elif path.startswith("R22/"):
            file_path = R22_NOTES_PATH / path[4:]  # Remove "R22/" prefix
        else:
            raise HTTPException(status_code=400, detail="Invalid regulation prefix")
        
        # Check if file exists
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Return file for download
        return FileResponse(
            path=str(file_path),
            filename=file_path.name,
            media_type="application/pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/notes/upload")
async def upload_note(
    file: UploadFile = File(...),
    regulation: str = Form(...),
    year: str = Form(None),
    semester: str = Form(None),
    subject: str = Form(...)
):
    try:
        # Construct path: uploads/pending_notes/{regulation}/{year}/{semester}/{subject}
        base_path = Path("uploads/pending_notes")
        save_path = base_path / regulation
        
        if year:
            save_path = save_path / year
        if semester:
            save_path = save_path / semester
            
        # Create subject folder
        save_path = save_path / subject
        save_path.mkdir(parents=True, exist_ok=True)
        
        # Save file
        file_path = save_path / file.filename
        
        # Check if file already exists
        if file_path.exists():
            timestamp = int(time.time())
            file_path = save_path / f"{timestamp}_{file.filename}"
            
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"message": "File uploaded successfully", "path": str(file_path)}
        
    except Exception as e:
        print(f"Error uploading note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
