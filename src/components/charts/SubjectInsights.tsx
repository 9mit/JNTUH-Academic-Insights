import { useMemo, useState, useEffect } from 'react';
import { useAcademic } from '../../context/AcademicContext';
import { getGradePointsForRegulation } from '../../utils/regulationGrades';
import { TrendingUp, AlertCircle, Star } from 'lucide-react';
import type { Subject } from '../../types';
import { getBestSubjects, getSemesterSGPA, getSemesterCredits } from '../../utils/calculations';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Grade to numeric value for X-axis
const GRADE_X_VALUES: Record<string, number> = {
    'S': 10,
    'O': 10,
    'A+': 9,
    'A': 8,
    'B+': 7,
    'B': 6,
    'C': 5,
    'D': 4,
    'E': 5,
    'F': 0,
    'Ab': 0,
};

// Grade colors for scatter dots
const GRADE_DOT_COLORS: Record<string, string> = {
    'S': '#22c55e',
    'O': '#10b981',
    'A+': '#14b8a6',
    'A': '#3b82f6',
    'B+': '#8b5cf6',
    'B': '#f59e0b',
    'C': '#fb923c',
    'D': '#f97316',
    'E': '#facc15',
    'F': '#ef4444',
    'Ab': '#ef4444',
};

// Custom Tooltip Component
interface TooltipPayloadEntry {
    payload: { name: string; code?: string; grade: string; credits: number; total?: number; semesterId: string };
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-surface-card border border-border rounded-xl p-4 shadow-xl max-w-xs">
                <p className="font-bold text-text-primary text-sm mb-2">{data.name}</p>
                <div className="space-y-1 text-xs">
                    <p className="text-text-muted">
                        <span className="text-text-secondary">Code:</span> {data.code || '—'}
                    </p>
                    <p className="text-text-muted">
                        <span className="text-text-secondary">Semester:</span> {data.semesterId}
                    </p>
                    <p className="text-text-muted">
                        <span className="text-text-secondary">Credits:</span> {data.credits}
                    </p>
                    {data.total && (
                        <p className="text-text-muted">
                            <span className="text-text-secondary">Marks:</span> {data.total}
                        </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                        <span
                            className="px-2 py-1 rounded text-xs font-bold"
                            style={{ backgroundColor: GRADE_DOT_COLORS[data.grade] + '20', color: GRADE_DOT_COLORS[data.grade] }}
                        >
                            Grade: {data.grade}
                        </span>
                        <span className="text-text-primary font-bold">{GRADE_X_VALUES[data.grade]}/10</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default function SubjectInsights() {
    const { data } = useAcademic();

    // Flatten and analyze subjects
    const insights = useMemo(() => {
        const allSubjects: (Subject & { semesterId: string })[] = [];

        data.semesters.forEach(sem => {
            getBestSubjects(sem.subjects).forEach(sub => {
                // Filter out 0-credit mandatory courses (Environmental Science, Constitution of India, etc.)
                // These don't affect CGPA and shouldn't be displayed in performance analysis
                if (sub.grade && sub.name && sub.name !== "Subject Name" && !sub.nonCredit && sub.credits > 0) {
                    allSubjects.push({ ...sub, semesterId: sem.id });
                }
            });
        });

        const sorted = [...allSubjects].sort((a, b) => {
            const gpA = getGradePointsForRegulation(a.grade, data.regulation);
            const gpB = getGradePointsForRegulation(b.grade, data.regulation);
            return gpB - gpA;
        });

        const strengths = sorted.filter(s => ['S', 'O', 'A+'].includes(s.grade));
        const average = sorted.filter(s => ['A', 'B+'].includes(s.grade));
        const focusAreas = sorted.filter(s => ['B', 'C', 'D', 'E'].includes(s.grade));
        const failed = sorted.filter(s => ['F', 'Ab'].includes(s.grade));

        return { all: sorted, strengths, average, focusAreas, failed };
    }, [data]);

    // Prepare scatter plot data
    const scatterData = useMemo(() => {
        return insights.all.map((sub, index) => ({
            x: GRADE_X_VALUES[sub.grade] || 0,
            y: index + 1,
            name: sub.name,
            code: sub.code,
            grade: sub.grade,
            credits: sub.credits,
            total: sub.total,
            semesterId: sub.semesterId,
        }));
    }, [insights.all]);

    // State for advanced analysis
    const [advancedStats, setAdvancedStats] = useState<{ consistency_score: number; grade_stability: string; dominant_grade: string } | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            if (insights.all.length === 0) return;
            setLoadingStats(true);
            try {
                const subjectsPayload = insights.all.map(s => {
                    const [yearStr, semStr] = s.semesterId.split('-');
                    return {
                        subject_code: s.code || s.name.slice(0, 20),
                        subject_name: s.name,
                        grade: s.grade,
                        credits: s.credits,
                        grade_points: getGradePointsForRegulation(s.grade, data.regulation),
                        year: parseInt(yearStr, 10),
                        sem: parseInt(semStr, 10),
                        regulation: data.regulation,
                    };
                });

                const semestersPayload = data.semesters
                    .filter(sem => sem.subjects.length > 0 || (sem.manualSGPA ?? 0) > 0)
                    .map(sem => ({
                        year: sem.year,
                        sem: sem.sem,
                        sgpa: getSemesterSGPA(sem, data.regulation),
                        credits: getSemesterCredits(sem, data.regulation),
                    }));

                const response = await fetch(`${API_BASE_URL}/analyze/advanced`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ semesters: semestersPayload, subjects: subjectsPayload })
                });

                const result = await response.json();
                if (result.success) {
                    setAdvancedStats(result.performance);
                }
            } catch (err) {
                console.error("Failed to fetch advanced stats", err);
            } finally {
                setLoadingStats(false);
            }
        };

        const timer = setTimeout(fetchStats, 500);
        return () => clearTimeout(timer);
    }, [insights.all, data.regulation, data.semesters]);

    if (insights.all.length === 0) return null;

    const getGradeBgColor = (grade: string) => {
        if (['S', 'O', 'A+'].includes(grade)) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        if (['A', 'B+'].includes(grade)) return 'bg-amber-50 text-amber-700 border border-amber-200';
        return 'bg-rose-50 text-rose-700 border border-rose-200';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-accent-subtle text-accent rounded flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-text-primary">Course Performance Matrix</h3>
                        <p className="text-xs text-text-muted">Statistical performance distribution across completed subjects</p>
                    </div>
                </div>
            </div>

            {/* Metrics Bar */}
            {loadingStats ? (
                <div className="grid grid-cols-3 gap-3 mb-2 animate-pulse">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-surface-subtle border border-border rounded-lg p-3 flex flex-col items-center h-[80px]" />
                    ))}
                </div>
            ) : advancedStats && (
                <div className="grid grid-cols-3 gap-3 mb-2 font-mono">
                    <div className="card p-3 flex flex-col items-center text-center">
                        <p className="text-[10px] uppercase text-text-muted">Consistency Metric</p>
                        <p className="text-lg font-bold text-text-primary mt-1 tabular-nums">{advancedStats.consistency_score}%</p>
                    </div>
                    <div className="card p-3 flex flex-col items-center text-center">
                        <p className="text-[10px] uppercase text-text-muted">Grade Stability</p>
                        <p className="text-lg font-bold text-accent mt-1">{advancedStats.grade_stability}</p>
                    </div>
                    <div className="card p-3 flex flex-col items-center text-center">
                        <p className="text-[10px] uppercase text-text-muted">Dominant Grade</p>
                        <p className="text-lg font-bold text-emerald-600 mt-1">{advancedStats.dominant_grade}</p>
                    </div>
                </div>
            )}

            {/* Scatter Plot Visualization */}
            <div className="card p-5 border border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <h4 className="text-sm font-semibold text-text-primary">Subject Grade Point Distribution</h4>
                        <p className="text-xs text-text-muted font-mono">{insights.all.length} evaluated subjects</p>
                    </div>
                    <div className="flex items-center gap-2.5 text-[10px] font-mono text-text-muted">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> O/A+</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> A</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> B+</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> B/C</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> F</span>
                    </div>
                </div>

                <div className="h-[500px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E8EAF0" />
                            <XAxis
                                type="number"
                                dataKey="x"
                                name="Grade Points"
                                domain={[0, 10]}
                                ticks={[0, 5, 6, 7, 8, 9, 10]}
                                tickFormatter={(val) => {
                                    const labels: Record<number, string> = { 0: 'F', 4: 'D', 5: 'C/E', 6: 'B', 7: 'B+', 8: 'A', 9: 'A+', 10: 'S/O' };
                                    return labels[val] || val.toString();
                                }}
                                stroke="#CBD5E1"
                                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 'bold' }}
                                label={{ value: 'Grade', position: 'bottom', offset: 20, fill: '#64748B', fontSize: 13 }}
                            />
                            <YAxis
                                type="number"
                                dataKey="y"
                                name="Subject #"
                                domain={[0, insights.all.length + 1]}
                                stroke="#CBD5E1"
                                tick={{ fill: '#64748B', fontSize: 10 }}
                                label={{ value: 'Subject Index', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748B', fontSize: 13 }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#3155E7' }} />
                            <Scatter name="Subjects" data={scatterData} fill="#3155E7">
                                {scatterData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={GRADE_DOT_COLORS[entry.grade] || '#3155E7'}
                                    />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                {/* Grade Distribution Summary */}
                <div className="mt-6 grid grid-cols-4 gap-3">
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-emerald-700">{insights.strengths.length}</p>
                        <p className="text-[10px] font-bold text-emerald-800 uppercase">O / A+</p>
                    </div>
                    <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-accent">{insights.average.filter(s => s.grade === 'A').length}</p>
                        <p className="text-[10px] font-bold text-accent-deep uppercase">A Grade</p>
                    </div>
                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-amber-700">{insights.average.filter(s => s.grade === 'B+').length + insights.focusAreas.filter(s => ['B', 'C'].includes(s.grade)).length}</p>
                        <p className="text-[10px] font-bold text-amber-800 uppercase">B+ / B / C</p>
                    </div>
                    <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-rose-700">{insights.failed.length}</p>
                        <p className="text-[10px] font-bold text-rose-800 uppercase">Backlogs</p>
                    </div>
                </div>
            </div>

            {/* Top Strengths Table */}
            <div className="bg-surface-card border border-border rounded-xl p-6 shadow-xs">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                    <div className="w-9 h-9 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-primary">
                        <Star className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                        <h4 className="text-base font-semibold text-text-primary">Distinction Strengths ({insights.strengths.length})</h4>
                        <p className="text-xs text-text-muted">Courses completed with O and A+ grades</p>
                    </div>
                </div>

                {insights.strengths.length > 0 ? (
                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-surface-subtle border-b border-border z-10">
                                <tr>
                                    <th className="text-left py-2 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Code</th>
                                    <th className="text-left py-2 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Subject</th>
                                    <th className="text-center py-2 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Sem</th>
                                    <th className="text-center py-2 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Grade</th>
                                    <th className="text-center py-2 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Credits</th>
                                </tr>
                            </thead>
                            <tbody>
                                {insights.strengths.map((sub, i) => (
                                    <tr key={i} className="border-b border-border/60 hover:bg-surface-subtle transition-colors">
                                        <td className="py-2.5 px-2 font-mono text-text-muted text-xs">{sub.code || '—'}</td>
                                        <td className="py-2.5 px-2 text-text-primary text-xs max-w-[200px] truncate" title={sub.name}>{sub.name}</td>
                                        <td className="py-2.5 px-2 text-center text-text-muted text-xs font-mono">{sub.semesterId}</td>
                                        <td className="py-2.5 px-2 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${getGradeBgColor(sub.grade)}`}>{sub.grade}</span>
                                        </td>
                                        <td className="py-2.5 px-2 text-center text-emerald-600 font-mono font-bold text-xs">{sub.credits}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-xs text-text-muted italic py-4 text-center font-mono">No O or A+ grades recorded yet.</p>
                )}
            </div>

            {/* Focus Areas (B, C, D, E grades only — areas to improve, NOT failures) */}
            {insights.focusAreas.length > 0 && (
                <div className="bg-surface-card border border-border rounded-xl p-6 shadow-xs">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                        <div className="w-9 h-9 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-primary">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                            <h4 className="text-base font-semibold text-text-primary">Improvement Margins ({insights.focusAreas.length})</h4>
                            <p className="text-xs text-text-muted">Courses completed with B, C, or D grades with scope for honors advancement</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[220px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-surface-subtle border-b border-border z-10">
                                <tr>
                                    <th className="text-left py-2 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Code</th>
                                    <th className="text-left py-2 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Subject</th>
                                    <th className="text-center py-2 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Sem</th>
                                    <th className="text-center py-2 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {insights.focusAreas.map((sub, i) => (
                                    <tr key={i} className="border-b border-border/60 hover:bg-surface-subtle transition-colors">
                                        <td className="py-2.5 px-2 font-mono text-text-muted text-xs">{sub.code || '—'}</td>
                                        <td className="py-2.5 px-2 text-text-primary text-xs max-w-[200px] truncate" title={sub.name}>{sub.name}</td>
                                        <td className="py-2.5 px-2 text-center text-text-muted text-xs font-mono">{sub.semesterId}</td>
                                        <td className="py-2.5 px-2 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${getGradeBgColor(sub.grade)}`}>{sub.grade}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Failed Subjects (F/Ab grades — shown separately, only if they exist) */}
            {insights.failed.length > 0 && (
                <div className="bg-surface-card border border-rose-200 rounded-xl p-6 shadow-xs">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                        <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-text-primary">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                        </div>
                        <div>
                            <h4 className="text-base font-semibold text-text-primary">Remedial Backlogs ({insights.failed.length})</h4>
                            <p className="text-xs text-text-muted">Courses with F or Absent status pending clearance</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[220px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-surface-subtle border-b border-border z-10">
                                <tr>
                                    <th className="text-left py-2 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Code</th>
                                    <th className="text-left py-2 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Subject</th>
                                    <th className="text-center py-2 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Sem</th>
                                    <th className="text-center py-2 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {insights.failed.map((sub, i) => (
                                    <tr key={i} className="border-b border-border/60 hover:bg-surface-subtle transition-colors">
                                        <td className="py-2.5 px-2 font-mono text-text-muted text-xs">{sub.code || '—'}</td>
                                        <td className="py-2.5 px-2 text-text-primary text-xs max-w-[200px] truncate" title={sub.name}>{sub.name}</td>
                                        <td className="py-2.5 px-2 text-center text-text-muted text-xs font-mono">{sub.semesterId}</td>
                                        <td className="py-2.5 px-2 text-center">
                                            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">{sub.grade === 'Ab' ? 'Absent' : sub.grade}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 p-3 bg-rose-50/60 rounded-lg border border-rose-200 text-center">
                        <p className="text-xs text-rose-700 font-mono">
                            Audit note: Clearance of these {insights.failed.length} course(s) is mandatory for university degree conferral.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
