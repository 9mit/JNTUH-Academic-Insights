import { useState, useMemo } from 'react';
import {
  History,
  CheckCircle2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import type { Subject } from '../types';

export default function AllAttemptsAudit() {
  const { data } = useAcademic();
  const [filter, setFilter] = useState<'all' | 'multiple' | 'first_pass' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Extract all attempts or fallback to semester subjects
  const allAttempts = useMemo(() => {
    if (data.allAttempts && data.allAttempts.length > 0) {
      return data.allAttempts;
    }
    return data.semesters.flatMap(s => s.subjects);
  }, [data.allAttempts, data.semesters]);

  // Group attempts by subject code or normalized name
  const groupedSubjects = useMemo(() => {
    const map = new Map<string, { code: string; name: string; attempts: Subject[] }>();

    for (const sub of allAttempts) {
      const key = (sub.code || sub.name || '').trim().toUpperCase();
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          code: sub.code || '—',
          name: sub.name || 'Subject',
          attempts: [],
        });
      }
      map.get(key)!.attempts.push(sub);
    }

    // Sort each subject's attempts chronologically if exam codes exist
    const list = Array.from(map.values()).map(item => {
      const attempts = [...item.attempts];
      const hasPass = attempts.some(a => a.grade !== 'F' && a.grade !== 'Ab');
      const isMultiple = attempts.length > 1;
      const isPending = !hasPass;
      const isFirstPass = attempts.length === 1 && hasPass;

      return {
        ...item,
        attempts,
        hasPass,
        isMultiple,
        isPending,
        isFirstPass,
      };
    });

    return list;
  }, [allAttempts]);

  // Filtered list
  const filteredList = useMemo(() => {
    return groupedSubjects.filter(item => {
      if (filter === 'multiple' && !item.isMultiple) return false;
      if (filter === 'first_pass' && !item.isFirstPass) return false;
      if (filter === 'pending' && !item.isPending) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [groupedSubjects, filter, searchTerm]);

  const multipleCount = groupedSubjects.filter(s => s.isMultiple).length;

  return (
    <div className="card p-6 border border-border space-y-5 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-surface-subtle border border-border text-accent">
              Audit Engine
            </span>
            <span className="text-xs font-mono text-text-muted">
              {allAttempts.length} total exam records logged
            </span>
          </div>
          <h3 className="text-base font-bold text-text-primary tracking-tight mt-1 flex items-center gap-2">
            <History className="w-4 h-4 text-accent" />
            Complete Exam Attempt History
          </h3>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search course code or title…"
            className="w-full bg-surface-subtle border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filter === 'all'
              ? 'bg-accent-subtle text-accent font-semibold border border-accent/20'
              : 'bg-surface-subtle border border-border text-text-muted hover:text-text-primary'
          }`}
        >
          All Courses ({groupedSubjects.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('multiple')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filter === 'multiple'
              ? 'bg-amber-50 text-amber-800 font-semibold border border-amber-200'
              : 'bg-surface-subtle border border-border text-text-muted hover:text-text-primary'
          }`}
        >
          Multiple Attempts ({multipleCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filter === 'pending'
              ? 'bg-rose-50 text-rose-800 font-semibold border border-rose-200'
              : 'bg-surface-subtle border border-border text-text-muted hover:text-text-primary'
          }`}
        >
          Currently Pending
        </button>
      </div>

      {/* Attempt Rows */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted font-mono border border-dashed border-border rounded-lg">
            No courses match the active attempt filter.
          </div>
        ) : (
          filteredList.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-surface-subtle border border-border hover:border-border-strong transition-all space-y-3"
            >
              {/* Course Title Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-accent">{item.code}</span>
                    <span className="text-xs font-semibold text-text-primary truncate">{item.name}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {item.isMultiple && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200">
                      {item.attempts.length} Attempts
                    </span>
                  )}
                  {item.hasPass ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cleared
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-600" /> Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Attempts Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 border-t border-border">
                {item.attempts.map((att, aIdx) => {
                  const isFail = att.grade === 'F' || att.grade === 'Ab';
                  return (
                    <div
                      key={aIdx}
                      className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                        isFail
                          ? 'bg-rose-50/70 border-rose-200 text-rose-800'
                          : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] text-text-muted block">
                          Attempt #{aIdx + 1} {att.examCode ? `· ${att.examCode}` : ''}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          Int: {att.internal ?? '—'} · Ext: {att.external ?? '—'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold block">{att.grade}</span>
                        {att.total !== undefined && (
                          <span className="text-[10px] text-text-muted">{att.total} marks</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
