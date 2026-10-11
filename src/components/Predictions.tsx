import { useEffect, useState, useMemo } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { generateHeuristicInsights, getRequiredSGPAForTarget } from '../utils/heuristicInsights';
import { predictSGPA } from '../api/client';
import { getSemesterSGPA } from '../utils/calculations';
import { getStandardSemesterCredits } from '../constants/grading';
import WhatIfCalculator from './WhatIfCalculator';
import EligibilityChecker from './EligibilityChecker';
import SemesterGoals from './SemesterGoals';
import {
    TrendingUp,
    AlertTriangle,
    Target,
    Activity,
    Info,
    Lightbulb,
    Zap,
    BarChart3,
} from 'lucide-react';
import SectionHeader from './ui/SectionHeader';

interface PredictionData {
    prediction?: number | null;
    predicted_sgpa?: number | null;
    confidence?: number | null;
    trend?: string | null;
    insights?: string[];
}

const MILESTONES = [
    { label: 'First Class', target: 6.50, note: 'Basic University Division' },
    { label: 'Distinction', target: 7.50, note: 'First Class with Distinction' },
    { label: 'Honors Threshold', target: 8.00, note: 'Tier-1 Placement Cutoff' },
    { label: 'Dean\'s Honors', target: 8.50, note: 'Top 10% Batch Percentile' },
    { label: 'University Merit', target: 9.00, note: 'Medalist Competitor' },
];

