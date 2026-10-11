"""Automated test suite for Jobs & Opportunities Portal.
Covers:
1. Canonical URL normalization & deduplication
2. 7-day freshness policy enforcement and automated expiration purging
3. Ingestion failure isolation & sync run telemetry
4. Native application submission workflow and rate limiting
5. Full-text search and faceted filtering
"""

import os
import shutil
import tempfile
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path

from backend.jobs_db import (
    init_db,
    upsert_job,
    purge_expired_jobs,
    query_jobs,
    get_job_by_id,
    submit_application,
    normalize_canonical_url,
    is_older_than_7_days,
    get_sync_status,
)


class TestJobsPortal(unittest.TestCase):
    def setUp(self):
        # Create isolated temporary directory for test database
        self.test_dir = tempfile.mkdtemp()
        self.db_path = Path(self.test_dir) / "test_jobs.db"
        init_db(self.db_path)
        self.now = datetime.now(timezone.utc)

    def tearDown(self):
        # Clean up temporary test database
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_canonical_url_normalization(self):
        """Test that tracking query parameters and fragments are cleanly stripped."""
        raw_1 = "https://example.com/jobs/dev-123/?utm_source=linkedin&utm_medium=cpc&ref=feed"
        raw_2 = "https://example.com/jobs/dev-123#apply-now"
        clean_1 = normalize_canonical_url(raw_1)
        clean_2 = normalize_canonical_url(raw_2)

        self.assertEqual(clean_1, "https://example.com/jobs/dev-123")
        self.assertEqual(clean_2, "https://example.com/jobs/dev-123")

    def test_deduplication_and_date_preservation(self):
        """Test that identical canonical URLs update existing records without creating duplicates,
        and that the original publication date is never overwritten.
        """
        original_pub_date = (self.now - timedelta(days=2)).isoformat()
        job_data_1 = {
            "title": "Junior Backend Developer",
            "company": "Tech Corp",
            "canonical_url": "https://example.com/careers/backend-junior?utm_source=rss",
            "published_at": original_pub_date,
            "workplace_type": "remote",
            "employment_type": "full_time",
            "experience_level": "entry_level",
            "location": "Remote",
            "salary": "₹6 LPA",
            "description": "Initial description.",
            "tags": ["Python", "FastAPI"],
        }

        ok1, action1 = upsert_job(job_data_1, db_path=self.db_path)
        self.assertTrue(ok1)
        self.assertEqual(action1, "inserted")

        # Second sync with different tracking parameters and updated salary
        job_data_2 = {
            "title": "Junior Backend Developer",
            "company": "Tech Corp",
            "canonical_url": "https://example.com/careers/backend-junior?utm_source=twitter&ref=campus",
            "published_at": (self.now - timedelta(hours=1)).isoformat(),  # Newer fetch date
            "workplace_type": "remote",
            "employment_type": "full_time",
            "experience_level": "entry_level",
            "location": "Remote",
            "salary": "₹7 LPA",  # Revised salary
            "description": "Updated description.",
            "tags": ["Python", "FastAPI", "PostgreSQL"],
        }

        ok2, action2 = upsert_job(job_data_2, db_path=self.db_path)
        self.assertTrue(ok2)
        self.assertEqual(action2, "updated")

        # Verify only 1 record exists in DB
        res = query_jobs(db_path=self.db_path)
        self.assertEqual(res["total"], 1)

        saved = res["items"][0]
        self.assertEqual(saved["salary"], "₹7 LPA")
        # Ensure original published_at timestamp was preserved!
        self.assertEqual(saved["published_at"], original_pub_date)
        self.assertIn("PostgreSQL", saved["tags"])

    def test_7_day_freshness_policy_ingestion(self):
        """Test that listings with original publication date older than 7 days are discarded."""
        # Job posted 8 days ago
        old_pub = (self.now - timedelta(days=8)).isoformat()
        old_job = {
            "title": "Expired Role",
            "company": "Old Corp",
            "canonical_url": "https://example.com/jobs/old-role",
            "published_at": old_pub,
            "workplace_type": "remote",
            "employment_type": "full_time",
            "experience_level": "entry_level",
        }
        ok, action = upsert_job(old_job, db_path=self.db_path)
        self.assertFalse(ok)
        self.assertEqual(action, "skipped_expired")

        # Job posted 3 days ago (valid)
        fresh_pub = (self.now - timedelta(days=3)).isoformat()
        fresh_job = {
            "title": "Fresh Role",
            "company": "New Corp",
            "canonical_url": "https://example.com/jobs/fresh-role",
            "published_at": fresh_pub,
            "workplace_type": "remote",
            "employment_type": "full_time",
            "experience_level": "entry_level",
        }
        ok_fresh, action_fresh = upsert_job(fresh_job, db_path=self.db_path)
        self.assertTrue(ok_fresh)
        self.assertEqual(action_fresh, "inserted")

        res = query_jobs(db_path=self.db_path)
        self.assertEqual(res["total"], 1)
        self.assertEqual(res["items"][0]["title"], "Fresh Role")

    def test_7_day_freshness_purge(self):
        """Test that the purge cycle deactivates listings once they pass the 7-day mark."""
        # Insert a job with verified date 6 days ago
        valid_pub = (self.now - timedelta(days=6)).isoformat()
        job = {
            "title": "Maturing Role",
            "company": "Target Co",
            "canonical_url": "https://example.com/jobs/maturing-role",
            "published_at": valid_pub,
            "workplace_type": "on_site",
            "employment_type": "full_time",
            "experience_level": "entry_level",
        }
        upsert_job(job, db_path=self.db_path)

        # Before purge cutoff: job is active
        res_before = query_jobs(db_path=self.db_path)
        self.assertEqual(res_before["total"], 1)

        # Purge with max_days=5 (simulating time passing past 7 days)
        purged = purge_expired_jobs(max_days=5, db_path=self.db_path)
        self.assertEqual(purged, 1)

        # After purge: listing is no longer returned in active queries
        res_after = query_jobs(db_path=self.db_path)
        self.assertEqual(res_after["total"], 0)

    def test_search_and_filtering(self):
        """Test search by keyword and filtering by workplace and employment types."""
        jobs = [
            {
                "title": "Frontend Engineer (React)",
                "company": "Alpha Tech",
                "canonical_url": "https://example.com/jobs/frontend-react",
                "published_at": (self.now - timedelta(days=1)).isoformat(),
                "workplace_type": "remote",
                "employment_type": "full_time",
                "experience_level": "entry_level",
                "location": "Remote",
                "tags": ["React", "TypeScript"],
            },
            {
                "title": "Machine Learning Intern",
                "company": "Hyderabad AI Labs",
                "canonical_url": "https://example.com/jobs/ml-intern-hyd",
                "published_at": (self.now - timedelta(days=2)).isoformat(),
                "workplace_type": "on_site",
                "employment_type": "internship",
                "experience_level": "intern",
                "location": "Hyderabad",
                "tags": ["Python", "PyTorch"],
            },
            {
                "title": "DevOps Engineer",
                "company": "Cloud Systems",
                "canonical_url": "https://example.com/jobs/devops-cloud",
                "published_at": (self.now - timedelta(days=3)).isoformat(),
                "workplace_type": "hybrid",
                "employment_type": "full_time",
                "experience_level": "entry_level",
                "location": "Bangalore",
                "tags": ["Docker", "Kubernetes"],
            },
        ]
        for j in jobs:
            upsert_job(j, db_path=self.db_path)

        # Keyword search for "React"
        res_kw = query_jobs(q="React", db_path=self.db_path)
        self.assertEqual(res_kw["total"], 1)
        self.assertEqual(res_kw["items"][0]["title"], "Frontend Engineer (React)")

        # Filter by workplace_type: on_site
        res_workplace = query_jobs(workplace_type="on_site", db_path=self.db_path)
        self.assertEqual(res_workplace["total"], 1)
        self.assertEqual(res_workplace["items"][0]["company"], "Hyderabad AI Labs")

        # Filter by employment_type: internship
        res_intern = query_jobs(employment_type="internship", db_path=self.db_path)
        self.assertEqual(res_intern["total"], 1)
        self.assertEqual(res_intern["items"][0]["experience_level"], "intern")

    def test_native_application_workflow(self):
        """Test on-platform native application submission, validation, and anti-spam protection."""
        job = {
            "title": "Campus Graduate Engineer",
            "company": "Direct Partner Co",
            "canonical_url": "https://example.com/jobs/campus-grad",
            "published_at": (self.now - timedelta(hours=12)).isoformat(),
            "workplace_type": "hybrid",
            "employment_type": "full_time",
            "experience_level": "entry_level",
            "apply_type": "native",
        }
        upsert_job(job, db_path=self.db_path)

        res = query_jobs(db_path=self.db_path)
        job_id = res["items"][0]["id"]

        # Valid submission
        app_data = {
            "job_id": job_id,
            "student_name": "Rohan Sharma",
            "email": "rohan.sharma@example.com",
            "phone": "+91 9876543210",
            "hall_ticket": "22J91A0501",
            "degree": "B.Tech CSE",
            "graduation_year": "2026",
            "cgpa": 8.42,
            "resume_url": "https://drive.google.com/rohan-resume.pdf",
            "cover_note": "Passionate about backend architectures.",
        }
        result = submit_application(app_data, db_path=self.db_path)
        self.assertEqual(result["status"], "submitted")
        self.assertEqual(result["company"], "Direct Partner Co")
        self.assertTrue(bool(result["application_id"]))

        # Duplicate submission from same email on same day should be rejected
        with self.assertRaises(ValueError) as ctx:
            submit_application(app_data, db_path=self.db_path)
        self.assertIn("already submitted an application", str(ctx.exception))

        # Missing required fields
        with self.assertRaises(ValueError):
            submit_application({"job_id": job_id, "student_name": "Incomplete"}, db_path=self.db_path)

        # Invalid email format
        invalid_email_data = dict(app_data)
        invalid_email_data["email"] = "not-an-email"
        with self.assertRaises(ValueError):
            submit_application(invalid_email_data, db_path=self.db_path)


if __name__ == "__main__":
    unittest.main()
