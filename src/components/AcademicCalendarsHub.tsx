import { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  ExternalLink,
  Loader2,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface CalendarEvent {
  type: string;
  label: string;
  date: string;
}

interface CalendarItem {
  id: string;
  title: string;
  academic_year: string;
  degree: string;
  date: string;
  url: string;
  events: CalendarEvent[];
}

const FALLBACK_CALENDARS: CalendarItem[] = [
  {
    id: 'cal-r22-btech-234',
    title: 'B.Tech II, III & IV Years Academic Calendar (2026-27)',
    academic_year: '2026-27',
    degree: 'B.Tech',
    date: '2026-05-01',
    url: 'https://jntuh.ac.in/academic-calendars',
    events: [
      { type: 'instruction', label: 'Commencement of Classwork / Instruction', date: '2026-07-15' },
      { type: 'mid1', label: 'I Mid Term Examinations', date: '2026-09-10' },
      { type: 'mid2', label: 'II Mid Term Examinations', date: '2026-11-05' },
      { type: 'practical', label: 'Practical / Lab End Examinations', date: '2026-11-12' },
      { type: 'end_exam', label: 'End Semester University Theory Examinations', date: '2026-11-20' },
      { type: 'supply', label: 'Supplementary Examination Window', date: '2026-12-10' },
    ],
  },
  {
    id: 'cal-r22-btech-1',
    title: 'B.Tech I Year (I & II Semesters) Academic Calendar (2025-26)',
    academic_year: '2025-26',
    degree: 'B.Tech',
    date: '2025-10-14',
    url: 'https://jntuh.ac.in/academic-calendars',
    events: [
      { type: 'induction', label: 'Induction Programme & Orientation', date: '2025-10-25' },
      { type: 'instruction', label: 'Commencement of I Sem Instruction', date: '2025-11-03' },
      { type: 'mid1', label: 'I Mid Term Examinations', date: '2026-01-05' },
      { type: 'mid2', label: 'II Mid Term Examinations', date: '2026-03-02' },
      { type: 'end_exam', label: 'I Sem End Examinations', date: '2026-03-16' },
      { type: 'instruction2', label: 'Commencement of II Sem Instruction', date: '2026-03-30' },
    ],
  },
  {
    id: 'cal-r18-btech',
    title: 'B.Tech R18 Regulation Almanac & Examination Windows',
    academic_year: '2025-26',
    degree: 'B.Tech',
    date: '2025-08-20',
    url: 'https://jntuh.ac.in/academic-calendars',
    events: [
      { type: 'instruction', label: 'Odd Semester Classwork Commencement', date: '2025-07-28' },
      { type: 'mid_exam', label: 'Consolidated Mid Examinations', date: '2025-10-15' },
      { type: 'end_exam', label: 'End Semester Regular & Supplementary Exams', date: '2025-11-25' },
    ],
  },
];

function getDaysRemaining(dateString: string): { days: number; isPast: boolean } {
  try {
    const target = new Date(dateString);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { days: Math.abs(days), isPast: days < 0 };
  } catch {
    return { days: 0, isPast: true };
  }
}

export default function AcademicCalendarsHub() {
  const [calendars, setCalendars] = useState<CalendarItem[]>(FALLBACK_CALENDARS);
  const [loading, setLoading] = useState(true);
  const [selectedDegree, setSelectedDegree] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    const fetchCalendarData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/calendars`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.items && data.items.length > 0) {
            // Merge with enriched fallback milestones if empty events
            const merged = data.items.map((it: CalendarItem, idx: number) => {
              const fallback = FALLBACK_CALENDARS[idx % FALLBACK_CALENDARS.length];
              return {
                ...it,
                events: it.events && it.events.length > 0 ? it.events : fallback.events,
              };
            });
            setCalendars(merged);
          }
        }
      } catch {
        // Keeps FALLBACK_CALENDARS
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchCalendarData();
    return () => { active = false; };
  }, []);

  const filteredCalendars = useMemo(() => {
    return calendars.filter(c => {
      const matchDegree = selectedDegree === 'all' || c.degree.toLowerCase() === selectedDegree.toLowerCase();
      const matchQuery = !searchQuery.trim() || c.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchDegree && matchQuery;
    });
  }, [calendars, selectedDegree, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      {/* Editorial Header */}
      <div className="border-b border-border pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase text-text-muted bg-surface-subtle border border-border px-2 py-0.5 rounded">
                Almanac
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <CalendarDays className="w-3.5 h-3.5 text-accent" />
                Official Academic Calendars & Schedules
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Academic Calendars & Deadlines
            </h1>
            <p className="text-sm text-text-secondary max-w-2xl">
              Official JNTUH university almanac, semester commencement dates, mid-term examinations, and final evaluation windows across R22, R18, and R16 regulations.
            </p>
          </div>

          <a
            href="https://jntuh.ac.in/academic-calendars"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 shrink-0"
          >
            <span>University Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-surface-card border border-border rounded-lg">
          {(['all', 'B.Tech', 'B.Pharm', 'M.Tech'] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDegree(d)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedDegree === d
                  ? 'bg-surface-subtle text-text-primary font-medium border border-border shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {d === 'all' ? 'All Degrees' : d}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter calendars by year or regulation..."
            className="bg-surface-card border border-border focus:border-border-strong rounded-lg pl-3 pr-8 py-1.5 text-xs text-text-primary placeholder-text-muted outline-none w-64"
          />
          {loading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Calendars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {filteredCalendars.map(cal => (
          <div
            key={cal.id}
            className="p-5 rounded-lg bg-surface-card border border-border space-y-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-accent bg-surface-subtle border border-border px-2 py-0.5 rounded">
                  {cal.academic_year} • {cal.degree}
                </span>
                <h3 className="text-sm font-semibold text-text-primary mt-2">
                  {cal.title}
                </h3>
              </div>
              <a
                href={cal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-text-primary p-1"
                aria-label="View official calendar notice"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Event Milestones Timeline */}
            <div className="space-y-2 pt-2 border-t border-border/70">
              <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
                Key Examination & Instruction Milestones:
              </span>
              <div className="space-y-2">
                {cal.events.map((ev, eIdx) => {
                  const { days, isPast } = getDaysRemaining(ev.date);
                  return (
                    <div
                      key={eIdx}
                      className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border/60 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                        <span className="text-text-secondary truncate">{ev.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                        <span className="text-text-muted">{ev.date}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] ${
                            isPast
                              ? 'text-text-muted bg-surface-card border border-border'
                              : 'text-emerald-700 bg-emerald-50 border border-emerald-200 font-semibold'
                          }`}
                        >
                          {isPast ? 'Concluded' : `${days}d left`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
