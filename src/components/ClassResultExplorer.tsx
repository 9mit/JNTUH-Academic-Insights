import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  ArrowRight,
  Trophy,
  Loader2,
  Download,
  BarChart3,
} from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import type { Regulation } from '../types';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface ClassStudentItem {
  htno: string;
  student_name: string | null;
  cgpa: number;
  percentage: number;
  earned_credits: number;
  backlogs_count: number;
  total_subjects: number;
  semesters_count: number;
  status: 'success' | 'not_found';
  error?: string;
}

export default function ClassResultExplorer({
  onSelectStudent,
}: {
  onSelectStudent?: (htno: string) => void;
}) {
  const { data: currentData } = useAcademic();

  // Parse prefix from existing session if available
  const defaultPrefix = useMemo(() => {
    if (currentData.hallTicket && currentData.hallTicket.length === 10) {
      return currentData.hallTicket.slice(0, 8);
    }
    return '21071A05';
  }, [currentData.hallTicket]);

  const [prefix, setPrefix] = useState(defaultPrefix);
  const [startRoll, setStartRoll] = useState(1);
  const [endRoll, setEndRoll] = useState(35);
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation>(currentData.regulation || 'R22');

  // Execution state
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<ClassStudentItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTier, setActiveTier] = useState<'all' | 'distinction' | 'cleared' | 'backlogs'>('all');

  const handleBatchAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrefix = prefix.trim().toUpperCase();
    if (cleanPrefix.length !== 8) {
      toast.error('Prefix must be exactly 8 characters (e.g. 21071A05)');
      return;
    }

    if (startRoll < 1 || endRoll < startRoll || endRoll - startRoll > 75) {
      toast.error('Range must be between 1 and 70 roll numbers per batch.');
      return;
    }

    // Generate roll numbers
    const rollList: string[] = [];
    for (let i = startRoll; i <= endRoll; i++) {
      // 2-digit format or alphanumeric roll
      const rollStr = i < 10 ? `0${i}` : `${i}`;
      rollList.push(`${cleanPrefix}${rollStr}`);
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/fetch/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htnos: rollList,
          regulation: selectedRegulation,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Batch analysis request failed.');
      }

      const data = await res.json();
      const validItems: ClassStudentItem[] = (data.items || []).filter(
        (it: ClassStudentItem) => it.status === 'success'
      );

      if (validItems.length === 0) {
        toast.error('No student results found for this roll number range.');
      } else {
        // Sort descending by CGPA
        validItems.sort((a, b) => b.cgpa - a.cgpa);
        setStudents(validItems);
        toast.success(`Analyzed ${validItems.length} active students in section!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Batch analysis failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Class analytics computations
  const analytics = useMemo(() => {
    if (students.length === 0) return null;

    const total = students.length;
    const allCleared = students.filter(s => s.backlogs_count === 0).length;
    const passPercentage = Number(((allCleared / total) * 100).toFixed(1));
    const avgCGPA = Number(
      (students.reduce((sum, s) => sum + s.cgpa, 0) / total).toFixed(2)
    );
    const topper = students[0];

    const distinctionCount = students.filter(s => s.cgpa >= 7.75).length;
    const firstClassCount = students.filter(s => s.cgpa >= 6.75 && s.cgpa < 7.75).length;
    const secondClassCount = students.filter(s => s.cgpa >= 5.75 && s.cgpa < 6.75).length;

    return {
      total,
      allCleared,
      passPercentage,
      avgCGPA,
      topper,
      distinctionCount,
      firstClassCount,
      secondClassCount,
    };
  }, [students]);

  // Filtered leaderboard
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Tier filter
      if (activeTier === 'distinction' && s.cgpa < 7.75) return false;
      if (activeTier === 'cleared' && s.backlogs_count > 0) return false;
      if (activeTier === 'backlogs' && s.backlogs_count === 0) return false;

      // Text query
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matchHtno = s.htno.toLowerCase().includes(q);
        const matchName = s.student_name ? s.student_name.toLowerCase().includes(q) : false;
        return matchHtno || matchName;
      }
      return true;
    });
  }, [students, activeTier, searchFilter]);

  const handleExportCSV = () => {
    if (students.length === 0) return;
    const headers = ['Rank', 'Hall Ticket', 'Name', 'CGPA', 'Percentage', 'Earned Credits', 'Backlogs'];
    const rows = students.map((s, idx) => [
      idx + 1,
      s.htno,
      `"${s.student_name || 'N/A'}"`,
      s.cgpa,
      s.percentage,
      s.earned_credits,
      s.backlogs_count,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Class_Results_${prefix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Leaderboard exported to CSV!');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      {/* Editorial Header */}
      <div className="border-b border-border pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase text-text-muted bg-surface-subtle border border-border px-2 py-0.5 rounded">
                Section Intelligence
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <Trophy className="w-3.5 h-3.5 text-accent" />
                Class Rank & Batch Performance Leaderboard
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Class & Batch Leaderboard
            </h1>
            <p className="text-sm text-text-secondary max-w-2xl">
              Inspect an entire college branch section at once. Benchmark your rank within the class, review section pass percentage, and inspect top performers across JNTUH schemes.
            </p>
          </div>
        </div>
      </div>

      {/* Batch Setup Form */}
      <form
        onSubmit={handleBatchAnalyze}
        className="p-5 rounded-lg bg-surface-card border border-border space-y-4 shadow-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Prefix */}
          <div className="space-y-1.5">
            <label className="font-medium text-text-secondary">
              Roll Prefix (8 chars)
            </label>
            <input
              type="text"
              required
              maxLength={8}
              value={prefix}
              onChange={e => setPrefix(e.target.value.toUpperCase())}
              placeholder="e.g. 21071A05"
              className="w-full bg-surface-subtle border border-border focus:border-border-strong rounded-lg px-3 py-2 text-sm text-text-primary font-mono outline-none"
            />
            <p className="text-[10px] text-text-muted font-mono">College + Degree + Branch</p>
          </div>

          {/* Roll Range */}
          <div className="space-y-1.5">
            <label className="font-medium text-text-secondary">
              Roll Number Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={99}
                value={startRoll}
                onChange={e => setStartRoll(parseInt(e.target.value) || 1)}
                className="w-full bg-surface-subtle border border-border focus:border-border-strong rounded-lg px-3 py-2 text-sm text-text-primary font-mono outline-none text-center"
              />
              <span className="text-text-muted">to</span>
              <input
                type="number"
                min={1}
                max={99}
                value={endRoll}
                onChange={e => setEndRoll(parseInt(e.target.value) || 60)}
                className="w-full bg-surface-subtle border border-border focus:border-border-strong rounded-lg px-3 py-2 text-sm text-text-primary font-mono outline-none text-center"
              />
            </div>
            <p className="text-[10px] text-text-muted font-mono">Max 70 rolls per run</p>
          </div>

          {/* Regulation */}
          <div className="space-y-1.5">
            <label className="font-medium text-text-secondary">
              Academic Scheme
            </label>
            <select
              value={selectedRegulation}
              onChange={e => setSelectedRegulation(e.target.value as Regulation)}
              className="w-full bg-surface-subtle border border-border focus:border-border-strong rounded-lg px-3 py-2 text-sm text-text-primary font-mono outline-none cursor-pointer"
            >
              {['R22', 'R18', 'R16', 'R15'].map(r => (
                <option key={r} value={r}>
                  {r} Scheme
                </option>
              ))}
            </select>
          </div>

          {/* Submit Trigger */}
          <div className="flex flex-col justify-end space-y-1.5">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 px-4 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning Class...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Analyze Section</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section Presets */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1 border-t border-border/50 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-text-muted font-mono">Quick section presets:</span>
            {currentData.hallTicket && currentData.hallTicket.length === 10 && (
              <button
                type="button"
                onClick={() => {
                  setPrefix(currentData.hallTicket!.slice(0, 8));
                  setStartRoll(1);
                  setEndRoll(60);
                  if (currentData.regulation) setSelectedRegulation(currentData.regulation);
                }}
                className="px-2.5 py-0.5 rounded bg-accent/15 hover:bg-accent/25 border border-accent/30 text-[11px] font-mono text-accent font-semibold transition-colors cursor-pointer"
              >
                ⚡ My Section ({currentData.hallTicket.slice(0, 8)}01-60)
              </button>
            )}
            {[
              { p: '21071A05', s: 1, e: 35, r: 'R22' as Regulation, label: 'JNTUH CEH CSE' },
              { p: '21071A04', s: 1, e: 35, r: 'R22' as Regulation, label: 'JNTUH CEH ECE' },
              { p: '20B91A05', s: 1, e: 35, r: 'R18' as Regulation, label: 'VNR VJIET CSE' },
              { p: '21241A05', s: 1, e: 35, r: 'R22' as Regulation, label: 'GRIET CSE' },
            ].map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setPrefix(preset.p);
                  setStartRoll(preset.s);
                  setEndRoll(preset.e);
                  setSelectedRegulation(preset.r);
                }}
                className="px-2 py-0.5 rounded bg-surface-subtle hover:bg-surface-card border border-border text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <span className="text-[10px] text-text-muted font-mono">
            Fast ~100ms multi-roll batch engine
          </span>
        </div>
      </form>

      {/* Empty State Guided Overview */}
      {!analytics && !loading && (
        <div className="p-8 rounded-lg bg-surface-card border border-border/80 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-surface-subtle border border-border mx-auto flex items-center justify-center">
            <Trophy className="w-6 h-6 text-accent" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-semibold text-text-primary">
              Section Rank & Batch Performance Leaderboard
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Load an entire section to benchmark students by cumulative GPA, calculate the exact section pass percentage, detect branch toppers, and download formatted CSV grade registers.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left pt-2">
            <div className="p-3 rounded-lg bg-surface-subtle border border-border/60 space-y-1">
              <span className="text-[10px] font-mono text-accent uppercase font-bold">1. Rank Table</span>
              <p className="text-xs text-text-secondary">Class rankings with CGPA, %, earned credits, and backlogs count.</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-subtle border border-border/60 space-y-1">
              <span className="text-[10px] font-mono text-emerald-700 uppercase font-bold">2. Pass Metrics</span>
              <p className="text-xs text-text-secondary">Section mean CGPA, 0-backlog clear rate, and distinction counts.</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-subtle border border-border/60 space-y-1">
              <span className="text-[10px] font-mono text-amber-700 uppercase font-bold">3. Export CSV</span>
              <p className="text-xs text-text-secondary">1-click CSV export ready for section faculty & departmental reporting.</p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="space-y-6 pt-2">
          {/* Executive Stat Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Class Rank #1 */}
            <div className="p-4 rounded-lg bg-surface-card border border-border space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Trophy className="w-3 h-3 text-amber-600" />
                Branch Topper
              </span>
              <div className="text-xl font-bold font-mono text-amber-700">
                {analytics.topper.cgpa.toFixed(2)} CGPA
              </div>
              <p className="text-[11px] font-mono text-text-secondary truncate">
                {analytics.topper.student_name || analytics.topper.htno}
              </p>
            </div>

            {/* Class Average */}
            <div className="p-4 rounded-lg bg-surface-card border border-border space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                Class Mean CGPA
              </span>
              <div className="text-xl font-bold font-mono text-text-primary">
                {analytics.avgCGPA.toFixed(2)}
              </div>
              <p className="text-[11px] text-text-muted">
                Across {analytics.total} student records
              </p>
            </div>

            {/* Section Pass Percentage */}
            <div className="p-4 rounded-lg bg-surface-card border border-border space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                Section Pass Rate
              </span>
              <div className="text-xl font-bold font-mono text-emerald-700">
                {analytics.passPercentage}%
              </div>
              <p className="text-[11px] text-text-muted">
                {analytics.allCleared}/{analytics.total} with 0 backlogs
              </p>
            </div>

            {/* Distinction Count */}
            <div className="p-4 rounded-lg bg-surface-card border border-border space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                Distinction (≥ 7.75)
              </span>
              <div className="text-xl font-bold font-mono text-accent">
                {analytics.distinctionCount} students
              </div>
              <p className="text-[11px] text-text-muted">
                First Class: {analytics.firstClassCount}
              </p>
            </div>
          </div>

          {/* Leaderboard Table Section */}
          <div className="p-5 rounded-lg bg-surface-card border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent" />
                  Section Rank Leaderboard ({filteredStudents.length} Students)
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Ordered by cumulative grade point average (CGPA).
                </p>
              </div>

              {/* Actions & Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search in batch */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Search name or roll..."
                    className="bg-surface-subtle border border-border focus:border-border-strong rounded-lg pl-8 pr-3 py-1 text-xs text-text-primary placeholder-text-muted outline-none w-44"
                  />
                </div>

                {/* Tier Filter Tabs */}
                <div className="flex items-center gap-1 p-0.5 bg-surface-subtle border border-border rounded-lg text-xs">
                  {(['all', 'distinction', 'cleared', 'backlogs'] as const).map(tier => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setActiveTier(tier)}
                      className={`px-2 py-1 rounded text-[11px] transition-colors ${
                        activeTier === tier
                          ? 'bg-surface-card text-text-primary shadow-xs font-medium'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {tier === 'all'
                        ? 'All'
                        : tier === 'distinction'
                        ? 'Distinction'
                        : tier === 'cleared'
                        ? '0 Backlogs'
                        : 'Backlogs'}
                    </button>
                  ))}
                </div>

                {/* CSV Download Button */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-text-muted font-mono uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 text-center">Rank</th>
                    <th className="py-2.5 px-3">Hall Ticket</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3 text-right">CGPA</th>
                    <th className="py-2.5 px-3 text-right">Percentage</th>
                    <th className="py-2.5 px-3 text-right">Earned Credits</th>
                    <th className="py-2.5 px-3 text-center">Active Backlogs</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {filteredStudents.map((student, idx) => {
                    const isTopper = idx === 0;
                    return (
                      <tr
                        key={student.htno}
                        className={`hover:bg-surface-subtle/50 transition-colors ${
                          isTopper ? 'bg-amber-50/50' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-bold">
                          {idx === 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-300">
                              🥇 #1
                            </span>
                          ) : idx === 1 ? (
                            <span className="inline-flex items-center gap-1 text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                              🥈 #2
                            </span>
                          ) : idx === 2 ? (
                            <span className="inline-flex items-center gap-1 text-amber-900 font-bold bg-amber-100/40 px-1.5 py-0.5 rounded border border-amber-300/80">
                              🥉 #3
                            </span>
                          ) : (
                            <span className="text-text-muted">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-text-primary font-bold">
                          {student.htno}
                        </td>
                        <td className="py-2.5 px-3 text-text-secondary font-sans font-medium max-w-xs truncate">
                          {student.student_name || 'Candidate'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-text-primary">
                          {student.cgpa > 0 ? student.cgpa.toFixed(2) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-text-secondary">
                          {student.percentage > 0 ? `${student.percentage}%` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-text-secondary">
                          {student.earned_credits}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {student.backlogs_count === 0 ? (
                            <span className="text-emerald-700 text-[11px] font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">0 (All Clear)</span>
                          ) : (
                            <span className="text-rose-700 text-[11px] font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                              {student.backlogs_count} Backlog{student.backlogs_count > 1 ? 's' : ''}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectStudent?.(student.htno)}
                            className="text-accent hover:underline text-[11px] font-sans inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
