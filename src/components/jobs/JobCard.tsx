import { memo } from 'react';
import {
  MapPin,
  Clock,
  ExternalLink,
  Send,
  Building2,
  Sparkles,
} from 'lucide-react';
import type { JobPosting } from '../../types/jobs';
import CompanyLogo from './CompanyLogo';

interface JobCardProps {
  job: JobPosting;
  onSelect: (job: JobPosting) => void;
  onApplyNative: (job: JobPosting) => void;
}

function formatRelativeTime(isoString: string): string {
  try {
    const pub = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - pub.getTime()) / 1000);

    if (diffSec < 3600) {
      const mins = Math.max(1, Math.floor(diffSec / 60));
      return `${mins}m ago`;
    }
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours}h ago`;
    }
    const days = Math.floor(diffSec / 86400);
    return `${days}d ago`;
  } catch {
    return 'Recent';
  }
}

function formatWorkplace(val: string): string {
  switch (val) {
    case 'remote': return 'Remote';
    case 'hybrid': return 'Hybrid';
    case 'on_site': return 'On-site';
    default: return val;
  }
}

function formatEmployment(val: string): string {
  switch (val) {
    case 'full_time': return 'Full-time';
    case 'internship': return 'Internship';
    case 'part_time': return 'Part-time';
    case 'contract': return 'Contract';
    default: return val;
  }
}

function formatExperience(val: string): string {
  switch (val) {
    case 'entry_level': return 'Entry Level';
    case 'intern': return 'Student / Intern';
    case 'mid_level': return 'Mid Level';
    default: return 'All Levels';
  }
}

export const JobCard = memo(function JobCard({ job, onSelect, onApplyNative }: JobCardProps) {
  const relativePosted = formatRelativeTime(job.published_at);
  const isNative = job.apply_type === 'native';

  return (
    <article
      onClick={() => onSelect(job)}
      className="group relative flex flex-col justify-between p-5 rounded-lg bg-surface-card hover:bg-surface-subtle border border-border hover:border-border-strong transition-all cursor-pointer shadow-xs"
    >
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Company Avatar / Logo */}
            <CompanyLogo
              company={job.company}
              logoUrl={job.company_logo_url}
              size="md"
            />

            <div className="min-w-0">
              <h4 className="text-xs font-medium text-text-muted truncate flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-text-muted shrink-0" />
                <span className="truncate">{job.company}</span>
              </h4>
              <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-1 mt-0.5">
                {job.title}
              </h3>
            </div>
          </div>

          {/* Freshness & Posting Age Chip */}
          <div className="flex flex-col items-end shrink-0">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded"
              title={`Original verified publication: ${new Date(job.published_at).toLocaleString()}`}
            >
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>{relativePosted}</span>
            </span>
          </div>
        </div>

        {/* Location & Key Facets */}
        <div className="flex items-center gap-3 text-xs text-text-secondary mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span className="truncate max-w-[180px]">{job.location}</span>
          </span>
          <span>·</span>
          <span>{formatWorkplace(job.workplace_type)}</span>
          <span>·</span>
          <span>{formatEmployment(job.employment_type)}</span>
        </div>

        {/* Tags Row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-subtle text-text-secondary border border-border">
            {formatExperience(job.experience_level)}
          </span>

          {job.salary && (
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              {job.salary}
            </span>
          )}

          {job.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-subtle text-text-muted border border-border"
            >
              #{tag}
            </span>
          ))}

          {isNative && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-accent-subtle text-accent border border-accent/25">
              <Sparkles className="w-2.5 h-2.5" />
              Direct Campus Drive
            </span>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3 border-t border-border flex items-center justify-between gap-3 text-xs">
        <span className="text-[11px] text-text-muted">
          Via <strong className="text-text-secondary font-medium">{job.source_name}</strong>
        </span>

        <div className="flex items-center gap-2">
          {isNative ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onApplyNative(job);
              }}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send className="w-3 h-3" />
              <span>Quick Apply</span>
            </button>
          ) : (
            <a
              href={job.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer group-hover:border-accent/40"
            >
              <span>Apply on Site</span>
              <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
});

export default JobCard;
