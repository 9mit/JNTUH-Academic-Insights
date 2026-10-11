-- Schema migration: 001_jobs_schema.sql
-- Jobs & Opportunities Portal for JNTUH Academic Insights
-- Enforces strict constraints, canonical URL deduplication, and indexing

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    source_id TEXT,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL,                  -- 'feed' or 'campus_direct'
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    company_logo_url TEXT,
    location TEXT NOT NULL,
    workplace_type TEXT NOT NULL,               -- 'remote', 'hybrid', 'on_site'
    employment_type TEXT NOT NULL,              -- 'full_time', 'internship', 'part_time', 'contract'
    experience_level TEXT NOT NULL,             -- 'entry_level', 'intern', 'mid_level', 'any'
    salary TEXT,
    description TEXT,
    tags TEXT,                                  -- JSON array of skill strings
    canonical_url TEXT NOT NULL UNIQUE,         -- Prevents duplicate listings
    apply_type TEXT NOT NULL DEFAULT 'external',-- 'external' or 'native'
    published_at TEXT NOT NULL,                 -- Verified original publication timestamp (ISO 8601)
    deadline TEXT,                              -- Optional application deadline (ISO 8601)
    last_synced_at TEXT NOT NULL,               -- Last time verified by server sync (ISO 8601)
    is_active INTEGER NOT NULL DEFAULT 1,       -- 1 = active, 0 = expired/purged
    created_at TEXT NOT NULL,                   -- Record insertion timestamp (ISO 8601)
    updated_at TEXT NOT NULL                    -- Record update timestamp (ISO 8601)
);

CREATE INDEX IF NOT EXISTS idx_jobs_published_at ON jobs(published_at);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_workplace_type ON jobs(workplace_type);
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source_name, source_id);

CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    hall_ticket TEXT,
    degree TEXT,
    graduation_year TEXT,
    cgpa REAL,
    resume_url TEXT,
    cover_note TEXT,
    status TEXT NOT NULL DEFAULT 'submitted',   -- 'submitted', 'reviewed', 'shortlisted'
    created_at TEXT NOT NULL,
    FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);

CREATE TABLE IF NOT EXISTS sync_runs (
    id TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    status TEXT NOT NULL,                       -- 'success', 'partial', 'failed'
    jobs_fetched INTEGER NOT NULL DEFAULT 0,
    jobs_inserted INTEGER NOT NULL DEFAULT 0,
    jobs_updated INTEGER NOT NULL DEFAULT 0,
    jobs_expired INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON sync_runs(started_at);
