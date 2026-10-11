import unittest
from backend.important_questions import (
    query_important_questions,
    get_cram_sheet,
    get_filters_meta,
)

class TestImportantQuestions(unittest.TestCase):
    def test_filters_meta(self):
        meta = get_filters_meta()
        self.assertIn("R22", meta["regulations"])
        self.assertIn("CSE", meta["branches"])
        self.assertIn("1-1", meta["semesters"])
        self.assertTrue(len(meta["curated_subjects"]) >= 5)

    def test_curated_subject_query(self):
        res = query_important_questions(
            regulation="R22",
            branch="CSE",
            semester="1-1",
            subject_query="MATRICES AND CALCULUS"
        )
        self.assertEqual(res["source"], "curated_blueprint")
        self.assertEqual(res["subject_code"], "MA101BS")
        self.assertTrue(len(res["units"]) >= 5)
        self.assertTrue(res["total_questions"] >= 10)
        
        # Test unit 1 has questions with evaluator blueprint
        u1 = res["units"][0]
        self.assertTrue(len(u1["questions"]) >= 1)
        q = u1["questions"][0]
        self.assertIn("evaluator_blueprint", q)
        self.assertTrue(q["probability_stars"] >= 3)
        self.assertTrue(q["repetition_count"] >= 3)

    def test_high_prob_filter(self):
        res = query_important_questions(
            regulation="R22",
            branch="CSE",
            semester="1-1",
            subject_query="MATRICES AND CALCULUS",
            high_prob_only=True
        )
        for u in res["units"]:
            for q in u["questions"]:
                self.assertEqual(q["probability_stars"], 5)

    def test_cram_sheet_generation(self):
        cs = get_cram_sheet("MATRICES AND CALCULUS", "R22")
        self.assertIn("questions", cs)
        self.assertLessEqual(len(cs["questions"]), 10)
        self.assertTrue(len(cs["questions"]) >= 5)

    def test_catalog_synthesis_fallback(self):
        # Query a course from the catalog that isn't directly in curated set
        res = query_important_questions(
            regulation="R18",
            branch="MINING",
            semester="4-1",
            subject_query="MINE LEGISLATION"
        )
        self.assertTrue(res["total_questions"] >= 1)
        self.assertIn("units", res)


if __name__ == "__main__":
    unittest.main()
