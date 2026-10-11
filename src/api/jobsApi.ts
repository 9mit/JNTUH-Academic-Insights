import type {
  JobPosting,
  JobFilterParams,
  JobsResponse,
  JobApplicationPayload,
  JobApplicationResult,
  JobSyncStatus,
} from '../types/jobs';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchJobs(params: JobFilterParams = {}): Promise<JobsResponse> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.workplace_type && params.workplace_type !== 'all') query.set('workplace_type', params.workplace_type);
  if (params.employment_type && params.employment_type !== 'all') query.set('employment_type', params.employment_type);
  if (params.experience_level && params.experience_level !== 'all') query.set('experience_level', params.experience_level);
  if (params.apply_type && params.apply_type !== 'all') query.set('apply_type', params.apply_type);
  if (params.location) query.set('location', params.location);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));

  const url = `${API_BASE}/api/jobs?${query.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load opportunities (${response.status})`);
  }
  return response.json();
}

export async function fetchJobById(jobId: string): Promise<JobPosting> {
  const url = `${API_BASE}/api/jobs/${encodeURIComponent(jobId)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Job listing not found or expired (${response.status})`);
  }
  return response.json();
}

export async function submitJobApplication(
  jobId: string,
  payload: JobApplicationPayload
): Promise<JobApplicationResult> {
  const url = `${API_BASE}/api/jobs/${encodeURIComponent(jobId)}/apply`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Application submission failed. Please verify your details.');
  }
  return data;
}

export async function fetchJobSyncStatus(): Promise<JobSyncStatus> {
  const url = `${API_BASE}/api/jobs/sync-status`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to check sync status (${response.status})`);
  }
  return response.json();
}

export async function triggerJobSync(): Promise<{ status: string; message?: string }> {
  const url = `${API_BASE}/api/jobs/sync`;
  const response = await fetch(url, { method: 'POST' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || data.message || 'Manual synchronization failed');
  }
  return data;
}

export const fetchSyncStatus = fetchJobSyncStatus;
export const triggerJobsSync = triggerJobSync;
