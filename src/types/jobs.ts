export type WorkplaceType = 'remote' | 'hybrid' | 'on_site' | 'all';
export type EmploymentType = 'full_time' | 'internship' | 'part_time' | 'contract' | 'all';
export type ExperienceLevel = 'entry_level' | 'intern' | 'mid_level' | 'any' | 'all';
export type ApplyType = 'external' | 'native' | 'all';

export interface JobPosting {
  id: string;
  source_id?: string;
  source_name: string;
  source_type: 'feed' | 'campus_direct';
  title: string;
  company: string;
  company_logo_url?: string | null;
  location: string;
  workplace_type: 'remote' | 'hybrid' | 'on_site';
  employment_type: 'full_time' | 'internship' | 'part_time' | 'contract';
  experience_level: 'entry_level' | 'intern' | 'mid_level' | 'any';
  salary?: string | null;
  description: string;
  tags: string[];
  canonical_url: string;
  apply_type: 'external' | 'native';
  published_at: string;
  deadline?: string | null;
  last_synced_at: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  is_native_application?: boolean;
}

export interface JobFilterParams {
  q?: string;
  workplace_type?: WorkplaceType;
  employment_type?: EmploymentType;
  experience_level?: ExperienceLevel;
  location?: string;
  apply_type?: ApplyType;
  sort_by?: 'published_at_desc' | 'published_at_asc' | 'company_asc';
  page?: number;
  page_size?: number;
}

export interface JobFilterState {
  query: string;
  workplace_type: WorkplaceType;
  employment_type: string;
  experience_level: string;
  location: string;
  only_native_application: boolean;
  sort_by: 'published_desc' | 'company_asc' | 'title_asc';
}

export interface JobsResponse {
  items: JobPosting[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  sources: string[];
  freshness_policy: string;
}

export interface JobApplicationPayload {
  student_name?: string;
  email: string;
  phone?: string;
  hall_ticket?: string;
  degree?: string;
  graduation_year?: string | number;
  cgpa?: number;
  resume_url?: string;
  cover_note?: string;
  applicant_name?: string;
  degree_branch?: string;
  portfolio_url?: string;
}

export type ApplicationSubmission = JobApplicationPayload;

export interface JobApplicationResult {
  success?: boolean;
  message?: string;
  application_id: string;
  job_title: string;
  company: string;
  status: string;
  submitted_at: string;
}

export interface JobSyncStatus {
  active_jobs_count: number;
  active_fresh_jobs?: number;
  last_synced_at: string | null;
  last_sync_time?: string | null;
  sync_interval_hours: number;
  freshness_cutoff_days: number;
  is_syncing: boolean;
  scheduler_active: boolean;
  next_sync_in_seconds: number;
  next_scheduled_sync: string;
  recent_runs: {
    id: string;
    source_name: string;
    status: string;
    jobs_fetched: number;
    jobs_inserted: number;
    jobs_updated: number;
    jobs_expired: number;
    error_message?: string | null;
    started_at: string;
    completed_at: string;
  }[];
}
