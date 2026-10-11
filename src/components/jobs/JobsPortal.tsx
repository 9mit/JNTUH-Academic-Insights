import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Inbox,
  FilterX,
  Sparkles,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { useAcademic } from '../../context/AcademicContext';
import type {
  JobPosting,
  JobFilterState,
  JobSyncStatus,
  WorkplaceType,
  EmploymentType,
  ExperienceLevel,
} from '../../types/jobs';
import { fetchJobs, fetchSyncStatus, triggerJobsSync } from '../../api/jobsApi';
import JobCard from './JobCard';
import JobDetailModal from './JobDetailModal';
import JobApplicationModal from './JobApplicationModal';
import JobFiltersBar from './JobFiltersBar';

const INITIAL_FILTERS: JobFilterState = {
  query: '',
  workplace_type: 'all',
  employment_type: '',
  experience_level: '',
  location: '',
  only_native_application: false,
  sort_by: 'published_desc',
};

export default function JobsPortal() {
  const { data: academicData, getCGPA } = useAcademic();
  const { cgpa: studentCGPA } = getCGPA();
  const allSubjects = academicData.semesters.flatMap(s => s.subjects || []);
  const backlogsCount = allSubjects.filter(s => s.grade === 'F' || s.grade === 'Ab').length;

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [syncStatus, setSyncStatus] = useState<JobSyncStatus | null>(null);
  const [filters, setFilters] = useState<JobFilterState>(INITIAL_FILTERS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [applyingJob, setApplyingJob] = useState<JobPosting | null>(null);

  // Load jobs and sync telemetry
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [jobsData, statusData] = await Promise.all([
        fetchJobs({
          workplace_type: filters.workplace_type !== 'all' ? (filters.workplace_type as WorkplaceType) : undefined,
          employment_type: filters.employment_type ? (filters.employment_type as EmploymentType) : undefined,
          experience_level: filters.experience_level ? (filters.experience_level as ExperienceLevel) : undefined,
          apply_type: filters.only_native_application ? 'native' : undefined,
          page_size: 100,
        }),
        fetchSyncStatus(),
      ]);
      setJobs(jobsData.items || []);
      setSyncStatus(statusData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to job service.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [filters.workplace_type, filters.employment_type, filters.experience_level, filters.only_native_application]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle manual sync trigger
  const handleManualSync = async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      await triggerJobsSync();
      // Refresh status and listings
      const [updatedJobs, statusData] = await Promise.all([
        fetchJobs({ page_size: 100 }),
        fetchSyncStatus(),
      ]);
      setJobs(updatedJobs.items || []);
      setSyncStatus(statusData);
    } catch (err: unknown) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Client-side text search and sorting for instant response
  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];

    // Text search query
    if (filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      result = result.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        (j.tags && j.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Direct apply only
    if (filters.only_native_application) {
      result = result.filter(j => j.apply_type === 'native');
    }

    // Sorting
    result.sort((a, b) => {
      if (filters.sort_by === 'published_desc') {
        const timeA = new Date(a.published_at || a.created_at).getTime();
        const timeB = new Date(b.published_at || b.created_at).getTime();
        return timeB - timeA;
      }
      if (filters.sort_by === 'company_asc') {
        return a.company.localeCompare(b.company);
      }
      if (filters.sort_by === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [jobs, filters]);

  // Compute sync telemetry formatting
  const lastSyncLabel = useMemo(() => {
    const raw = syncStatus?.last_synced_at || syncStatus?.last_sync_time;
    if (!raw) return 'Active daemon';
    try {
      const d = new Date(raw);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return raw;
    }
  }, [syncStatus?.last_synced_at, syncStatus?.last_sync_time]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      {/* Editorial Header Section */}
      <div className="border-b border-border pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase text-text-muted bg-surface-subtle border border-border px-2 py-0.5 rounded">
                Portal
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                Verified &lt; 7-Day Freshness
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Jobs & Opportunities
            </h1>
            <p className="text-sm text-text-secondary max-w-2xl">
              Curated engineering openings, internships, and regional campus drives for students and new graduates. Synchronized continuously every 3 hours from verified, permitted feeds.
            </p>
          </div>

          {/* Sync Telemetry Badge & Refresh Action */}
          <div className="flex items-center gap-2.5 bg-surface-card border border-border rounded-lg p-2.5 shrink-0 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-text-primary font-medium">
                  <Clock className="w-3 h-3 text-text-muted" />
                  <span>Last synced: {lastSyncLabel}</span>
                </div>
                <div className="text-[11px] text-text-muted font-mono">
                  Auto-sync every 3h • {syncStatus?.active_jobs_count ?? jobs.length} fresh listings
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Trigger instant feed synchronization"
              className="ml-2 p-1.5 text-text-muted hover:text-text-primary bg-surface-subtle hover:bg-surface-card border border-border rounded-md transition-colors disabled:opacity-50 cursor-pointer"
              aria-label="Refresh job feeds"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-accent' : ''}`} />
            </button>
          </div>
        </div>

        {/* Freshness Policy Notice */}
        <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary bg-surface-subtle px-1.5 py-0.5 rounded border border-border">
              Freshness Policy
            </span>
            <span>
              All listings older than 7 days based on original publisher timestamps are automatically pruned.
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Sources: Remotive • WeWorkRemotely • Campus Partners</span>
          </div>
        </div>
      </div>

      {/* Student Career Eligibility Matcher Banner */}
      {academicData.hallTicket && (
        <div className="card p-4 border border-border bg-surface-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-subtle border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-text-primary font-bold">{academicData.hallTicket}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[11px] font-semibold">
                  CGPA {studentCGPA.toFixed(2)}
                </span>
                {backlogsCount === 0 ? (
                  <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> All Cleared
                  </span>
                ) : (
                  <span className="text-amber-800 font-medium text-[11px]">
                    {backlogsCount} Backlog(s) Pending
                  </span>
                )}
              </div>
              <p className="text-text-muted mt-0.5 text-[11px]">
                {backlogsCount === 0
                  ? 'Eligible for all Tier-1 MNC hiring drives (TCS, Infosys, Cognizant, Product Startups).'
                  : 'Clear pending courses to unlock full campus drive eligibility (minimum 0-backlog criterion).'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-sans">
            <button
              type="button"
              onClick={() => { window.location.hash = '#/notes'; }}
              className="px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-card border border-border text-text-primary text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <BookOpen className="w-3 h-3 text-accent" />
              <span>Campus Prep Notes</span>
            </button>
          </div>
        </div>
      )}

      {/* Filters & Facets */}
      <JobFiltersBar
        filters={filters}
        onChange={setFilters}
        totalCount={filteredAndSortedJobs.length}
      />

      {/* Content State Handling */}
      {isLoading ? (
        /* Loading skeleton */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="p-5 rounded-lg border border-border bg-surface-card/40 space-y-4 animate-pulse"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-3/4">
                  <div className="h-4 bg-surface-subtle rounded w-4/5" />
                  <div className="h-3 bg-surface-subtle rounded w-1/2" />
                </div>
                <div className="w-10 h-10 bg-surface-subtle rounded-lg" />
              </div>
              <div className="h-10 bg-surface-subtle rounded w-full" />
              <div className="flex gap-2">
                <div className="h-5 bg-surface-subtle rounded w-16" />
                <div className="h-5 bg-surface-subtle rounded w-20" />
              </div>
              <div className="h-8 bg-surface-subtle rounded w-full pt-2" />
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="p-8 border border-rose-200 bg-rose-50 rounded-lg text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-semibold text-text-primary">Unable to load job opportunities</h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="btn-secondary text-xs py-2 px-4 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredAndSortedJobs.length === 0 ? (
        /* Empty State */
        <div className="p-12 border border-border bg-surface-card rounded-lg text-center space-y-3">
          <Inbox className="w-10 h-10 text-text-muted mx-auto" />
          <h3 className="text-base font-semibold text-text-primary">No active opportunities match your filters</h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Try adjusting your search query, switching work modes, or clearing active filters to see all available openings.
          </p>
          <button
            type="button"
            onClick={() => setFilters(INITIAL_FILTERS)}
            className="btn-secondary text-xs py-2 px-4 inline-flex items-center gap-1.5 cursor-pointer mx-auto"
          >
            <FilterX className="w-3.5 h-3.5" />
            Clear All Filters
          </button>
        </div>
      ) : (
        /* Active Job Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {filteredAndSortedJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onSelect={setSelectedJob}
              onApplyNative={(j: JobPosting) => setApplyingJob(j)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <JobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onApplyNative={(j: JobPosting) => {
          setSelectedJob(null);
          setApplyingJob(j);
        }}
      />

      {/* Native Application Submission Modal */}
      <JobApplicationModal
        job={applyingJob}
        isOpen={Boolean(applyingJob)}
        onClose={() => setApplyingJob(null)}
        onSuccess={() => {
          // Refresh list or state if needed
        }}
      />
    </div>
  );
}
