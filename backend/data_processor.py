import re
import pandas as pd
import numpy as np
import pdfplumber
import logging
import json
from collections import Counter
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from backend.non_credit import normalize_non_credit_subject

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
GRADE_POINTS = {
    'O': 10, 'S': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'D': 4, 'E': 5, 'F': 0, 'Ab': 0, 'AB': 0, 'ABSENT': 0
}

STANDARD_CREDITS_PER_SEM = 21  # R18 standard, configurable

class AcademicProcessor:
    def __init__(self):
        self.semesters_df = pd.DataFrame()
        self.subjects_df = pd.DataFrame()
        self.student_info = {'name': '', 'htno': ''}
        self.official_sgpas: Dict[Tuple[int, int], float] = {}
        self.official_cgpa: Optional[float] = None
        self.semester_file_counts: Counter[Tuple[int, int]] = Counter()
        self.syllabus_data = {}
        try:
            syllabus_path = Path(__file__).parent / "syllabus.json"
            if syllabus_path.exists():
                with open(syllabus_path, "r", encoding="utf-8") as f:
                    self.syllabus_data = json.load(f)
        except Exception:
            pass
        
    def parse_pdf(self, pdf_file) -> bool:
        """
        Parses a JNTUH result PDF and extracts student info and subject details.
        
        Args:
            pdf_file: File-like object (uploaded file or path)
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with pdfplumber.open(pdf_file) as pdf:
                full_text = ""
                for page in pdf.pages:
                    full_text += (page.extract_text() or "") + "\n"
                    
            # Extract basic info
            self.student_info = self._extract_student_info(full_text)
            logger.info(f"Parsed student info: {self.student_info}")

            extracted_sgpas = self._extract_official_sgpas(full_text)
            for semester_key, sgpa in extracted_sgpas.items():
                self.official_sgpas[semester_key] = sgpa

            extracted_cgpa = self._extract_official_cgpa(full_text)
            if extracted_cgpa is not None:
                self.official_cgpa = extracted_cgpa
            
            # Extract subjects
            subjects = self._extract_subjects(full_text)
            
            if not subjects:
                logger.warning("No subjects found in PDF")
                return False
                
            # Convert to DataFrame
            new_subjects_df = pd.DataFrame(subjects)
            
            # Add metadata
            if self.student_info['htno']:
                new_subjects_df['htno'] = self.student_info['htno']

            for row in new_subjects_df[['year', 'sem']].drop_duplicates().itertuples(index=False):
                self.semester_file_counts[(int(row.year), int(row.sem))] += 1
                
            self.subjects_df = pd.concat([self.subjects_df, new_subjects_df], ignore_index=True)
            self._update_semester_aggregates()
            
            return True
            
        except Exception as e:
            logger.error(f"Error parsing PDF: {e}")
            return False

    def _extract_student_info(self, text: str) -> Dict[str, str]:
        info = {'name': '', 'htno': ''}
        
        name_match = re.search(r"Name\s*[:\-]?\s*([A-Za-z\s\.]+)", text)
        if name_match:
            info['name'] = name_match.group(1).strip()
            
        htno_match = re.search(r"Hall\s*Ticket\s*(?:No\.?|Number)?\s*[:\-]?\s*(\d{2}[A-Z0-9]{8,10})", text, re.IGNORECASE)
        if htno_match:
            info['htno'] = htno_match.group(1).strip()
            
        return info

    def _extract_official_sgpas(self, text: str) -> Dict[Tuple[int, int], float]:
        sgpas: Dict[Tuple[int, int], float] = {}
        current_year = 0
        current_sem = 0
        semester_sections = re.split(
            r"((?:I{1,4}|IV)\s*Year\s*(?:I{1,2})\s*Semester|\d\s*-\s*\d)",
            text,
            flags=re.IGNORECASE,
        )

        for section in semester_sections:
            header_match = self._parse_semester_header(section)
            if header_match:
                current_year, current_sem = header_match
                continue

            if current_year == 0:
                continue

            sgpa_match = re.search(r"\bSGPA\b\s*[:\-]?\s*(\d+(?:\.\d+)?)", section, re.IGNORECASE)
            if sgpa_match:
                sgpas[(current_year, current_sem)] = round(float(sgpa_match.group(1)), 2)

        return sgpas

    def _extract_official_cgpa(self, text: str) -> Optional[float]:
        cgpa_match = re.search(r"\bCGPA\b\s*[:\-]?\s*(\d+(?:\.\d+)?)", text, re.IGNORECASE)
        if not cgpa_match:
            return None
        return round(float(cgpa_match.group(1)), 2)

    def _extract_subjects(self, text: str) -> List[Dict]:
        subjects = []
        current_year = 0
        current_sem = 0
        
        # Split by semester patterns to handle multiple semesters in one file
        # Pattern: "I Year I Semester" or "1-1"
        semester_sections = re.split(r"((?:I{1,4}|IV)\s*Year\s*(?:I{1,2})\s*Semester|\d\s*-\s*\d)", text, flags=re.IGNORECASE)
        
        # If no split happened, it might be a single semester file without clear header or unknown format
        # But usually JNTUH memos have headers. If extracted text is messy, validation will help.
        
        # Process sections. detailed logic needs to be stateful because split includes delimiters
        from backend.shared import (
            detect_regulation,
            get_grade_points,
            valid_grades_union,
            resolve_subject_regulation,
        )
        ht_regulation = detect_regulation(self.student_info.get('htno', ''))
        # Accept grades from both old and modern schemes (detention / multi-memo uploads)
        valid_grades = valid_grades_union(ht_regulation)
        
        for section in semester_sections:
            header_match = self._parse_semester_header(section)
            if header_match:
                current_year, current_sem = header_match
                continue
                
            if current_year == 0:
                 # Skip text before first semester header
                 continue
                 
            lines = section.split('\n')
            for line in lines:
                parsed_subject = self._parse_subject_line(
                    line=line,
                    current_year=current_year,
                    current_sem=current_sem,
                    regulation=ht_regulation,
                    valid_grades=valid_grades,
                    get_grade_points_fn=get_grade_points,
                    resolve_reg_fn=resolve_subject_regulation,
                )
                if parsed_subject:
                    subjects.append(parsed_subject)
                    
        return subjects

    def _parse_subject_line(
        self,
        line: str,
        current_year: int,
        current_sem: int,
        regulation: str,
        valid_grades: List[str],
        get_grade_points_fn,
        resolve_reg_fn=None,
    ) -> Optional[Dict]:
        line = re.sub(r"\s+", " ", line).strip()
        if not line:
            return None

        upper_line = line.upper()
        if upper_line.startswith((
            "SUBJECT CODE",
            "SUBJECT NAME",
            "HALL TICKET",
            "HTNO",
            "NAME",
            "SGPA",
            "CGPA",
            "CREDITS REGISTERED",
            "CREDITS EARNED",
        )):
            return None

        parts = line.split()
        if len(parts) < 4:
            return None

        code_idx = 0
        if parts[0].isdigit() and len(parts) > 1 and self._is_probable_subject_code(parts[1]):
            code_idx = 1

        code = parts[code_idx].strip().strip(':').upper()
        if not self._is_probable_subject_code(code):
            return None

        grade_idx = None
        grade = None
        for idx in range(len(parts) - 1, code_idx, -1):
            candidate = self._normalize_grade(parts[idx])
            if candidate in valid_grades:
                grade_idx = idx
                grade = candidate
                break

        if grade_idx is None or grade is None:
            return None

        subject_reg = regulation
        if resolve_reg_fn is not None:
            subject_reg = resolve_reg_fn(grade, regulation)

        numeric_after_grade: List[float] = []
        for token in parts[grade_idx + 1:]:
            parsed_number = self._parse_credit_token(token)
            if parsed_number is not None:
                numeric_after_grade.append(parsed_number)

        expected_grade_point = float(get_grade_points_fn(grade, subject_reg))
        if len(numeric_after_grade) > 1 and numeric_after_grade[0] == expected_grade_point:
            numeric_after_grade = numeric_after_grade[1:]

        credits = self._pick_credit_value(numeric_after_grade)

        marks_tokens: List[str] = []
        marks_start_idx = grade_idx
        for idx in range(grade_idx - 1, code_idx, -1):
            token = parts[idx]
            if token.isdigit() or token in {'-', 'AB', 'Ab'}:
                marks_tokens.insert(0, token)
                marks_start_idx = idx
                if len(marks_tokens) == 3:
                    break
            elif marks_tokens:
                break

        name_end_idx = marks_start_idx if marks_tokens else grade_idx
        name = " ".join(parts[code_idx + 1:name_end_idx]).strip(" -:")
        if not name or name.upper() in {"SUBJECT NAME", "NAME"}:
            return None

        internal, external, total = None, None, None
        if len(marks_tokens) >= 3:
            internal, external, total = marks_tokens[-3], marks_tokens[-2], marks_tokens[-1]
        elif len(marks_tokens) == 2:
            internal, external = marks_tokens[-2], marks_tokens[-1]
        elif len(marks_tokens) == 1:
            total = marks_tokens[-1]

        internal_int = int(internal) if internal and internal.isdigit() else None
        external_int = int(external) if external and external.isdigit() else None
        total_int = int(total) if total and total.isdigit() else None

        inferred_credits = self._infer_credits(code, name, current_year, current_sem, subject_reg)
        if credits is None or inferred_credits == 0.0:
            credits = inferred_credits

        normalized = normalize_non_credit_subject(
            internal_int, external_int, total_int, credits if credits is not None else 0.0
        )

        subject_data = {
            'year': current_year,
            'sem': current_sem,
            'subject_code': code,
            'subject_name': name,
            'grade': grade,
            'credits': normalized['credits'],
            'grade_points': get_grade_points_fn(grade, subject_reg),
            'regulation': subject_reg,
            'non_credit': bool(normalized.get('non_credit')),
        }

        official_sem_sgpa = self.official_sgpas.get((current_year, current_sem))
        if official_sem_sgpa is not None:
            subject_data['official_sem_sgpa'] = official_sem_sgpa

        if 'internal' in normalized:
            subject_data['internal'] = int(normalized['internal']) if normalized['internal'] == int(normalized['internal']) else normalized['internal']
        if 'external' in normalized:
            subject_data['external'] = int(normalized['external']) if normalized['external'] == int(normalized['external']) else normalized['external']
        if 'total' in normalized:
            subject_data['total'] = int(normalized['total']) if normalized['total'] == int(normalized['total']) else normalized['total']

        return subject_data

    def _is_probable_subject_code(self, code: str) -> bool:
        code = code.strip().upper()
        if not re.match(r"^(?=.*\d)[A-Z0-9\-]{4,15}$", code):
            return False
        return code not in {"HTNO", "SGPA", "CGPA"}

    def _parse_credit_token(self, token: str) -> Optional[float]:
        cleaned = token.strip().rstrip(",.;:")
        try:
            value = float(cleaned)
        except ValueError:
            return None

        if value < 0 or value > 10:
            return None
        return value

    def _pick_credit_value(self, numeric_tokens: List[float]) -> Optional[float]:
        if not numeric_tokens:
            return None

        preferred_values = {0.0, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 10.0}
        for value in numeric_tokens:
            if value in preferred_values and value <= 5.0:
                return value

        if 10.0 in numeric_tokens:
            return 10.0

        return numeric_tokens[-1]

    def _parse_semester_header(self, text: str) -> Optional[Tuple[int, int]]:
        # Try Roman "I Year I Semester"
        roman_map = {'I': 1, 'II': 2, 'III': 3, 'IV': 4}
        roman_match = re.search(r"(I{1,4}|IV)\s*Year\s*(I{1,2})\s*Semester", text, re.IGNORECASE)
        if roman_match:
            y_str, s_str = roman_match.groups()
            return roman_map.get(y_str.upper(), 0), roman_map.get(s_str.upper(), 0)
            
        # Try numeric "1-1"
        num_match = re.search(r"(\d)\s*-\s*(\d)", text)
        if num_match:
             return int(num_match.group(1)), int(num_match.group(2))
             
        return None

    def _normalize_grade(self, grade: str) -> str:
        grade = grade.upper().strip()
        if grade in ['AB', 'ABSENT']:
            return 'Ab'
        return grade

    def _infer_credits(self, code: str, name: str, year: int, sem: int, regulation: str = "R18") -> float:
        """
        Intelligently infer subject credits from patterns and context.
        Prioritizes non-credit/audit subjects to override any scraped artifacts.
        """
        name_lower = name.lower().strip() if name else ""
        code_upper = code.upper().strip() if code else ""
        code_lower = code.lower().strip() if code else ""
        
        is_old_regulation = regulation in ("R13", "R15", "R16")
        
        # ── 1. Audit / Non-credit courses (Highest Priority) ──
        zero_credit_courses = [
            "environmental", "constitution of india", "professional ethics",
            "indian constitution", "gender sensitization", "human values",
            "essence of indian traditional knowledge", "cyber security",
            "socially relevant project", "audit", "non-credit", "mct", "ncc", "nss", "sports"
        ]
        if any(kw in name_lower for kw in zero_credit_courses):
            return 0.0 if not is_old_regulation else 2.0

        # ── 2. Check syllabus DB ──
        if regulation in self.syllabus_data and "subjects" in self.syllabus_data[regulation]:
            subjects_db = self.syllabus_data[regulation]["subjects"]
            if code_upper in subjects_db:
                return float(subjects_db[code_upper]["credits"])
        
        # ── 3. Main project (4-2) ──
        project_keywords = ["project work", "project stage", "main project", "major project", "dissertation"]
        if year == 4 and sem == 2 and any(kw in name_lower for kw in project_keywords):
            return 10.0
        
        # ── 4. Viva (4-2) ──
        if year == 4 and sem == 2 and ("viva" in name_lower or "comprehensive" in name_lower):
            return 2.0
            
        # ── 5. Seminar ──
        if any(kw in name_lower for kw in ["seminar", "colloq", "presentation"]):
            return 2.0
            
        # ── 6. Mini project ──
        if "mini project" in name_lower or "mini-project" in name_lower or "course project" in name_lower:
            return 3.0 if is_old_regulation else 2.0
        if "project" in name_lower:
            return 2.0
            
        # ── 7. Labs ──
        if (code_lower.endswith("l") and len(code_upper) >= 5) or "lab" in name_lower or "practical" in name_lower:
            return 2.0 if is_old_regulation else 1.5
            
        # ── 8. Workshop / skill ──
        if any(kw in name_lower for kw in ["workshop", "skill", "induction", "communication"]):
            return 2.0 if is_old_regulation else 1.0
            
        # ── 9. Heavy theory (4 credits) ──
        heavy_theory = ["mathematics", "calculus", "statistics", "probability", "linear algebra",
                         "discrete math", "numerical", "differential", "transform",
                         "physics", "chemistry", "engineering mechanics"]
        if any(kw in name_lower for kw in heavy_theory):
            return 4.0
            
        # ── Default ──
        return 3.0

    def _update_semester_aggregates(self):
        """
        Recalculates SGPA and CGPA based on current subjects_df
        """
        if self.subjects_df.empty:
            return

        raw_subjects_df = self.subjects_df.copy()
        duplicate_rows = raw_subjects_df.duplicated(subset=['year', 'sem', 'subject_code'], keep=False)
        duplicate_semesters = {
            (int(row.year), int(row.sem))
            for row in raw_subjects_df.loc[duplicate_rows, ['year', 'sem']].drop_duplicates().itertuples(index=False)
        }

        self.subjects_df = raw_subjects_df.sort_values(
            by=['year', 'sem', 'subject_code', 'grade_points'],
            ascending=[True, True, True, False]
        ).drop_duplicates(subset=['year', 'sem', 'subject_code'], keep='first').reset_index(drop=True)

        self.subjects_df['credit_points'] = self.subjects_df['credits'] * self.subjects_df['grade_points']

        sem_agg = self.subjects_df.groupby(['year', 'sem']).agg({
            'credit_points': 'sum',
            'credits': 'sum'
        }).reset_index()

        sem_agg['computed_sgpa'] = np.where(
            sem_agg['credits'] > 0,
            sem_agg['credit_points'] / sem_agg['credits'],
            0
        )
        sem_agg['computed_sgpa'] = sem_agg['computed_sgpa'].round(2)
        sem_agg['official_sgpa'] = sem_agg.apply(
            lambda row: self.official_sgpas.get((int(row['year']), int(row['sem']))),
            axis=1
        )
        trusted_official_sgpas: Dict[Tuple[int, int], float] = {}

        def resolve_semester_sgpa(row) -> float:
            semester_key = (int(row['year']), int(row['sem']))
            official_sgpa = row['official_sgpa']
            if (
                official_sgpa is not None
                and self.semester_file_counts.get(semester_key, 0) == 1
                and semester_key not in duplicate_semesters
            ):
                trusted_official_sgpas[semester_key] = round(float(official_sgpa), 2)
                return trusted_official_sgpas[semester_key]
            return round(float(row['computed_sgpa']), 2)

        sem_agg['sgpa'] = sem_agg.apply(resolve_semester_sgpa, axis=1)
        if 'official_sem_sgpa' in self.subjects_df.columns:
            self.subjects_df['official_sem_sgpa'] = self.subjects_df.apply(
                lambda row: trusted_official_sgpas.get((int(row['year']), int(row['sem']))),
                axis=1
            )
        self.semesters_df = sem_agg.sort_values(['year', 'sem'])
        
    def get_cgpa(self) -> float:
        if self.official_cgpa is not None:
            return round(self.official_cgpa, 2)

        if self.semesters_df.empty:
            return 0.0

        total_credits = self.semesters_df['credits'].sum()
        if total_credits == 0:
            return 0.0

        weighted_sum = (self.semesters_df['sgpa'] * self.semesters_df['credits']).sum()
        return round(weighted_sum / total_credits, 2)
        
    def get_percentage(self) -> float:
        # JNTUH Formula: (CGPA - 0.5) * 10
        cgpa = self.get_cgpa()
        if cgpa <= 0: return 0.0
        return round((cgpa - 0.5) * 10, 2)

    def get_student_info(self) -> Dict[str, str]:
        info = dict(self.student_info)
        # Attach detected regulation so callers don't need to recompute
        if info.get('htno') and 'regulation' not in info:
            from backend.shared import detect_regulation
            info['regulation'] = detect_regulation(info['htno'])
        return info

    def get_completed_semester_count(self) -> int:
        """
        Returns the count of distinct semesters with valid data
        """
        if self.semesters_df.empty:
            return 0
        return len(self.semesters_df[self.semesters_df['credits'] > 0])

    def get_backlogs(self) -> List[Dict[str, any]]:
        """
        Returns a list of active backlogs (subjects with F or Ab grades that have not been cleared)
        """
        if self.subjects_df.empty:
            return []

        backlogs = []
        # Group by subject code
        subject_attempts = {}
        for row in self.subjects_df.itertuples(index=False):
            code = (row.subject_code or "").upper()
            if not code:
                code = row.subject_name.upper()
            
            if code not in subject_attempts:
                subject_attempts[code] = []
            
            subject_attempts[code].append({
                'code': row.subject_code,
                'name': row.subject_name,
                'grade': row.grade,
                'credits': row.credits,
                'year': row.year,
                'sem': row.sem
            })

        # Check which subjects have no passing attempt
        for code, attempts in subject_attempts.items():
            has_pass = any(att['grade'] not in ['F', 'Ab'] for att in attempts)
            if not has_pass:
                # Use the earliest attempt for display
                earliest = min(attempts, key=lambda x: (x['year'], x['sem']))
                backlogs.append({
                    'subject_code': earliest['code'],
                    'subject_name': earliest['name'],
                    'grade': earliest['grade'],
                    'credits': earliest['credits'],
                    'year': earliest['year'],
                    'sem': earliest['sem']
                })
        
        return backlogs

    def get_student_status(self) -> str:
        """
        Determine student's academic status: 'graduated', 'graduated_with_backlogs', or 'studying'
        """
        completed_count = self.get_completed_semester_count()
        backlogs = self.get_backlogs()
        
        if completed_count >= 8:
            if backlogs:
                return 'graduated_with_backlogs'
            return 'graduated'
        
        return 'studying'
