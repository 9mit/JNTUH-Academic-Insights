import { useMemo, useState, useEffect } from 'react';
import { useAcademic } from '../../context/AcademicContext';
import { GRADE_POINTS } from '../../constants/grading';
import { motion } from 'framer-motion';
import { TrendingUp, AlertCircle, Star, Activity, Target, Zap, BarChart3 } from 'lucide-react';
import type { Subject } from '../../types';
import { getBestSubjects, getSemesterSGPA, getSemesterCredits } from '../../utils/calculations';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
            <div className="bg-bg-card border border-white/20 rounded-xl p-4 shadow-xl max-w-xs">
                <p className="font-bold text-white text-sm mb-2">{data.name}</p>
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
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                        <span
                            className="px-2 py-1 rounded text-xs font-bold"
                            style={{ backgroundColor: GRADE_DOT_COLORS[data.grade] + '33', color: GRADE_DOT_COLORS[data.grade] }}
                        >
                            Grade: {data.grade}
                        </span>
                        <span className="text-white font-bold">{GRADE_X_VALUES[data.grade]}/10</span>
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
                if (sub.grade && sub.name && sub.name !== "Subject Name" && sub.credits > 0) {
                    allSubjects.push({ ...sub, semesterId: sem.id });
                }
            });
        });

        const sorted = [...allSubjects].sort((a, b) => {
            const gpA = GRADE_POINTS[a.grade] || 0;
            const gpB = GRADE_POINTS[b.grade] || 0;
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
                const subjectsPayload = insights.all.map(s => ({
                    grade: s.grade,
                    grade_points: GRADE_POINTS[s.grade] || 0
                }));

                const semestersPayload = data.semesters
                    .filter(sem => sem.subjects.length > 0 || (sem.manualSGPA ?? 0) > 0)
                    .map(sem => ({
                        year: sem.year,
                        sem: sem.sem,
                        sgpa: getSemesterSGPA(sem),
                        credits: getSemesterCredits(sem),
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
    }, [insights.all.length]);

    if (insights.all.length === 0) return null;

    const getGradeBgColor = (grade: string) => {
        if (['S', 'O', 'A+'].includes(grade)) return 'bg-emerald-500/20 text-emerald-300';
        if (['A', 'B+'].includes(grade)) return 'bg-amber-500/20 text-amber-300';
        return 'bg-rose-500/20 text-rose-300';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Performance Insights</h3>
                        <p className="text-xs text-text-muted">AI-Powered Analysis</p>
                    </div>
                </div>
            </div>

            {/* AI Insights Bar */}
            {loadingStats ? (
                <div className="grid grid-cols-3 gap-4 mb-2 animate-pulse">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center h-[100px]" />
                    ))}
                </div>
            ) : advancedStats && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 gap-4 mb-2"
                >
                    <div className="bg-bg-card border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
                            <Activity className="w-4 h-4 text-blue-400" />
                        </div>
                        <p className="text-[10px] uppercase font-bold text-text-muted">Consistency Score</p>
                        <p className="text-xl font-black text-white">{advancedStats.consistency_score}%</p>
                    </div>
                    <div className="bg-bg-card border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center mb-2">
                            <Target className="w-4 h-4 text-purple-400" />
                        </div>
                        <p className="text-[10px] uppercase font-bold text-text-muted">Grade Stability</p>
                        <p className="text-xl font-black text-white">{advancedStats.grade_stability}</p>
                    </div>
                    <div className="bg-bg-card border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                            <Zap className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-[10px] uppercase font-bold text-text-muted">Dominant Grade</p>
                        <p className="text-xl font-black text-white">{advancedStats.dominant_grade}</p>
                    </div>
                </motion.div>
            )}

            {/* Scatter Plot Visualization */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-bg-card border border-white/5 rounded-3xl p-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-lg shadow-primary/20">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white">All Subjects Performance</h4>
                            <p className="text-xs text-text-muted">{insights.all.length} subjects • Hover for details</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
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
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
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
                                stroke="#666"
                                tick={{ fill: '#888', fontSize: 12, fontWeight: 'bold' }}
                                label={{ value: 'Grade', position: 'bottom', offset: 20, fill: '#aaa', fontSize: 14 }}
                            />
                            <YAxis
                                type="number"
                                dataKey="y"
                                name="Subject #"
                                domain={[0, insights.all.length + 1]}
                                stroke="#666"
                                tick={{ fill: '#888', fontSize: 10 }}
                                label={{ value: 'Subject Index', angle: -90, position: 'insideLeft', offset: -10, fill: '#aaa', fontSize: 14 }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#38bdf8' }} />
                            <Scatter name="Subjects" data={scatterData} fill="#38bdf8">
                                {scatterData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={GRADE_DOT_COLORS[entry.grade] || '#38bdf8'}
                                    />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                {/* Grade Distribution Summary */}
                <div className="mt-6 grid grid-cols-4 gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-emerald-400">{insights.strengths.length}</p>
                        <p className="text-[10px] font-bold text-emerald-300 uppercase">O / A+</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-blue-400">{insights.average.filter(s => s.grade === 'A').length}</p>
                        <p className="text-[10px] font-bold text-blue-300 uppercase">A Grade</p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-amber-400">{insights.average.filter(s => s.grade === 'B+').length + insights.focusAreas.filter(s => ['B', 'C'].includes(s.grade)).length}</p>
                        <p className="text-[10px] font-bold text-amber-300 uppercase">B+ / B / C</p>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-rose-400">{insights.failed.length}</p>
                        <p className="text-[10px] font-bold text-rose-300 uppercase">Backlogs</p>
                    </div>
                </div>
            </motion.div>

            {/* Top Strengths Table */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-emerald-500/10 to-bg-card border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Star className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white">Top Strengths ({insights.strengths.length})</h4>
                        <p className="text-xs text-emerald-400 font-medium">O and A+ Grades</p>
                    </div>
                </div>

                {insights.strengths.length > 0 ? (
                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#10b981 #1a1a1a' }}>
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-bg-card/95 backdrop-blur-sm z-10">
                                <tr className="border-b border-emerald-500/20">
                                    <th className="text-left py-2 px-2 text-[10px] font-bold text-emerald-400 uppercase">Code</th>
                                    <th className="text-left py-2 px-2 text-[10px] font-bold text-emerald-400 uppercase">Subject</th>
                                    <th className="text-center py-2 px-2 text-[10px] font-bold text-emerald-400 uppercase">Sem</th>
                                    <th className="text-center py-2 px-2 text-[10px] font-bold text-emerald-400 uppercase">Grade</th>
                                    <th className="text-center py-2 px-2 text-[10px] font-bold text-emerald-400 uppercase">Credits</th>
                                </tr>
                            </thead>
                            <tbody>
                                {insights.strengths.map((sub, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-2 px-2 font-mono text-text-muted text-xs">{sub.code || '—'}</td>
                                        <td className="py-2 px-2 text-white text-xs max-w-[200px] truncate" title={sub.name}>{sub.name}</td>
                                        <td className="py-2 px-2 text-center text-text-muted text-xs">{sub.semesterId}</td>
                                        <td className="py-2 px-2 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getGradeBgColor(sub.grade)}`}>{sub.grade}</span>
                                        </td>
                                        <td className="py-2 px-2 text-center text-emerald-400 font-bold text-xs">{sub.credits}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-sm text-text-muted italic py-4 text-center">No O or A+ grades yet. Keep pushing!</p>
                )}
            </motion.div>

            {/* Focus Areas (B, C, D, E grades only — areas to improve, NOT failures) */}
            {insights.focusAreas.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-amber-500/10 to-bg-card border border-amber-500/20 rounded-3xl p-6 relative overflow-hidden"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <AlertCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white">Focus Areas ({insights.focusAreas.length})</h4>
                            <p className="text-xs text-amber-400 font-medium">B, C, D Grades — Room for improvement</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#f59e0b #1a1a1a' }}>
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-bg-card/95 backdrop-blur-sm z-10">
                                <tr className="border-b border-amber-500/20">
                                    <th className="text-left py-2 px-2 text-[10px] font-bold text-amber-400 uppercase">Code</th>
                                    <th className="text-left py-2 px-2 text-[10px] font-bold text-amber-400 uppercase">Subject</th>
                                    <th className="text-center py-2 px-2 text-[10px] font-bold text-amber-400 uppercase">Sem</th>
                                    <th className="text-center py-2 px-2 text-[10px] font-bold text-amber-400 uppercase">Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {insights.focusAreas.map((sub, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-2 px-2 font-mono text-text-muted text-xs">{sub.code || '—'}</td>
                                        <td className="py-2 px-2 text-white text-xs max-w-[200px] truncate" title={sub.name}>{sub.name}</td>
                                        <td className="py-2 px-2 text-center text-text-muted text-xs">{sub.semesterId}</td>
                                        <td className="py-2 px-2 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getGradeBgColor(sub.grade)}`}>{sub.grade}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Failed Subjects (F/Ab grades — shown separately, only if they exist) */}
            {insights.failed.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-rose-500/10 to-bg-card border border-rose-500/20 rounded-3xl p-6 relative overflow-hidden"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                            <AlertCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white">Failed Subjects ({insights.failed.length})</h4>
                            <p className="text-xs text-rose-400 font-medium">F / Absent — Must be cleared</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#ef4444 #1a1a1a' }}>
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-bg-card/95 backdrop-blur-sm z-10">
                                <tr className="border-b border-rose-500/20">
                                    <th className="text-left py-2 px-2 text-[10px] font-bold text-rose-400 uppercase">Code</th>
                                    <th className="text-left py-2 px-2 text-[10px] font-bold text-rose-400 uppercase">Subject</th>
                                    <th className="text-center py-2 px-2 text-[10px] font-bold text-rose-400 uppercase">Sem</th>
                                    <th className="text-center py-2 px-2 text-[10px] font-bold text-rose-400 uppercase">Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {insights.failed.map((sub, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-2 px-2 font-mono text-text-muted text-xs">{sub.code || '—'}</td>
                                        <td className="py-2 px-2 text-white text-xs max-w-[200px] truncate" title={sub.name}>{sub.name}</td>
                                        <td className="py-2 px-2 text-center text-text-muted text-xs">{sub.semesterId}</td>
                                        <td className="py-2 px-2 text-center">
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300">{sub.grade === 'Ab' ? 'Absent' : sub.grade}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 p-3 bg-rose-500/10 rounded-xl border border-rose-500/10 text-center">
                        <p className="text-xs text-rose-300">
                            ⚠️ These {insights.failed.length} subject(s) need to be cleared to complete your degree.
                        </p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
