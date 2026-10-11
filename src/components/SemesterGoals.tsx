import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
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

export default function SemesterGoals() {
    const { data } = useAcademic();
    const [prevSemestersLength, setPrevSemestersLength] = useState(data.semesters.length);
    const [goals, setGoals] = useState<SemesterGoal[]>(() =>
        data.semesters.map(sem => ({
            semId: sem.id,
            year: sem.year,
            sem: sem.sem,
            target: 8.0,
        }))
    );

    if (data.semesters.length !== prevSemestersLength) {
        setPrevSemestersLength(data.semesters.length);
        setGoals(data.semesters.map(sem => ({
            semId: sem.id,
            year: sem.year,
            sem: sem.sem,
            target: 8.0,
        })));
    }

    const [saved, setSaved] = useState(false);

    const initializeDefaultGoals = () => {
        const defaultGoals: SemesterGoal[] = data.semesters.map(sem => ({
            semId: sem.id,
            year: sem.year,
            sem: sem.sem,
            target: 8.0,
        }));
        setGoals(defaultGoals);
    };

    const saveGoals = () => {
        setSaved(true);
        toast.success('Goals saved for this session only (cleared on refresh)');
        setTimeout(() => setSaved(false), 2000);
    };

    const resetGoals = () => {
        initializeDefaultGoals();
    };

    const updateGoal = (semId: string, target: number) => {
        setGoals(prev => prev.map(g =>
            g.semId === semId ? { ...g, target: Math.min(10, Math.max(0, target)) } : g
        ));
        setSaved(false);
    };

    // Calculate progress for each semester
    const progress = useMemo(() => {
        return data.semesters.map(sem => {
            const actual = getSemesterSGPA(sem, data.regulation);
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
    }, [data.semesters, data.regulation, goals]);

    // Summary stats
    const stats = useMemo(() => {
        const withData = progress.filter(p => p.status !== 'pending');
        const achieved = withData.filter(p => p.status === 'achieved').length;
        const close = withData.filter(p => p.status === 'close').length;
        const behind = withData.filter(p => p.status === 'behind').length;
        return { achieved, close, behind, total: withData.length };
    }, [progress]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'achieved': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
            case 'close': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
            case 'behind': return <AlertTriangle className="w-4 h-4 text-rose-600" />;
            default: return <Target className="w-4 h-4 text-text-muted" />;
        }
    };

    return (
        <div className="bg-bg-card rounded-xl border border-border p-6 shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-primary">
                            <Target className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-text-primary">Semester Target Goals</h3>
                            <p className="text-xs text-text-muted">Target SGPA benchmarks and deviation tracking per semester</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={resetGoals}
                            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-subtle border border-transparent hover:border-border rounded-lg transition-colors"
                            title="Reset all targets to default"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={saveGoals}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
                                saved
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                                    : 'bg-surface-subtle text-text-primary border-border hover:bg-surface-hover hover:border-border-focus'
                            }`}
                        >
                            {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                            {saved ? 'Saved to Session' : 'Save Targets'}
                        </button>
                    </div>
                </div>

                {/* Summary Stats */}
                {stats.total > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-surface-subtle rounded-lg p-3 text-center border border-border">
                            <p className="font-mono text-2xl font-bold text-emerald-700">{stats.achieved}</p>
                            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mt-0.5">Achieved</p>
                        </div>
                        <div className="bg-surface-subtle rounded-lg p-3 text-center border border-border">
                            <p className="font-mono text-2xl font-bold text-amber-800">{stats.close}</p>
                            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mt-0.5">Within Reach</p>
                        </div>
                        <div className="bg-surface-subtle rounded-lg p-3 text-center border border-border">
                            <p className="font-mono text-2xl font-bold text-rose-700">{stats.behind}</p>
                            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mt-0.5">Below Target</p>
                        </div>
                    </div>
                )}

                {/* Goals List */}
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                    {progress.map((p) => {
                        const rowBorder =
                            p.status === 'achieved'
                                ? 'border-emerald-200 bg-emerald-50/60'
                                : p.status === 'close'
                                ? 'border-amber-200 bg-amber-50/60'
                                : p.status === 'behind'
                                ? 'border-rose-200 bg-rose-50/60'
                                : 'border-border bg-surface-subtle';

                        return (
                            <motion.div
                                key={p.semId}
                                initial={false}
                                animate={{ opacity: 1 }}
                                className={`flex items-center justify-between p-3 rounded-lg border ${rowBorder} transition-colors`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                        {getStatusIcon(p.status)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-text-primary">{p.label}</p>
                                        {p.status !== 'pending' ? (
                                            <p className="text-[11px] font-mono text-text-muted mt-0.5">
                                                Actual: <span className="font-semibold text-text-primary">{p.actual.toFixed(2)}</span>
                                                {p.diff !== 0 && (
                                                    <span className={`ml-1.5 font-medium ${p.diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                        {p.diff >= 0 ? '+' : ''}{p.diff.toFixed(2)}
                                                    </span>
                                                )}
                                            </p>
                                        ) : (
                                            <p className="text-[11px] font-mono text-text-muted mt-0.5">No semester results recorded</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Target SGPA:</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="10"
                                        value={goals.find(g => g.semId === p.semId)?.target || 8.0}
                                        onChange={(e) => updateGoal(p.semId, parseFloat(e.target.value) || 0)}
                                        className="w-16 px-2 py-1 text-xs font-mono font-bold text-center bg-bg-surface border border-border rounded-md text-text-primary focus:border-border-focus focus:outline-none transition-colors"
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Academic guidance */}
                <div className="mt-4 p-3 bg-surface-subtle border border-border rounded-lg flex items-start gap-2.5">
                    <TrendingUp className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-text-muted leading-relaxed">
                        <strong className="text-text-primary font-medium">Trajectory Tip:</strong> Target incremental gains of 0.20 to 0.40 SGPA per semester. Consistent 8.0+ performance preserves first-class distinction eligibility.
                    </p>
                </div>
            </div>
    );
}