export default function Predictions() {
    const { data, getCGPA } = useAcademic();
    const { cgpa: currentCGPA } = getCGPA();
    const [apiPrediction, setApiPrediction] = useState<PredictionData | null>(null);
    const [targetCGPA, setTargetCGPA] = useState<number>(() => Math.max(7.5, Math.min(9.5, Number((currentCGPA + 0.5).toFixed(2)))));

    const sgpaData = useMemo(() =>
        data.semesters.filter(sem => getSemesterSGPA(sem, data.regulation) > 0),
        [data.semesters, data.regulation]
    );

    const completedCount = sgpaData.length;
    const defaultRemaining = Math.max(1, 8 - completedCount);
    const [remainingSemesters, setRemainingSemesters] = useState<number>(defaultRemaining);

    const isGraduated = completedCount >= 8;
    const insights = generateHeuristicInsights(data.semesters, data.regulation);

    // Calculate maximum theoretical ceiling with 10.0 in all future terms
    const ceilingAnalysis = useMemo(() => {
        const perSem = getStandardSemesterCredits(data.regulation);
        let currentSum = 0;
        let currentCredits = 0;

        for (const sem of sgpaData) {
            const sgpa = getSemesterSGPA(sem, data.regulation);
            const credits = sem.mode === 'manual'
                ? getStandardSemesterCredits(data.regulation)
                : sem.subjects.reduce((sum, s) => sum + s.credits, 0);
            currentSum += sgpa * credits;
            currentCredits += credits;
        }

        const futureCredits = remainingSemesters * perSem;
        const totalCredits = currentCredits + futureCredits;
        if (totalCredits === 0) return { maxCeiling: 10, currentCredits: 0, futureCredits: 0 };

        const maxCeiling = (currentSum + futureCredits * 10) / totalCredits;
        return {
            maxCeiling: Math.min(10, Math.round(maxCeiling * 100) / 100),
            currentCredits,
            futureCredits,
            totalCredits,
        };
    }, [sgpaData, data.regulation, remainingSemesters]);

    // Live feasibility computation
    const liveTargetResult = useMemo(() => {
        return getRequiredSGPAForTarget(
            data.semesters,
            targetCGPA,
            remainingSemesters,
            getStandardSemesterCredits(data.regulation),
            data.regulation,
        );
    }, [data.semesters, targetCGPA, remainingSemesters, data.regulation]);

    useEffect(() => {
        const fetchPrediction = async () => {
            if (sgpaData.length < 2 || isGraduated) return;

            const semesterHistory = sgpaData.map(sem => ({
                year: sem.year,
                sem: sem.sem,
                sgpa: getSemesterSGPA(sem, data.regulation)
            })).filter(s => s.sgpa > 0);

            try {
                const result = await predictSGPA(semesterHistory);
                setApiPrediction(result);
            } catch (e) {
                console.error("API Prediction failed", e);
            }
        };

        fetchPrediction();
    }, [sgpaData, isGraduated, data.regulation]);

    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'trend': return <TrendingUp className="w-4 h-4 text-accent" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
            case 'recovery': return <Zap className="w-4 h-4 text-emerald-600" />;
            case 'performance': return <BarChart3 className="w-4 h-4 text-accent" />;
            case 'volatility': return <Activity className="w-4 h-4 text-amber-600" />;
            default: return <Info className="w-4 h-4 text-text-muted" />;
        }
    };

    return (
        <div className="space-y-6">
            <SectionHeader
                icon={Target}
                title="Goal Planning & Projections"
                subtitle={isGraduated ? 'Degree requirements completed · Academic summary & placement eligibility' : 'CGPA target feasibility, required semester SGPA calculation, and trend forecasting'}
            />

            {/* Academic Executive Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Recorded Cumulative</span>
                    <p className="font-mono text-xl font-bold text-text-primary mt-0.5">
                        {currentCGPA > 0 ? currentCGPA.toFixed(2) : '—'}
                        <span className="text-xs text-text-muted font-normal ml-1">/ 10.0</span>
                    </p>
                    <span className="text-[10px] text-text-muted mt-1 block">
                        {currentCGPA >= 7.5 ? 'First Class Distinction' : currentCGPA >= 6.5 ? 'First Class' : currentCGPA > 0 ? 'Pass Division' : 'No Grades'}
                    </span>
                </div>

                <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Academic Progress</span>
                    <p className="font-mono text-xl font-bold text-accent mt-0.5">
                        {completedCount} <span className="text-xs text-text-muted font-normal">of 8 Terms</span>
                    </p>
                    <span className="text-[10px] text-text-muted mt-1 block font-mono">
                        {8 - completedCount} semester(s) remaining
                    </span>
                </div>

                <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Max Possible CGPA</span>
                    <p className="font-mono text-xl font-bold text-emerald-700 mt-0.5">
                        {ceilingAnalysis.maxCeiling.toFixed(2)}
                    </p>
                    <span className="text-[10px] text-text-muted mt-1 block font-mono">
                        With 10.0 in remaining terms
                    </span>
                </div>

                <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Active Regulation</span>
                    <p className="font-mono text-xl font-bold text-text-primary mt-0.5">
                        {data.regulation}
                    </p>
                    <span className="text-[10px] text-text-muted mt-1 block font-mono">
                        JNTUH Standard Curriculum
                    </span>
                </div>
            </div>

            {/* Target CGPA Feasibility Console */}
            <div className="bg-bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-border gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-semibold px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
                                FEASIBILITY ENGINE
                            </span>
                            <span className="text-xs font-mono text-text-muted">Degree Projection Console</span>
                        </div>
                        <h3 className="text-base font-semibold text-text-primary mt-1">Target CGPA Feasibility Calculator</h3>
                        <p className="text-xs text-text-muted">Model the required term-by-term SGPA performance needed across remaining semesters</p>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <span className="text-[11px] font-mono text-text-muted mr-1">Ceiling:</span>
                        <span className="font-mono text-xs font-bold text-emerald-700 px-2 py-1 rounded bg-surface-subtle border border-border">
                            {ceilingAnalysis.maxCeiling.toFixed(2)} max
                        </span>
                    </div>
                </div>

                {/* Milestone Presets */}
                <div className="mb-6">
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2">
                        Fast Presets & Graduation Milestones:
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {MILESTONES.map((m) => {
                            const isSelected = Math.abs(targetCGPA - m.target) < 0.01;
                            const isPossible = m.target <= ceilingAnalysis.maxCeiling;

                            return (
                                <button
                                    key={m.label}
                                    type="button"
                                    onClick={() => setTargetCGPA(m.target)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border flex items-center gap-2 ${
                                        isSelected
                                            ? 'bg-accent text-white border-accent shadow-sm'
                                            : isPossible
                                            ? 'bg-surface-subtle text-text-secondary border-border hover:border-border-focus hover:text-text-primary'
                                            : 'bg-surface-subtle/50 text-text-muted/60 border-border/40 opacity-70 cursor-not-allowed'
                                    }`}
                                    title={`${m.note} (Target: ${m.target.toFixed(2)})`}
                                >
                                    <span className="font-semibold">{m.target.toFixed(2)}</span>
                                    <span className="text-[10px] opacity-80">{m.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Input Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div className="p-4 rounded-xl bg-surface-subtle border border-border">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-text-primary">Target Cumulative GPA</label>
                            <span className="font-mono text-sm font-bold text-accent">{targetCGPA.toFixed(2)}</span>
                        </div>
                        <input
                            type="range"
                            min="5.0"
                            max="10.0"
                            step="0.05"
                            value={targetCGPA}
                            onChange={(e) => setTargetCGPA(parseFloat(e.target.value) || 5.0)}
                            className="w-full accent-blue-600 cursor-pointer mb-3"
                        />
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-text-muted">5.00 Pass</span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setTargetCGPA(prev => Math.max(5.0, Number((prev - 0.1).toFixed(2))))}
                                    className="px-2 py-0.5 rounded text-xs font-mono bg-bg-card border border-border text-text-primary hover:border-border-focus"
                                >
                                    -0.10
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTargetCGPA(prev => Math.min(10.0, Number((prev + 0.1).toFixed(2))))}
                                    className="px-2 py-0.5 rounded text-xs font-mono bg-bg-card border border-border text-text-primary hover:border-border-focus"
                                >
                                    +0.10
                                </button>
                            </div>
                            <span className="text-[10px] font-mono text-text-muted">10.00 Perfect</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-subtle border border-border">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-text-primary">Semesters Remaining</label>
                            <span className="font-mono text-sm font-bold text-text-primary">{remainingSemesters} semester(s)</span>
                        </div>
                        <div className="grid grid-cols-8 gap-1 mb-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setRemainingSemesters(num)}
                                    className={`py-1.5 rounded text-xs font-mono font-semibold transition-all border ${
                                        remainingSemesters === num
                                            ? 'bg-accent text-white border-accent'
                                            : 'bg-bg-card text-text-muted border-border hover:text-text-primary hover:border-border-focus'
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-text-muted font-mono">
                            Credit weight per semester: ~{getStandardSemesterCredits(data.regulation)} credits
                        </p>
                    </div>
                </div>

                {/* Feasibility Telemetry Card */}
                {liveTargetResult && (
                    <div className={`p-5 rounded-xl border transition-all ${
                        liveTargetResult.achievable
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-rose-50 border-rose-200'
                    }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-border">
                            <div>
                                <span className={`text-[10px] font-mono uppercase tracking-widest font-semibold px-2 py-0.5 rounded border ${
                                    liveTargetResult.achievable
                                        ? 'bg-emerald-100/60 text-emerald-800 border-emerald-300'
                                        : 'bg-rose-100/60 text-rose-800 border-rose-300'
                                }`}>
                                    {liveTargetResult.achievable ? 'MATHEMATICALLY FEASIBLE' : 'TARGET EXCEEDS CEILING'}
                                </span>
                                <h4 className="text-sm font-semibold text-text-primary mt-2">
                                    {liveTargetResult.achievable
                                        ? `Required Average: ${liveTargetResult.required.toFixed(2)} SGPA per remaining semester`
                                        : `Goal Unachievable: Highest possible graduation CGPA is ${ceilingAnalysis.maxCeiling.toFixed(2)}`}
                                </h4>
                            </div>

                            <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Required SGPA</span>
                                <span className={`font-mono text-2xl font-bold ${
                                    liveTargetResult.achievable ? 'text-emerald-700' : 'text-rose-700'
                                }`}>
                                    {liveTargetResult.required > 10 ? '>10.00' : liveTargetResult.required.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Comparative Delta Bracket */}
                        <div className="grid grid-cols-3 gap-3 text-center py-2 mb-2 font-mono text-xs">
                            <div className="p-2.5 rounded-lg bg-surface-subtle border border-border">
                                <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Baseline</span>
                                <span className="font-bold text-text-primary">{currentCGPA > 0 ? currentCGPA.toFixed(2) : '0.00'}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-surface-subtle border border-border flex flex-col justify-center">
                                <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Variance (Δ)</span>
                                <span className={`font-bold ${targetCGPA >= currentCGPA ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {targetCGPA >= currentCGPA ? '+' : ''}{(targetCGPA - currentCGPA).toFixed(2)}
                                </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-surface-subtle border border-border">
                                <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Target</span>
                                <span className="font-bold text-accent">{targetCGPA.toFixed(2)}</span>
                            </div>
                        </div>

                        <p className="text-xs text-text-muted leading-relaxed font-sans mt-3">
                            {liveTargetResult.message}
                        </p>
                    </div>
                )}
            </div>

            {/* Regression Model Prediction - Only for active students with >= 2 terms */}
            {apiPrediction && !isGraduated && (
                <div className="bg-bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between pb-4 mb-5 border-b border-border">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-semibold px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
                                    STATISTICAL INFERENCE
                                </span>
                                <span className="text-xs font-mono text-text-muted">Regression Telemetry</span>
                            </div>
                            <h3 className="text-base font-semibold text-text-primary mt-1">Projected Next Semester SGPA</h3>
                        </div>
                        <span className="text-xs font-mono text-text-muted">
                            Model trained on {sgpaData.length} completed semesters
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                        <div className="p-4 rounded-lg bg-surface-subtle border border-border">
                            <span className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Projected SGPA</span>
                            <p className="text-2xl font-bold text-accent">
                                {apiPrediction.prediction
                                    ? Number(apiPrediction.prediction).toFixed(2)
                                    : (apiPrediction.predicted_sgpa?.toFixed(2) || '—')}
                            </p>
                            <span className="text-[10px] text-text-muted mt-1 block">Expected term performance</span>
                        </div>

                        <div className="p-4 rounded-lg bg-surface-subtle border border-border">
                            <span className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Model Confidence</span>
                            <p className="text-2xl font-bold text-text-primary">
                                {apiPrediction.confidence != null
                                    ? `${(apiPrediction.confidence * 100).toFixed(0)}%`
                                    : '—'}
                            </p>
                            <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">R² regression convergence</span>
                        </div>

                        <div className="p-4 rounded-lg bg-surface-subtle border border-border">
                            <span className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Historical Velocity</span>
                            <div className="flex items-center gap-2 mt-1">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                                <span className="text-lg font-bold text-emerald-700">
                                    {apiPrediction.trend || 'Ascending Trend'}
                                </span>
                            </div>
                            <span className="text-[10px] text-text-muted mt-1 block">Consistent upward trajectory</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Insights */}
            <div className="bg-bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-border">
                    <Lightbulb className="w-4 h-4 text-accent" />
                    <div>
                        <h3 className="text-base font-semibold text-text-primary">Academic Signal Intelligence</h3>
                        <p className="text-xs text-text-muted">Heuristic signal detection across completed semester coursework</p>
                    </div>
                </div>

                {insights.length > 0 ? (
                    <div className="space-y-2.5">
                        {insights.map((insight, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-surface-subtle text-xs"
                            >
                                <div className="mt-0.5 shrink-0">
                                    {getInsightIcon(insight.type)}
                                </div>
                                <div className="flex-1">
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold block mb-0.5">
                                        SIGNAL // {insight.type.toUpperCase()}
                                    </span>
                                    <p className="text-text-secondary leading-relaxed">
                                        {insight.message}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-xs text-text-muted font-mono">
                        Record at least 2 semesters of coursework to compute heuristic telemetry.
                    </div>
                )}
            </div>

            {/* What-If Calculator */}
            <WhatIfCalculator />

            {/* Placement Eligibility Checker */}
            <EligibilityChecker />

            {/* Semester Goals Tracking */}
            <SemesterGoals />
        </div>
    );
}
