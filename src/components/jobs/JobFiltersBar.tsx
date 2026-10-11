import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import type { JobFilterState } from '../../types/jobs';

interface JobFiltersBarProps {
  filters: JobFilterState;
  onChange: (filters: JobFilterState) => void;
  totalCount: number;
}

const WORKPLACE_OPTIONS: { id: JobFilterState['workplace_type']; label: string }[] = [
  { id: 'all', label: 'All Modes' },
  { id: 'remote', label: 'Remote' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'on_site', label: 'On-site' },
];

const EMPLOYMENT_OPTIONS = [
  { id: '', label: 'All Types' },
  { id: 'full-time', label: 'Full-time' },
  { id: 'internship', label: 'Internship' },
  { id: 'contract', label: 'Contract' },
  { id: 'part-time', label: 'Part-time' },
];

const EXPERIENCE_OPTIONS = [
  { id: '', label: 'All Levels' },
  { id: 'fresher', label: 'Fresher / Student' },
  { id: 'entry-level', label: 'Entry Level (0-2y)' },
  { id: 'mid-level', label: 'Mid Level (2-4y)' },
];

const SORT_OPTIONS: { id: JobFilterState['sort_by']; label: string }[] = [
  { id: 'published_desc', label: 'Newest Posted' },
  { id: 'company_asc', label: 'Company (A-Z)' },
  { id: 'title_asc', label: 'Title (A-Z)' },
];

export default function JobFiltersBar({
  filters,
  onChange,
  totalCount,
}: JobFiltersBarProps) {
  const isFiltered = Boolean(
    filters.query ||
    filters.workplace_type !== 'all' ||
    filters.employment_type ||
    filters.experience_level ||
    filters.only_native_application
  );

  const handleReset = () => {
    onChange({
      query: '',
      workplace_type: 'all',
      employment_type: '',
      experience_level: '',
      location: '',
      only_native_application: false,
      sort_by: 'published_desc',
    });
  };

  return (
    <div className="space-y-3">
      {/* Top Search & Primary Mode Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.query}
            onChange={e => onChange({ ...filters, query: e.target.value })}
            placeholder="Search roles, engineering skills, company names (e.g. Python, Frontend, TCS, Hyderabad)..."
            className="w-full bg-surface-card border border-border focus:border-accent rounded-lg pl-10 pr-9 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors shadow-xs"
          />
          {filters.query && (
            <button
              onClick={() => onChange({ ...filters, query: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Workplace Type Toggle Group */}
        <div className="flex items-center gap-1 p-1 bg-surface-subtle border border-border rounded-lg shrink-0">
          {WORKPLACE_OPTIONS.map(opt => {
            const active = filters.workplace_type === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ ...filters, workplace_type: opt.id })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  active
                    ? 'bg-surface-card text-accent font-semibold shadow-xs border border-border'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-text-muted mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px] uppercase tracking-wider">Filters:</span>
          </div>

          {/* Employment Type */}
          <select
            value={filters.employment_type}
            onChange={e => onChange({ ...filters, employment_type: e.target.value })}
            className="bg-surface-card border border-border hover:border-border-strong rounded-lg px-2.5 py-1.5 text-text-primary text-xs outline-none cursor-pointer transition-colors"
          >
            {EMPLOYMENT_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id} className="bg-surface-card text-text-primary">
                {opt.label}
              </option>
            ))}
          </select>

          {/* Experience Level */}
          <select
            value={filters.experience_level}
            onChange={e => onChange({ ...filters, experience_level: e.target.value })}
            className="bg-surface-card border border-border hover:border-border-strong rounded-lg px-2.5 py-1.5 text-text-primary text-xs outline-none cursor-pointer transition-colors"
          >
            {EXPERIENCE_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id} className="bg-surface-card text-text-primary">
                {opt.label}
              </option>
            ))}
          </select>

          {/* Only Direct Campus Applications Toggle */}
          <button
            type="button"
            onClick={() => onChange({ ...filters, only_native_application: !filters.only_native_application })}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              filters.only_native_application
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                : 'bg-surface-card border-border text-text-muted hover:text-text-primary'
            }`}
          >
            Direct Apply Only
          </button>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right side: Sorting & Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-text-muted">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={filters.sort_by}
              onChange={e => onChange({ ...filters, sort_by: e.target.value as JobFilterState['sort_by'] })}
              className="bg-surface-card border border-border rounded-lg px-2.5 py-1.5 text-text-primary text-xs outline-none cursor-pointer transition-colors"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id} className="bg-surface-card text-text-primary">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <span className="text-text-muted font-mono text-[11px]">
            {totalCount} {totalCount === 1 ? 'opening' : 'openings'}
          </span>
        </div>
      </div>
    </div>
  );
}
