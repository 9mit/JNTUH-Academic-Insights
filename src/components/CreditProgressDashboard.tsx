import { useMemo } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { REGULATION_CREDITS } from '../constants/grading';
import { getCreditsStats, getYearEarnedCredits } from '../utils/calculations';
import { motion } from 'framer-motion';
import { Award, TrendingUp, AlertCircle, Coins } from 'lucide-react';
import SectionHeader from './ui/SectionHeader';

const YEAR_LABELS = ['I Year', 'II Year', 'III Year', 'IV Year'];

export default function CreditProgressDashboard() {
    const { data } = useAcademic();
    const required = REGULATION_CREDITS[data.regulation] ?? 160;
    const { earned, lost } = getCreditsStats(data.semesters, data.regulation);
    const yearTarget = Math.round(required / 4);

    const yearProgress = useMemo(() => {
        return [1, 2, 3, 4].map((year) => {
            const credits = getYearEarnedCredits(data.semesters, year, data.regulation);
            return {
                year,
                credits,
                target: yearTarget,
                label: YEAR_LABELS[year - 1],
            };
        });
    }, [data.semesters, data.regulation, yearTarget]);

    const progressPct = Math.min(100, Math.round((earned / required) * 100));
    const canGraduate = earned >= required && lost === 0;

    return (
        <div className="space-y-6 pb-2">
            <SectionHeader
                icon={Coins}
                title="Credit tracker"
                subtitle={`${data.regulation} · API credits · minimum ${required} to graduate`}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-5 sm:p-6">
                    <p className="field-label mb-2">Credits earned</p>
                    <p className="text-3xl font-bold text-primary font-heading tracking-tight">{earned}</p>
                    <p className="text-sm text-text-muted mt-2">
                        minimum for degree: {required}
                        {earned > required ? (
                            <span className="block text-[11px] text-emerald-400/90 mt-1">
                                {earned - required} above minimum (allowed)
                            </span>
                        ) : null}
                    </p>
                </div>
                <div className="card p-5 sm:p-6">
                    <p className="field-label mb-2">Progress</p>
                    <p className="text-3xl font-bold text-white font-heading tracking-tight mb-3">{progressPct}%</p>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full bg-gradient-to-r from-blue-600 to-red-600 rounded-full"
                        />
                    </div>
                </div>
                <div className="card p-5 sm:p-6">
                    <p className="field-label mb-2">Status</p>
                    <div className="flex items-center gap-2.5 mt-2">
                        {canGraduate ? (
                            <Award className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : lost > 0 ? (
                            <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
                        ) : (
                            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                        )}
                        <p className="text-base font-semibold text-white font-heading">
                            {canGraduate ? 'Degree ready' : lost > 0 ? `${lost} credits at risk` : 'On track'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="card p-5 sm:p-6">
                <h3 className="text-base font-bold text-white font-heading mb-4">Year-wise progress</h3>
                <p className="text-xs text-text-muted mb-4">
                    From API semesterCredits · target ≈ {yearTarget}/year ({required} ÷ 4 for {data.regulation})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {yearProgress.map(({ year, credits, target, label }) => {
                        const pct = Math.min(100, Math.round((credits / target) * 100));
                        return (
                            <div key={year} className="rounded-2xl p-4 border border-white/[0.06] bg-white/[0.02]">
                                <p className="text-sm font-semibold text-white mb-2">{label}</p>
                                <p className="text-2xl font-bold text-primary font-heading tracking-tight">
                                    {credits}
                                    <span className="text-sm text-text-muted font-medium">/{target}</span>
                                </p>
                                <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <p className="text-[0.7rem] text-text-muted text-center tracking-wide pt-1 pb-2">
                Earned {earned} · Lost {lost} · Minimum {required} · {data.regulation}
            </p>
        </div>
    );
}
