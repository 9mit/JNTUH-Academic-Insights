import { useState, useMemo } from 'react';
import {
  Users,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Loader2,
  Minus,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import type { Subject, Semester } from '../types';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || '';

const GRADE_POINTS: Record<string, number> = {
  O: 10,
  S: 10,
  'A+': 9,
  A: 8,
  'B+': 7,
  B: 6,
  C: 5,
  D: 4,
  E: 4,
  F: 0,
  Ab: 0,
  AB: 0,
};

interface StudentRecord {
  htno: string;
  name?: string;
  cgpa: number;
  percentage: number;
  totalCredits: number;
  earnedCredits: number;
  backlogsCount: number;
  semesters: Semester[];
  subjects: Subject[];
}

export default function ResultContrast() {
  const { data: currentData, getCGPA } = useAcademic();
  const currentCGPA = getCGPA();

  // Inputs
  const [htnoA, setHtnoA] = useState<string>(() => currentData.hallTicket || '');
  const [htnoB, setHtnoB] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result records
  const [studentA, setStudentA] = useState<StudentRecord | null>(() => {
    if (currentData.hallTicket && currentData.semesters.length > 0) {
      const allSubjects = currentData.semesters.flatMap(s => s.subjects);
      const backlogs = allSubjects.filter(s => s.grade === 'F' || s.grade === 'Ab').length;
      return {
        htno: currentData.hallTicket,
        name: currentData.studentName || 'Student A (Active Session)',
        cgpa: currentCGPA.cgpa,
        percentage: currentCGPA.percentage,
        totalCredits: currentCGPA.totalCredits,
        earnedCredits: currentCGPA.totalCredits,
        backlogsCount: backlogs,
        semesters: currentData.semesters,
        subjects: allSubjects,
      };
    }
    return null;
  });

  const [studentB, setStudentB] = useState<StudentRecord | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<'all' | 'a_higher' | 'b_higher' | 'tied'>('all');

  // Fetch hall ticket record from backend API
  const fetchStudentData = async (htno: string): Promise<StudentRecord> => {
    const cleanHtno = htno.trim().toUpperCase();
    if (!/^[0-9A-Z]{10}$/.test(cleanHtno)) {
      throw new Error(`Invalid Hall Ticket Number "${cleanHtno}". Must be 10 characters.`);
    }

    const res = await fetch(`${API_BASE}/fetch/htno`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ htno: cleanHtno, force_refresh: false }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Could not fetch results for ${cleanHtno}`);
    }

    const payload = await res.json();
    const rawSubjects = (payload.subjects || []) as any[];
    const subjectList: Subject[] = rawSubjects.map((sub: any, sIdx: number) => ({
      id: `sub-${sub.subject_code || sub.code || sub.subject_name || sub.name}-${sIdx}`,
      code: sub.subject_code || sub.code || '',
      name: sub.subject_name || sub.name || 'Subject',
      grade: sub.grade || 'F',
      credits: typeof sub.credits === 'number' ? sub.credits : 0,
      internal: sub.internal,
      external: sub.external,
      total: sub.total,
    }));

    const semesters: Semester[] = (payload.semesters || []).map((s: any, idx: number) => {
      const semSubs = rawSubjects
        .filter((rs: any) => rs.year === s.year && rs.sem === s.sem)
        .map((rs: any, sIdx: number) => ({
          id: `sem-sub-${rs.subject_code || rs.code || rs.name}-${sIdx}`,
          code: rs.subject_code || rs.code || '',
          name: rs.subject_name || rs.name || 'Subject',
          grade: rs.grade || 'F',
          credits: typeof rs.credits === 'number' ? rs.credits : 0,
        }));

      return {
        id: `sem-${s.year || 1}-${s.sem || 1}-${idx}`,
        year: s.year || 1,
        sem: s.sem || 1,
        mode: 'detailed',
        manualSGPA: typeof s.sgpa === 'number' ? s.sgpa : null,
        isExpanded: false,
        subjects: semSubs,
      };
    });

    const allSubjects: Subject[] = subjectList.length > 0 ? subjectList : semesters.flatMap(s => s.subjects);
    const backlogs = allSubjects.filter(s => s.grade === 'F' || s.grade === 'Ab').length;
    const cgpa = payload.cgpa || payload.official_cgpa || 0;
    const percentage = payload.percentage || (cgpa > 0 ? (cgpa - 0.5) * 10 : 0);
    const totalCredits = allSubjects
      .filter(s => s.grade !== 'F' && s.grade !== 'Ab')
      .reduce((sum, s) => sum + (s.credits || 0), 0);

    return {
      htno: cleanHtno,
      name: payload.student_name || `Candidate (${cleanHtno})`,
      cgpa: Number(cgpa.toFixed(2)),
      percentage: Number(percentage.toFixed(1)),
      totalCredits,
      earnedCredits: totalCredits,
      backlogsCount: backlogs,
      semesters,
      subjects: allSubjects,
    };
  };

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanA = htnoA.trim().toUpperCase();
    const cleanB = htnoB.trim().toUpperCase();

    if (!cleanA || !cleanB) {
      setError('Please provide two hall ticket numbers to contrast.');
      return;
    }

    if (cleanA === cleanB) {
      setError('Please enter two distinct hall ticket numbers.');
      return;
    }

    try {
      setLoading(true);
      const [resA, resB] = await Promise.all([
        studentA && studentA.htno === cleanA ? Promise.resolve(studentA) : fetchStudentData(cleanA),
        fetchStudentData(cleanB),
      ]);

      setStudentA(resA);
      setStudentB(resB);
      toast.success('Results fetched and benchmarked successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to compare hall tickets.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Matrix of common subjects between A and B
  const subjectComparisonMatrix = useMemo(() => {
    if (!studentA || !studentB) return [];

    const norm = (s: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // Index student B by code and by normalized name
    const mapBByCode = new Map<string, Subject>();
    const mapBByName = new Map<string, Subject>();
    for (const sub of studentB.subjects) {
      if (sub.code) mapBByCode.set(norm(sub.code), sub);
      if (sub.name) mapBByName.set(norm(sub.name), sub);
    }

    const rows: {
      code?: string;
      name: string;
      gradeA: string;
      gradeB: string;
      pointsA: number;
      pointsB: number;
      delta: number;
      credits: number;
    }[] = [];

    const matchedB = new Set<Subject>();

    for (const subA of studentA.subjects) {
      const codeKey = norm(subA.code || '');
      const nameKey = norm(subA.name || '');

      const subB = (codeKey ? mapBByCode.get(codeKey) : undefined) || (nameKey ? mapBByName.get(nameKey) : undefined);
      if (subB && !matchedB.has(subB)) {
        matchedB.add(subB);
        const ptsA = GRADE_POINTS[subA.grade] ?? 0;
        const ptsB = GRADE_POINTS[subB.grade] ?? 0;
        rows.push({
          code: subA.code || subB.code,
          name: subA.name || subB.name,
          gradeA: subA.grade,
          gradeB: subB.grade,
          pointsA: ptsA,
          pointsB: ptsB,
          delta: ptsA - ptsB,
          credits: subA.credits || subB.credits || 3,
        });
      }
    }

    return rows;
  }, [studentA, studentB]);

  const filteredMatrix = useMemo(() => {
    if (subjectFilter === 'all') return subjectComparisonMatrix;
    if (subjectFilter === 'a_higher') return subjectComparisonMatrix.filter(r => r.delta > 0);
    if (subjectFilter === 'b_higher') return subjectComparisonMatrix.filter(r => r.delta < 0);
    if (subjectFilter === 'tied') return subjectComparisonMatrix.filter(r => r.delta === 0);
    return subjectComparisonMatrix;
  }, [subjectComparisonMatrix, subjectFilter]);

  // Compute semester-wise SGPA contrast
  const semesterContrast = useMemo(() => {
    if (!studentA || !studentB) return [];

    const maxYear = 4;
    const sems = [];
    for (let y = 1; y <= maxYear; y++) {
      for (let s = 1; s <= 2; s++) {
        const semA = studentA.semesters.find(item => item.year === y && item.sem === s);
        const semB = studentB.semesters.find(item => item.year === y && item.sem === s);

        if (semA || semB) {
          const calcSGPA = (semester?: Semester) => {
            if (!semester || semester.subjects.length === 0) return 0;
            let earned = 0;
            let total = 0;
            for (const sub of semester.subjects) {
              const pts = GRADE_POINTS[sub.grade] ?? 0;
              earned += pts * (sub.credits || 0);
              total += sub.credits || 0;
            }
            return total > 0 ? Number((earned / total).toFixed(2)) : 0;
          };

          const sgpaA = calcSGPA(semA);
          const sgpaB = calcSGPA(semB);

          sems.push({
            label: `${y}-${s}`,
            sgpaA,
            sgpaB,
            delta: Number((sgpaA - sgpaB).toFixed(2)),
          });
        }
      }
    }
    return sems;
  }, [studentA, studentB]);

  const cgpaDelta = useMemo(() => {
    if (!studentA || !studentB) return 0;
    return Number((studentA.cgpa - studentB.cgpa).toFixed(2));
  }, [studentA, studentB]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      {/* Editorial Header */}
      <div className="border-b border-border pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest uppercase text-text-muted bg-surface-subtle border border-border px-2 py-0.5 rounded">
                Benchmarking
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <Users className="w-3.5 h-3.5 text-accent" />
                Result Contrast & Peer Comparison
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Compare Academic Results
            </h1>
            <p className="text-sm text-text-secondary max-w-2xl">
              Benchmark two student careers subject-by-subject and semester-by-semester. Inspect performance deltas, earned credit differences, and mutual subject mastery.
            </p>
          </div>
        </div>
      </div>

      {/* Dual Search Input Bar */}
      <form
        onSubmit={handleCompare}
        className="p-5 rounded-lg bg-surface-card border border-border space-y-4 shadow-xs"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Student A Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary flex items-center justify-between">
              <span>Candidate A (Hall Ticket)</span>
              {currentData.hallTicket && htnoA === currentData.hallTicket && (
                <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                  Active Session
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={10}
                value={htnoA}
                onChange={e => setHtnoA(e.target.value.toUpperCase())}
                placeholder="e.g. 21XXXXX101"
                className="w-full bg-surface-subtle border border-border focus:border-border-strong rounded-lg px-3.5 py-2.5 text-sm text-text-primary font-mono placeholder-text-muted outline-none transition-colors"
              />
            </div>
          </div>

          {/* Student B Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">
              Candidate B (Peer / Classmate Hall Ticket)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={10}
                value={htnoB}
                onChange={e => setHtnoB(e.target.value.toUpperCase())}
                placeholder="e.g. 21XXXXX102"
                className="w-full bg-surface-subtle border border-border focus:border-border-strong rounded-lg px-3.5 py-2.5 text-sm text-text-primary font-mono placeholder-text-muted outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Sample comparison pairs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-text-muted font-mono">Sample pairs:</span>
            {[
              { a: '21071A0501', b: '21071A0502', label: 'JNTUH CEH CSE' },
              { a: '21071A0401', b: '21071A0402', label: 'JNTUH CEH ECE' },
              { a: '20B91A0501', b: '20B91A0502', label: 'VNR VJIET' },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setHtnoA(p.a);
                  setHtnoB(p.b);
                }}
                className="px-2 py-0.5 rounded bg-surface-subtle hover:bg-surface-card border border-border text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !htnoA || !htnoB}
            className="btn-primary inline-flex items-center gap-2 text-xs py-2 px-5 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Benchmarking Results...</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Compare Both Students</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Comparison Results View */}
      {studentA && studentB && (
        <div className="space-y-6 pt-2">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Student A Summary Card */}
            <div className="p-5 rounded-lg bg-surface-card border border-border space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Candidate A</span>
                  <h3 className="text-sm font-semibold text-text-primary font-mono">{studentA.htno}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-text-muted">CGPA</span>
                  <div className="text-xl font-bold text-text-primary font-mono">{studentA.cgpa.toFixed(2)}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-border/60 grid grid-cols-3 gap-2 text-xs font-mono">
                <div>
                  <span className="text-text-muted text-[10px] block">Credits</span>
                  <span className="text-text-secondary">{studentA.earnedCredits}</span>
                </div>
                <div>
                  <span className="text-text-muted text-[10px] block">Backlogs</span>
                  <span className={studentA.backlogsCount > 0 ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                    {studentA.backlogsCount}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted text-[10px] block">Percentage</span>
                  <span className="text-text-secondary">{studentA.percentage}%</span>
                </div>
              </div>
            </div>

            {/* Performance Delta Card */}
            <div className="p-5 rounded-lg bg-surface-subtle border border-border flex flex-col justify-center items-center text-center space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">CGPA Delta</span>
              <div className="flex items-center gap-1.5">
                {cgpaDelta > 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                ) : cgpaDelta < 0 ? (
                  <TrendingDown className="w-5 h-5 text-rose-600" />
                ) : (
                  <Minus className="w-5 h-5 text-text-muted" />
                )}
                <span
                  className={`text-2xl font-bold font-mono ${
                    cgpaDelta > 0 ? 'text-emerald-700' : cgpaDelta < 0 ? 'text-rose-700' : 'text-text-secondary'
                  }`}
                >
                  {cgpaDelta > 0 ? `+${cgpaDelta}` : cgpaDelta}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                {cgpaDelta > 0
                  ? `Candidate A leads by ${(cgpaDelta * 10).toFixed(1)} percentage points.`
                  : cgpaDelta < 0
                  ? `Candidate B leads by ${(Math.abs(cgpaDelta) * 10).toFixed(1)} percentage points.`
                  : 'Both candidates hold identical CGPA metrics.'}
              </p>
            </div>

            {/* Student B Summary Card */}
            <div className="p-5 rounded-lg bg-surface-card border border-border space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Candidate B</span>
                  <h3 className="text-sm font-semibold text-text-primary font-mono">{studentB.htno}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-text-muted">CGPA</span>
                  <div className="text-xl font-bold text-text-primary font-mono">{studentB.cgpa.toFixed(2)}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-border/60 grid grid-cols-3 gap-2 text-xs font-mono">
                <div>
                  <span className="text-text-muted text-[10px] block">Credits</span>
                  <span className="text-text-secondary">{studentB.earnedCredits}</span>
                </div>
                <div>
                  <span className="text-text-muted text-[10px] block">Backlogs</span>
                  <span className={studentB.backlogsCount > 0 ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                    {studentB.backlogsCount}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted text-[10px] block">Percentage</span>
                  <span className="text-text-secondary">{studentB.percentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Semester-by-Semester Progression Contrast */}
          <div className="p-5 rounded-lg bg-surface-card border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-accent" />
                Semester-wise SGPA Contrast
              </h3>
              <span className="text-xs text-text-muted font-mono">Normalized Trajectory</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {semesterContrast.map(sem => (
                <div
                  key={sem.label}
                  className="p-3 rounded-md bg-surface-subtle border border-border text-center space-y-1.5"
                >
                  <span className="text-[10px] font-mono text-text-muted block">Sem {sem.label}</span>
                  <div className="text-xs font-mono font-medium text-text-primary">
                    <span className={sem.delta > 0 ? 'text-emerald-700 font-bold' : ''}>
                      {sem.sgpaA > 0 ? sem.sgpaA.toFixed(2) : '—'}
                    </span>
                    <span className="text-text-muted mx-1">/</span>
                    <span className={sem.delta < 0 ? 'text-rose-700 font-bold' : ''}>
                      {sem.sgpaB > 0 ? sem.sgpaB.toFixed(2) : '—'}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono">
                    {sem.delta > 0 ? (
                      <span className="text-emerald-700 font-semibold">+{sem.delta}</span>
                    ) : sem.delta < 0 ? (
                      <span className="text-rose-700 font-semibold">{sem.delta}</span>
                    ) : (
                      <span className="text-text-muted">0.00</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject-by-Subject Grade Matrix */}
          <div className="p-5 rounded-lg bg-surface-card border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-accent" />
                  Subject-by-Subject Benchmark ({subjectComparisonMatrix.length} Common Courses)
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Direct grade point differentials for all concurrent courses taken.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-surface-subtle border border-border rounded-lg text-xs">
                {(['all', 'a_higher', 'b_higher', 'tied'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSubjectFilter(tab)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      subjectFilter === tab
                        ? 'bg-surface-card text-text-primary shadow-xs font-medium'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {tab === 'all'
                      ? 'All'
                      : tab === 'a_higher'
                      ? 'A Higher'
                      : tab === 'b_higher'
                      ? 'B Higher'
                      : 'Equal'}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-text-muted font-mono uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Course Code</th>
                    <th className="py-2.5 px-3">Subject Name</th>
                    <th className="py-2.5 px-3 text-center">Candidate A</th>
                    <th className="py-2.5 px-3 text-center">Candidate B</th>
                    <th className="py-2.5 px-3 text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredMatrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-text-secondary text-[11px]">
                        {row.code || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-text-primary font-medium max-w-xs truncate">
                        {row.name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold ${
                            row.delta > 0
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                              : 'text-text-secondary'
                          }`}
                        >
                          {row.gradeA}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold ${
                            row.delta < 0
                              ? 'bg-rose-50 border border-rose-200 text-rose-700'
                              : 'text-text-secondary'
                          }`}
                        >
                          {row.gradeB}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        {row.delta > 0 ? (
                          <span className="text-emerald-700 font-semibold">+{row.delta} pt</span>
                        ) : row.delta < 0 ? (
                          <span className="text-rose-700 font-semibold">{row.delta} pt</span>
                        ) : (
                          <span className="text-text-muted">Tied</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
