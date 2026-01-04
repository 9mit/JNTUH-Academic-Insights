import { useEffect, useState, useMemo } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { generateHeuristicInsights, getRequiredSGPAForTarget } from '../utils/heuristicInsights';
import { predictSGPA } from '../api/client';
import { getSemesterSGPA } from '../utils/calculations';
import WhatIfCalculator from './WhatIfCalculator';
import EligibilityChecker from './EligibilityChecker';
import SemesterGoals from './SemesterGoals';
import {
    Brain,
    TrendingUp,
    AlertTriangle,
    Target,
    Activity,
    Info,
    Lightbulb,
    Zap,
    BarChart,
    Calculator,
} from 'lucide-react';

export default function Predictions() {
    const { data } = useAcademic();
    const [apiPrediction, setApiPrediction] = useState<any>(null);
    const [targetCGPA, setTargetCGPA] = useState<number>(8.5);
    const [remainingSemesters, setRemainingSemesters] = useState<number>(1);
    const [targetResult, setTargetResult] = useState<any>(null);

    const sgpaData = useMemo(() =>
        data.semesters.filter(sem => getSemesterSGPA(sem) > 0),
        [data.semesters]
    );

    // Check if student has completed all 8 semesters (graduated)
    const isGraduated = sgpaData.length >= 8;

    const insights = generateHeuristicInsights(data.semesters);

    // Fetch API prediction only for non-graduated students
    useEffect(() => {
        const fetchPrediction = async () => {
            if (sgpaData.length < 2 || isGraduated) return;

            const semesterHistory = sgpaData.map(sem => ({
                year: sem.year,
                sem: sem.sem,
                sgpa: getSemesterSGPA(sem)
            })).filter(s => s.sgpa > 0);

            try {
                const result = await predictSGPA(semesterHistory);
                setApiPrediction(result.prediction);
            } catch (e) {
                console.error("API Prediction failed", e);
            }
        };

        fetchPrediction();
    }, [sgpaData.length]);

    // Calculate target when inputs change
    const handleCalculateTarget = () => {
        const result = getRequiredSGPAForTarget(data.semesters, targetCGPA, remainingSemesters);
        setTargetResult(result);
    };

    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'trend': return <TrendingUp className="w-4 h-4 text-primary" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
            case 'recovery': return <Zap className="w-4 h-4 text-emerald-400" />;
            case 'performance': return <BarChart className="w-4 h-4 text-purple-400" />;
            case 'volatility': return <Activity className="w-4 h-4 text-orange-400" />;
            default: return <Info className="w-4 h-4 text-text-muted" />;
        }
    };

    const getInsightStyle = (type: string) => {
        switch (type) {
            case 'trend': return 'border-l-primary bg-primary/5';
            case 'warning': return 'border-l-amber-400 bg-amber-500/5';
            case 'recovery': return 'border-l-emerald-400 bg-emerald-500/5';
            case 'performance': return 'border-l-purple-400 bg-purple-500/5';
            case 'volatility': return 'border-l-orange-400 bg-orange-500/5';
            default: return 'border-l-text-muted bg-white/5';
        }
    };

    return (
        <div className="space-y-6">
            {/* AI Prediction Card - Only for non-graduated students */}
            {apiPrediction && !isGraduated && (
                <div className="bg-gradient-to-br from-primary/10 to-bg-card rounded-3xl p-6 border border-primary/20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">AI Prediction</h2>
                            <p className="text-xs text-text-muted">Based on your performance trend</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Next SGPA</p>
                            <p className="text-3xl font-black text-primary">
                                {typeof apiPrediction === 'number'
                                    ? apiPrediction.toFixed(2)
                                    : apiPrediction.predicted_sgpa?.toFixed(2) || '—'}
                            </p>
                        </div>
                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Confidence</p>
                            <p className="text-3xl font-black text-white">
                                {apiPrediction.confidence ? `${(apiPrediction.confidence * 100).toFixed(0)}%` : '85%'}
                            </p>
                        </div>
                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Trend</p>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                <span className="text-lg font-bold text-emerald-400">
                                    {apiPrediction.trend || 'Positive'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Insights Section */}
            <div className="bg-bg-card rounded-3xl p-6 border border-white/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Smart Insights</h2>
                        <p className="text-xs text-text-muted">Performance analysis and recommendations</p>
                    </div>
                </div>

                {insights.length > 0 ? (
                    <div className="space-y-3">
                        {insights.map((insight, index) => (
                            <div
                                key={index}
                                className={`flex items-start gap-3 p-4 rounded-xl border-l-4 ${getInsightStyle(insight.type)}`}
                            >
                                <div className="mt-0.5">
                                    {getInsightIcon(insight.type)}
                                </div>
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    {insight.message}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Zap className="w-10 h-10 text-text-muted mx-auto mb-3" />
                        <p className="text-white font-medium">No insights yet</p>
                        <p className="text-sm text-text-muted">Add data for at least 2 semesters to see insights</p>
                    </div>
                )}
            </div>

            {/* Target Calculator - NOW FUNCTIONAL */}
            <div className="bg-bg-card rounded-3xl p-6 border border-white/5">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Target className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Target CGPA Calculator</h2>
                        <p className="text-xs text-text-muted">Calculate required SGPA to reach your goal</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-[10px] font-bold text-text-muted mb-2 uppercase tracking-wider">
                            Target CGPA
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min="5"
                            max="10"
                            value={targetCGPA}
                            onChange={(e) => setTargetCGPA(parseFloat(e.target.value) || 8.5)}
                            className="input-field w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-text-muted mb-2 uppercase tracking-wider">
                            Remaining Semesters
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="8"
                            value={remainingSemesters}
                            onChange={(e) => setRemainingSemesters(parseInt(e.target.value) || 1)}
                            className="input-field w-full"
                        />
                    </div>
                </div>

                <button
                    onClick={handleCalculateTarget}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    <Calculator className="w-4 h-4" />
                    Calculate Required SGPA
                </button>

                {/* Result Display */}
                {targetResult && (
                    <div className={`mt-4 p-4 rounded-xl border ${targetResult.achievable ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-text-muted">Required SGPA</span>
                            <span className={`text-2xl font-black ${targetResult.achievable ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {targetResult.required?.toFixed(2) || '—'}
                            </span>
                        </div>
                        <p className="text-sm text-text-secondary">
                            {targetResult.message}
                        </p>
                    </div>
                )}
            </div>

            {/* What-If Calculator */}
            <WhatIfCalculator />

            {/* Eligibility Checker */}
            <EligibilityChecker />

            {/* Semester Goals */}
            <SemesterGoals />
        </div>
    );
}
