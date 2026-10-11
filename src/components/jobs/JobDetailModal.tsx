import { useEffect } from 'react';
import {
  X,
  MapPin,
  ExternalLink,
  Send,
  Building2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import type { JobPosting } from '../../types/jobs';
import CompanyLogo from './CompanyLogo';

interface JobDetailModalProps {
  job: JobPosting | null;
  onClose: () => void;
  onApplyNative: (job: JobPosting) => void;
}

export function JobDetailModal({ job, onClose, onApplyNative }: JobDetailModalProps) {
  useEffect(() => {
    if (!job) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [job, onClose]);

  if (!job) return null;

  const isNative = job.apply_type === 'native';
  const pubDateFormatted = new Date(job.published_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const syncDateFormatted = new Date(job.last_synced_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-surface-card border border-border-strong shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-border bg-surface-subtle shrink-0">
          <div className="flex items-start gap-3.5 min-w-0">
            <CompanyLogo
              company={job.company}
              logoUrl={job.company_logo_url}
              size="lg"
            />

            <div className="min-w-0">
              <span className="text-xs text-text-muted flex items-center gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-text-muted shrink-0" />
                {job.company}
              </span>
              <h2 id="job-detail-title" className="text-lg font-bold text-text-primary mt-0.5 leading-snug">
                {job.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-text-muted mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-text-muted" />
                  {job.location}
                </span>
                <span>·</span>
                <span className="capitalize">{job.workplace_type}</span>
                <span>·</span>
                <span className="capitalize">{job.employment_type.replace('_', ' ')}</span>
                {job.salary && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-amber-800 font-semibold">{job.salary}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-subtle transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Freshness & Source Transparency Banner */}
          <div className="p-3.5 rounded-md bg-surface-subtle border border-border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-text-secondary">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Verified Fresh: Originally posted on <strong className="text-text-primary font-mono">{pubDateFormatted}</strong>
              </span>
            </div>
            <span className="text-[11px] text-text-muted font-mono">
              Last synchronized: {syncDateFormatted}
            </span>
          </div>

          {/* Tags */}
          {job.tags && job.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                Required Competencies & Skills
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-mono px-2.5 py-1 rounded bg-surface-subtle text-text-secondary border border-border"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Job Description */}
          <div>
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5">
              Role Overview & Responsibilities
            </h4>
            <div className="text-sm text-text-secondary leading-relaxed space-y-3 whitespace-pre-line bg-surface-card p-4 rounded-md border border-border">
              {job.description || 'No extended description provided by source.'}
            </div>
          </div>

          {/* Application Process Guidelines */}
          <div className="p-4 rounded-md border border-border-subtle bg-surface-subtle text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-text-primary">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
              <span>
                {isNative ? 'Direct Campus Partner Opportunity' : 'External Application Portal'}
              </span>
            </div>
            <p className="text-text-muted leading-relaxed">
              {isNative
                ? 'This position supports direct campus submission. Your profile, verified hall ticket, and academic standing will be securely routed directly to the employer.'
                : 'This employer accepts applications directly through its official career website. Clicking Apply will open the canonical posting in a secure new tab.'}
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-border bg-surface-subtle flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4"
          >
            Close
          </button>

          {isNative ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onApplyNative(job);
              }}
              className="btn-primary text-xs py-2 px-5 flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Apply Directly on Platform</span>
            </button>
          ) : (
            <a
              href={job.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs py-2 px-5 flex items-center gap-2 shadow-xs"
            >
              <span>Apply on Company Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobDetailModal;
