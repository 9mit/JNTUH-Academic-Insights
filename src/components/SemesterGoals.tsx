import { useState, useEffect, useMemo } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { getSemesterSGPA } from '../utils/calculations';
import { getSemesterLabel } from '../constants/grading';
import { motion } from 'framer-motion';
import { Target, CheckCircle2, AlertTriangle, TrendingUp, Save, RotateCcw } from 'lucide-react';

interface SemesterGoal {
    semId: string;
    year: number;
    sem: number;
    target: number;
}

const STORAGE_KEY = 'jntuh_semester_goals';

export default function SemesterGoals() {
    const { data } = useAcademic();
    const [goals, setGoals] = useState<SemesterGoal[]>([]);
    const [saved, setSaved] = useState(false);

    // Initialize goals from localStorage or defaults
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setGoals(JSON.parse(stored));
            } catch {
                initializeDefaultGoals();
            }
        } else {
            initializeDefaultGoals();
        }
    }, []);

    const initializeDefaultGoals = () => {
        const defaultGoals: SemesterGoal[] = data.semesters.map(sem => ({
            semId: sem.id,
            year: sem.year,
            sem: sem.sem,
            target: 8.0, // Default target
        }));
        setGoals(defaultGoals);
    };

    const updateGoal = (semId: string, target: number) => {
        setGoals(prev => prev.map(g =>
            g.semId === semId ? { ...g, target: Math.min(10, Math.max(0, target)) } : g
        ));
        setSaved(false);
    };

    const saveGoals = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const resetGoals = () => {
        initializeDefaultGoals();
        localStorage.removeItem(STORAGE_KEY);
    };

    // Calculate progress for each semester
    const progress = useMemo(() => {
        return data.semesters.map(sem => {
            const actual = getSemesterSGPA(sem);
            const goal = goals.find(g => g.semId === sem.id);
            const target = goal?.target || 8.0;

            const hasData = actual > 0;
            const diff = actual - target;
            const status = !hasData ? 'pending' : diff >= 0 ? 'achieved' : diff >= -0.5 ? 'close' : 'behind';

            return {
                semId: sem.id,
                year: sem.year,
                sem: sem.sem,
                label: getSemesterLabel(sem.year, sem.sem),
                actual,
                target,
                diff,
                status,
            };
        });
    }, [data.semesters, goals]);

    // Summary stats
    const stats = useMemo(() => {
        const withData = progress.filter(p => p.status !== 'pending');
        const achieved = withData.filter(p => p.status === 'achieved').length;
        const close = withData.filter(p => p.status === 'close').length;
        const behind = withData.filter(p => p.status === 'behind').length;
        return { achieved, close, behind, total: withData.length };
    }, [progress]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'achieved': return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400';
            case 'close': return 'bg-amber-500/20 border-amber-500/30 text-amber-400';
            case 'behind': return 'bg-rose-500/20 border-rose-500/30 text-rose-400';
            default: return 'bg-white/5 border-white/10 text-text-muted';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'achieved': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            case 'close': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
            case 'behind': return <AlertTriangle className="w-4 h-4 text-rose-400" />;
            default: return <Target className="w-4 h-4 text-text-muted" />;
        }
    };

    return (
        <div className="bg-gradient-to-br from-amber-500/10 to-bg-card rounded-3xl p-6 border border-amber-500/20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Semester Goals</h3>
                        <p className="text-xs text-text-muted">Set and track your SGPA targets</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={resetGoals}
                        className="p-2 text-text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Reset to defaults"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={saveGoals}
                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${saved
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                            }`}
                    >
                        {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {saved ? 'Saved!' : 'Save Goals'}
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            {stats.total > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-500/20">
                        <p className="text-2xl font-black text-emerald-400">{stats.achieved}</p>
                        <p className="text-[10px] text-text-muted uppercase">Achieved</p>
                    </div>
                    <div className="bg-amber-500/10 rounded-xl p-3 text-center border border-amber-500/20">
                        <p className="text-2xl font-black text-amber-400">{stats.close}</p>
                        <p className="text-[10px] text-text-muted uppercase">Close</p>
                    </div>
                    <div className="bg-rose-500/10 rounded-xl p-3 text-center border border-rose-500/20">
                        <p className="text-2xl font-black text-rose-400">{stats.behind}</p>
                        <p className="text-[10px] text-text-muted uppercase">Behind</p>
                    </div>
                </div>
            )}

            {/* Goals List */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#f59e0b #1a1a1a' }}>
                {progress.map((p) => (
                    <motion.div
                        key={p.semId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center justify-between p-3 rounded-xl border ${getStatusStyle(p.status)}`}
                    >
                        <div className="flex items-center gap-3">
                            {getStatusIcon(p.status)}
                            <div>
                                <p className="text-sm font-medium text-white">{p.label}</p>
                                {p.status !== 'pending' && (
                                    <p className="text-[10px] text-text-muted">
                                        Actual: <span className="font-bold">{p.actual.toFixed(2)}</span>
                                        {p.diff !== 0 && (
                                            <span className={p.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                                {' '}({p.diff >= 0 ? '+' : ''}{p.diff.toFixed(2)})
                                            </span>
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-muted">Target:</span>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                value={goals.find(g => g.semId === p.semId)?.target || 8.0}
                                onChange={(e) => updateGoal(p.semId, parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 text-sm text-center bg-black/30 border border-white/10 rounded-lg text-white font-bold"
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Pro Tip */}
            <div className="mt-4 p-3 bg-black/20 rounded-xl flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-text-muted">
                    <strong className="text-white">Pro tip:</strong> Set realistic targets based on your past performance. Aim for 0.2-0.5 improvement each semester.
                </p>
            </div>
        </div>
    );
}
