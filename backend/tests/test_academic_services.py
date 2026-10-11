"""Unit test suite for Academic Services:
1. Grace Marks Ordinance (0.15% rule)
2. Credit Exemption Ordinance (R18 vs R22)
3. Study Packs & Syllabus Gap Analysis
4. Academic Calendars
"""
import unittest
from backend.grace_marks import check_grace_eligibility
from backend.study_packs import get_syllabus_gap, get_pyq_pack, list_pyq_packs
from backend.calendars import fetch_calendars


class TestAcademicServices(unittest.TestCase):
    def test_grace_marks_single_eligible_backlog(self):
        """A single backlog short by 3 marks should qualify under R18 (quota: 8 marks)."""
        subjects = [
            {"subject_code": "156AH", "subject_name": "COMPILER DESIGN", "grade": "F", "external": 24, "total": 38, "credits": 3},
            {"subject_code": "156BN", "subject_name": "MACHINE LEARNING", "grade": "A", "external": 50, "total": 75, "credits": 3},
        ]
        result = check_grace_eligibility(subjects, regulation="R18")
        self.assertTrue(result["scheme_applies"])
        self.assertEqual(result["backlog_count"], 1)
        self.assertEqual(result["eligible_count"], 1)
        self.assertTrue(result["can_clear_with_grace"])
        self.assertEqual(result["max_grace_marks_quota"], 8)

    def test_grace_marks_exceeding_backlogs_count(self):
        """More than 2 failed subjects disqualifies candidate from 0.15% grace ordinance."""
        subjects = [
            {"subject_code": "S1", "subject_name": "Course 1", "grade": "F", "external": 25, "total": 39, "credits": 3},
            {"subject_code": "S2", "subject_name": "Course 2", "grade": "F", "external": 25, "total": 39, "credits": 3},
            {"subject_code": "S3", "subject_name": "Course 3", "grade": "F", "external": 25, "total": 39, "credits": 3},
        ]
        result = check_grace_eligibility(subjects, regulation="R18")
        self.assertFalse(result["scheme_applies"])
        self.assertFalse(result["can_clear_with_grace"])

    def test_credit_exemption_r18_elective(self):
        """R18 allows exempting up to 2 elective subjects (6 credits max)."""
        subjects = [
            {"subject_code": "PE1", "subject_name": "Open Elective - Renewable Energy", "grade": "F", "credits": 3},
            {"subject_code": "PE2", "subject_name": "Professional Elective - Cloud Computing", "grade": "F", "credits": 3},
        ]
        result = check_grace_eligibility(subjects, regulation="R18")
        self.assertTrue(result["exemption_allowed"])
        self.assertTrue(result["can_clear_with_exemption"])
        self.assertEqual(result["max_exempt_credits"], 6)

    def test_credit_exemption_r22_forbidden(self):
        """R22 strictly disallows credit exemption (160 mandatory credits)."""
        subjects = [
            {"subject_code": "PE1", "subject_name": "Open Elective - Renewable Energy", "grade": "F", "credits": 3},
        ]
        result = check_grace_eligibility(subjects, regulation="R22")
        self.assertFalse(result["exemption_allowed"])
        self.assertFalse(result["can_clear_with_exemption"])
        self.assertEqual(result["max_exempt_credits"], 0)

    def test_syllabus_gap_matching(self):
        """Compiler design should return structured focus units and study tip."""
        gap = get_syllabus_gap(subject_name="Compiler Design", subject_code="156AH")
        self.assertIsNotNone(gap.get("matched"))
        self.assertTrue(len(gap.get("focus_units", [])) >= 3)
        self.assertIn("study_tip", gap)

    def test_pyq_packs_catalog(self):
        """Catalog should return indexed question paper packs."""
        packs = list_pyq_packs()
        self.assertTrue(len(packs) > 0)
        first = packs[0]
        self.assertIn("title", first)
        self.assertIn("links", first)
        self.assertIn("topics", first)

    def test_calendars_fetching(self):
        """Calendars fetch should return structured academic items."""
        data = fetch_calendars()
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) > 0)
        cal = data[0]
        self.assertIn("title", cal)
        self.assertIn("events", cal)


if __name__ == "__main__":
    unittest.main()
