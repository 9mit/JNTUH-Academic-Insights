import { useState, useMemo } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { calculateCGPA } from '../utils/calculations';
import { GRADES, GRADE_POINTS, getSemesterLabel } from '../constants/grading';
import type { Grade, Semester } from '../types';
import { FlaskConical, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WhatIfCalculator() {
    const { data } = useAcademic();
    const [selectedSemId, setSelectedSemId] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
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

    // Calculate current CGPA
    const currentCGPA = calculateCGPA(data.semesters).cgpa;

    // Calculate simulated CGPA
    const simulatedResult = useMemo(() => {
        if (!selectedSubject || !selectedSemester) return null;

        // Clone semesters and modify the selected subject's grade
        const modifiedSemesters: Semester[] = data.semesters.map(sem => {
            if (sem.id !== selectedSemId) return sem;

            return {
                ...sem,
                subjects: sem.subjects.map(sub => {
                    if (sub.id !== selectedSubjectId) return sub;
                    return { ...sub, grade: simulatedGrade };
                }),
            };
        });

        const newResult = calculateCGPA(modifiedSemesters);
        const diff = newResult.cgpa - currentCGPA;

        return {
            newCGPA: newResult.cgpa,
            diff,
            trend: diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'same',
        };
    }, [selectedSubject, selectedSemester, simulatedGrade, data.semesters, currentCGPA, selectedSemId, selectedSubjectId]);

    // Reset subject when semester changes
    const handleSemesterChange = (semId: string) => {
        setSelectedSemId(semId);
        setSelectedSubjectId('');
    };

    if (detailedSemesters.length === 0) {
        return (
            <div className="bg-bg-card rounded-3xl p-6 border border-white/5 text-center">
                <FlaskConical className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-white font-medium">No detailed data available</p>
                <p className="text-sm text-text-muted mt-1">Add subjects in Detailed Mode to use the What-If Calculator</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-purple-500/10 to-bg-card rounded-3xl p-6 border border-purple-500/20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <FlaskConical className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">What-If Calculator</h3>
                    <p className="text-xs text-text-muted">Simulate grade changes to see CGPA impact</p>
                </div>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Semester Selector */}
                <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                        Select Semester
                    </label>
                    <select
                        value={selectedSemId}
                        onChange={(e) => handleSemesterChange(e.target.value)}
                        className="input-field w-full"
                    >
                        <option value="">Choose...</option>
                        {detailedSemesters.map(sem => (
                            <option key={sem.id} value={sem.id}>
                                {getSemesterLabel(sem.year, sem.sem)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Subject Selector */}
                <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                        Select Subject
                    </label>
                    <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="input-field w-full"
                        disabled={!selectedSemId}
                    >
                        <option value="">Choose...</option>
                        {subjects.map(sub => (
                            <option key={sub.id} value={sub.id}>
                                {sub.name} ({sub.grade})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Grade Selector */}
                <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                        New Grade
                    </label>
                    <select
                        value={simulatedGrade}
                        onChange={(e) => setSimulatedGrade(e.target.value as Grade)}
                        className="input-field w-full"
                        disabled={!selectedSubjectId}
                    >
                        {GRADES.filter(g => g !== 'Ab').map(grade => (
                            <option key={grade} value={grade}>
                                {grade} ({GRADE_POINTS[grade]} points)
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
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-black/30 rounded-2xl p-5 border border-white/5"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs text-text-muted mb-1">Simulating...</p>
                                <p className="text-sm text-white">
                                    <span className="font-medium">{selectedSubject.name}</span>
                                    <span className="text-text-muted mx-2">→</span>
                                    <span className={`font-bold ${simulatedGrade === 'F' ? 'text-rose-400' : 'text-emerald-400'
                                        }`}>{simulatedGrade}</span>
                                </p>
                            </div>
                            <Sparkles className="w-5 h-5 text-purple-400" />
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-black/20 rounded-xl p-3">
                                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Current</p>
                                <p className="text-xl font-black text-white">{currentCGPA.toFixed(2)}</p>
                            </div>

                            <div className="flex items-center justify-center">
                                {simulatedResult.trend === 'up' && <TrendingUp className="w-8 h-8 text-emerald-400" />}
                                {simulatedResult.trend === 'down' && <TrendingDown className="w-8 h-8 text-rose-400" />}
                                {simulatedResult.trend === 'same' && <Minus className="w-8 h-8 text-text-muted" />}
                            </div>

                            <div className={`rounded-xl p-3 ${simulatedResult.trend === 'up'
                                ? 'bg-emerald-500/20'
                                : simulatedResult.trend === 'down'
                                    ? 'bg-rose-500/20'
                                    : 'bg-black/20'
                                }`}>
                                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">New CGPA</p>
                                <p className={`text-xl font-black ${simulatedResult.trend === 'up'
                                    ? 'text-emerald-400'
                                    : simulatedResult.trend === 'down'
                                        ? 'text-rose-400'
                                        : 'text-white'
                                    }`}>
                                    {simulatedResult.newCGPA.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        <p className="text-center text-sm text-text-muted mt-4">
                            {simulatedResult.diff > 0
                                ? `+${simulatedResult.diff.toFixed(3)} improvement`
                                : simulatedResult.diff < 0
                                    ? `${simulatedResult.diff.toFixed(3)} decrease`
                                    : 'No change'}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {!selectedSubjectId && (
                <div className="text-center py-6 text-text-muted text-sm">
                    Select a semester and subject to simulate grade changes
                </div>
            )}
        </div>
    );
}
