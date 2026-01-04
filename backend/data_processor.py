import re
import pandas as pd
import numpy as np
import pdfplumber
import logging
from typing import Dict, List, Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
GRADE_POINTS = {
    'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'F': 0, 'Ab': 0, 'AB': 0, 'ABSENT': 0
}

STANDARD_CREDITS_PER_SEM = 21  # R18 standard, configurable

class AcademicProcessor:
    def __init__(self):
        self.semesters_df = pd.DataFrame()
        self.subjects_df = pd.DataFrame()
        self.student_info = {'name': '', 'htno': ''}
        
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
                    full_text += page.extract_text() + "\n"
                    
            # Extract basic info
            self.student_info = self._extract_student_info(full_text)
            logger.info(f"Parsed student info: {self.student_info}")
            
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
        
        current_header = None
        
        for section in semester_sections:
            header_match = self._parse_semester_header(section)
            if header_match:
                current_year, current_sem = header_match
                continue
                
            if current_year == 0:
                 # Skip text before first semester header
                 continue
                 
            # Find subject lines
            # Pattern: CODE NAME GRADE CREDITS
            # Example: 151AA MATHEMATICS-I F 4
            # This is tricky because names can have spaces.
            # Best betting is looking for Grade + Credits at the end of line
            
            lines = section.split('\n')
            for line in lines:
                # Regex for Subject Line: Code (Alphanumeric) + Name (Text) + Grade (O/A+/F/Ab) + Credits (Number)
                # Match end of line first: (O|A\+|A|B\+|B|C|F|Ab)\s+(\d+(?:\.\d)?)\s*$
                
                subject_pattern = r"([A-Z0-9]{4,10})\s+(.+?)\s+(O|A\+|A|B\+|B|C|F|Ab|ABSENT)\s+(\d+(?:\.\d)?)\s*$"
                match = re.search(subject_pattern, line, re.IGNORECASE)
                
                if match:
                    code, name, grade_str, credits_str = match.groups()
                    grade = self._normalize_grade(grade_str)
                    
                    subjects.append({
                        'year': current_year,
                        'sem': current_sem,
                        'subject_code': code.strip(),
                        'subject_name': name.strip(),
                        'grade': grade,
                        'credits': float(credits_str),
                        'grade_points': GRADE_POINTS.get(grade, 0)
                    })
                    
        return subjects

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

    def _update_semester_aggregates(self):
        """
        Recalculates SGPA and CGPA based on current subjects_df
        """
        if self.subjects_df.empty:
            return

        # Calculate SGPA per semester
        # SGPA = Σ(C * GP) / ΣC
        
        self.subjects_df['credit_points'] = self.subjects_df['credits'] * self.subjects_df['grade_points']
        
        sem_agg = self.subjects_df.groupby(['year', 'sem']).agg({
            'credit_points': 'sum',
            'credits': 'sum'
        }).reset_index()
        
        sem_agg['sgpa'] = sem_agg['credit_points'] / sem_agg['credits']
        sem_agg['sgpa'] = sem_agg['sgpa'].round(2)
        
        self.semesters_df = sem_agg.sort_values(['year', 'sem'])
        
    def get_cgpa(self) -> float:
        if self.subjects_df.empty:
            return 0.0
            
        total_points = self.subjects_df['credit_points'].sum()
        total_credits = self.subjects_df['credits'].sum()
        
        if total_credits == 0:
            return 0.0
            
        return round(total_points / total_credits, 2)
        
    def get_percentage(self) -> float:
        # JNTUH Formula: (CGPA - 0.5) * 10
        cgpa = self.get_cgpa()
        if cgpa <= 0: return 0.0
        return round((cgpa - 0.5) * 10, 2)

    def get_student_info(self) -> Dict[str, str]:
        return self.student_info
