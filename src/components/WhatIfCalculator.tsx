import { useState, useMemo } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { calculateCGPA } from '../utils/calculations';
import { getSemesterLabel } from '../constants/grading';
import { getValidGradesForRegulation, getGradePointsForRegulation } from '../utils/regulationGrades';
import type { Grade, Semester } from '../types';
import { FlaskConical, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WhatIfCalculator() {
    const { data } = useAcademic();
    const [selectedSemId, setSelectedSemId] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const validGrades = useMemo(
        () => getValidGradesForRegulation(data.regulation).filter(g => g !== '-' && g !== 'Ab') as Grade[],
        [data.regulation],
    );
    const [simulatedGrade, setSimulatedGrade] = useState<Grade>('O');

    // Get semesters with detailed subjects
    const detailedSemesters = useMemo(() =>
        data.semesters.filter(sem => sem.mode === 'detailed' && sem.subjects.length > 0),
        [data.semesters]
    );

    // Get subjects for selected semester
    const selectedSemester = detailedSemesters.find(s => s.id === selectedSemId);
    const subjects = selectedSemester?.subjects || [];

    // Find selected subject
    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

    // Calculate current CGPA (recalculated path — strip official locks for fair comparison)
    const unlockedSemesters = useMemo(() =>
        data.semesters.map(sem => ({
            ...sem,
            subjects: sem.subjects.map(sub => {
                const next = { ...sub };
                delete next.official_sem_sgpa;
                return next;
            }),
        })),
        [data.semesters],
    );
    const currentCGPA = calculateCGPA(unlockedSemesters, data.regulation).cgpa;

    const simulatedResult = useMemo(() => {
        if (!selectedSemId || !selectedSubjectId) return null;

        const currentSem = unlockedSemesters.find(s => s.id === selectedSemId);
        const currentSub = currentSem?.subjects.find(s => s.id === selectedSubjectId);
        if (!currentSem || !currentSub) return null;

        const modifiedSemesters: Semester[] = unlockedSemesters.map(sem => {
            if (sem.id !== selectedSemId) return sem;

            return {
                ...sem,
                subjects: sem.subjects.map(sub => {
                    if (sub.id !== selectedSubjectId) return sub;
                    return { ...sub, grade: simulatedGrade };
                }),
            };
        });

        const newResult = calculateCGPA(modifiedSemesters, data.regulation);
        const diff = newResult.cgpa - currentCGPA;

        return {
            newCGPA: newResult.cgpa,
            diff,
            trend: diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'same',
        };
    }, [simulatedGrade, unlockedSemesters, currentCGPA, selectedSemId, selectedSubjectId, data.regulation]);

    // Reset subject when semester changes
    const handleSemesterChange = (semId: string) => {
        setSelectedSemId(semId);
        setSelectedSubjectId('');
    };

    if (detailedSemesters.length === 0) {
        return (
            <div className="bg-bg-card rounded-xl border border-border p-8 text-center shadow-sm">
                <FlaskConical className="w-8 h-8 text-text-muted mx-auto mb-3" />
                <p className="text-text-primary font-medium text-sm">No Detailed Course Records Available</p>
                <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">Input semester course grades in Detailed Mode to simulate hypothetical grade updates and analyze CGPA sensitivity.</p>
            </div>
        );
    }

    return (
        <div className="bg-bg-card rounded-xl border border-border p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-9 h-9 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-primary">
                    <FlaskConical className="w-4 h-4 text-accent" />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-text-primary">What-If Sensitivity Simulation</h3>
                    <p className="text-xs text-text-muted">Simulate hypothetical grade revisions to evaluate direct CGPA impact</p>
                </div>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Semester Selector */}
                <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5">
                        Select Semester
                    </label>
                    <select
                        value={selectedSemId}
                        onChange={(e) => handleSemesterChange(e.target.value)}
                        className="input-field w-full text-xs"
                    >
                        <option value="">Choose semester...</option>
                        {detailedSemesters.map(sem => (
                            <option key={sem.id} value={sem.id}>
                                {getSemesterLabel(sem.year, sem.sem)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Subject Selector */}
                <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5">
                        Target Subject
                    </label>
                    <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="input-field w-full text-xs"
                        disabled={!selectedSemId}
                    >
                        <option value="">Choose subject...</option>
                        {subjects.map(sub => (
                            <option key={sub.id} value={sub.id}>
                                {sub.name} (Current: {sub.grade})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Grade Selector */}
                <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5">
                        Simulated Grade
                    </label>
                    <select
                        value={simulatedGrade}
                        onChange={(e) => setSimulatedGrade(e.target.value as Grade)}
                        className="input-field w-full text-xs"
                        disabled={!selectedSubjectId}
                    >
                        {validGrades.map(grade => (
                            <option key={grade} value={grade}>
                                Grade {grade} ({getGradePointsForRegulation(grade, data.regulation)} points)
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Result Display */}
            <AnimatePresence mode="wait">
                {simulatedResult && selectedSubject && (
                    <motion.div
                        key="result"
                        initial={false}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 1 }}
                        className="bg-surface-subtle rounded-xl p-5 border border-border"
                    >
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                            <div>
                                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Simulated Hypothesis</span>
                                <p className="text-xs text-text-primary mt-0.5">
                                    <span className="font-semibold">{selectedSubject.name}</span>
                                    <span className="text-text-muted mx-2">·</span>
                                    <span className="text-text-muted">Original Grade: </span>
                                    <span className="font-mono font-bold text-text-primary">{selectedSubject.grade}</span>
                                    <span className="text-text-muted mx-2">→</span>
                                    <span className="text-text-muted">Target Grade: </span>
                                    <span className={`font-mono font-bold ${simulatedGrade === 'F' ? 'text-rose-700' : 'text-emerald-700'}`}>
                                        {simulatedGrade}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center items-center">
                            <div className="bg-bg-card rounded-lg p-3 border border-border">
                                <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">Baseline CGPA</p>
                                <p className="font-mono text-xl font-bold text-text-primary">{currentCGPA.toFixed(2)}</p>
                            </div>

                            <div className="flex flex-col items-center justify-center">
                                {simulatedResult.trend === 'up' && (
                                    <div className="flex items-center gap-1 text-emerald-700 font-mono text-xs font-semibold">
                                        <TrendingUp className="w-5 h-5" />
                                        <span>+{simulatedResult.diff.toFixed(3)}</span>
                                    </div>
                                )}
                                {simulatedResult.trend === 'down' && (
                                    <div className="flex items-center gap-1 text-rose-700 font-mono text-xs font-semibold">
                                        <TrendingDown className="w-5 h-5" />
                                        <span>{simulatedResult.diff.toFixed(3)}</span>
                                    </div>
                                )}
                                {simulatedResult.trend === 'same' && (
                                    <div className="flex items-center gap-1 text-text-muted font-mono text-xs">
                                        <Minus className="w-5 h-5" />
                                        <span>0.000</span>
                                    </div>
                                )}
                                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider mt-0.5">Net Delta</span>
                            </div>

                            <div className={`rounded-lg p-3 border ${
                                simulatedResult.trend === 'up'
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : simulatedResult.trend === 'down'
                                    ? 'bg-rose-50 border-rose-200'
                                    : 'bg-bg-card border-border'
                            }`}>
                                <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">Simulated CGPA</p>
                                <p className={`font-mono text-xl font-bold ${
                                    simulatedResult.trend === 'up'
                                        ? 'text-emerald-700'
                                        : simulatedResult.trend === 'down'
                                        ? 'text-rose-700'
                                        : 'text-text-primary'
                                }`}>
                                    {simulatedResult.newCGPA.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        <p className="text-center text-xs text-text-muted mt-4 font-mono">
                            {simulatedResult.diff > 0
                                ? `Projected CGPA gain of +${simulatedResult.diff.toFixed(3)} based on course credit weight.`
                                : simulatedResult.diff < 0
                                ? `Projected CGPA reduction of ${simulatedResult.diff.toFixed(3)}.`
                                : 'Grade update yields negligible net CGPA variance.'}
                        </p>

                        {/* Instant Sensitivity Spectrum */}
                        <div className="mt-5 pt-4 border-t border-border">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                                    Instant Sensitivity Spectrum ({selectedSubject.credits} credits):
                                </span>
                                <span className="text-[10px] font-mono text-text-muted">Click to simulate</span>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                {validGrades.map(g => {
                                    const isCurrent = selectedSubject.grade === g;
                                    const isSelected = simulatedGrade === g;
                                    return (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setSimulatedGrade(g)}
                                            className={`p-2.5 rounded-lg text-center border font-mono transition-all ${
                                                isSelected
                                                    ? 'bg-accent text-white border-accent shadow-sm'
                                                    : isCurrent
                                                    ? 'bg-bg-card text-text-primary border-border ring-1 ring-accent/30'
                                                    : 'bg-bg-card text-text-secondary border-border hover:border-border-focus hover:text-text-primary'
                                            }`}
                                        >
                                            <span className="block text-xs font-bold">{g}</span>
                                            <span className="block text-[10px] text-text-muted mt-0.5">
                                                {getGradePointsForRegulation(g, data.regulation)} pts
                                            </span>
                                            {isCurrent && (
                                                <span className="inline-block text-[9px] uppercase px-1 rounded bg-accent/20 text-accent font-semibold mt-1">
                                                    Current
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!selectedSubjectId && (
                <div className="text-center py-6 text-text-muted text-xs font-mono">
                    Select a semester and subject to compute sensitivity metrics.
                </div>
            )}
        </div>
    );
}
