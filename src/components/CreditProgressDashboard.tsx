import { useMemo } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { getRequiredCredits } from '../constants/grading';
import {
    getCreditsStats,
    getYearEarnedCredits,
    getSemesterCredits,
    hasSemesterData,
} from '../utils/calculations';
import { motion } from 'framer-motion';
import { Award, TrendingUp, AlertCircle, Coins } from 'lucide-react';
import SectionHeader from './ui/SectionHeader';

const YEAR_LABELS = ['I Year', 'II Year', 'III Year', 'IV Year'];
const MIN_DEGREE_CGPA = 5.0;

export default function CreditProgressDashboard() {
    const { data, getCGPA } = useAcademic();
    const required = getRequiredCredits(data.regulation);
    const { earned, lost } = getCreditsStats(data.semesters, data.regulation);
    const { cgpa } = getCGPA();

    const yearProgress = useMemo(() => {
        const rows = [1, 2, 3, 4].map((year) => {
            const credits = getYearEarnedCredits(data.semesters, year, data.regulation);
            const semesters = data.semesters
                .filter((s) => s.year === year && hasSemesterData(s))
                .map((s) => ({
                    sem: s.sem,
                    credits: getSemesterCredits(s, data.regulation),
                }))
                .sort((a, b) => a.sem - b.sem);
            return {
                year,
                credits,
                semesters,
                label: YEAR_LABELS[year - 1],
            };
        });
        const peak = Math.max(1, ...rows.map((r) => r.credits));
        return rows.map((r) => ({
            ...r,
            barPct: Math.round((r.credits / peak) * 100),
        }));
    }, [data.semesters, data.regulation]);

    const progressPct = Math.min(100, Math.round((earned / required) * 100));
    const creditsMet = earned >= required;
    const cgpaMet = cgpa >= MIN_DEGREE_CGPA;
    const canGraduate = creditsMet && lost === 0 && cgpaMet;
    const remaining = Math.max(0, required - earned);

    let statusLabel = 'On track';
    if (canGraduate) {
        statusLabel = 'Degree ready';
    } else if (lost > 0) {
        statusLabel = `${lost} credits at risk`;
    } else if (creditsMet && !cgpaMet) {
        statusLabel = 'Credits met · CGPA below 5.0';
    }

    return (
        <div className="space-y-6 pb-2">
            <SectionHeader
                icon={Coins}
                title="Credit tracker"
                subtitle={`${data.regulation} · official semester credits · ${required} required to graduate`}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-5 sm:p-6">
                    <p className="field-label mb-2">Credits earned</p>
                    <p className="text-3xl font-bold text-primary font-heading tracking-tight">{earned}</p>
                    <p className="text-sm text-text-muted mt-2">
                        of {required} minimum ({data.regulation})
                        {earned > required ? (
                            <span className="block text-[11px] text-emerald-400/90 mt-1">
                                {earned - required} above minimum (allowed)
                            </span>
                        ) : remaining > 0 ? (
                            <span className="block text-[11px] text-text-muted mt-1">
                                {remaining} still needed
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
                            className={`h-full rounded-full ${
                                canGraduate
                                    ? 'bg-emerald-500'
                                    : 'bg-gradient-to-r from-blue-600 to-primary'
                            }`}
                        />
                    </div>
                </div>
                <div className="card p-5 sm:p-6">
                    <p className="field-label mb-2">Status</p>
                    <div className="flex items-center gap-2.5 mt-2">
                        {canGraduate ? (
                            <Award className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : lost > 0 || (creditsMet && !cgpaMet) ? (
                            <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
                        ) : (
                            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                        )}
                        <p className="text-base font-semibold text-white font-heading">
                            {statusLabel}
                        </p>
                    </div>
                </div>
            </div>

            <div className="card p-5 sm:p-6">
                <h3 className="text-base font-bold text-white font-heading mb-1">Year-wise distribution</h3>
                <p className="text-xs text-text-muted mb-4">
                    {data.regulation} requires {required} credits total. Year loads come from your results
                    (API / PDF / manual) — not an even split. Bars compare years to each other.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {yearProgress.map(({ year, credits, label, barPct, semesters }) => (
                        <div key={year} className="rounded-2xl p-4 border border-white/[0.06] bg-white/[0.02]">
                            <p className="text-sm font-semibold text-white mb-2">{label}</p>
                            <p className="text-2xl font-bold text-primary font-heading tracking-tight">
                                {credits}
                                <span className="text-sm text-text-muted font-medium"> credits</span>
                            </p>
                            {semesters.length > 0 && (
                                <p className="text-[11px] text-text-muted mt-1.5 tabular-nums">
                                    {semesters.map((s) => `Sem ${s.sem}: ${s.credits}`).join(' · ')}
                                </p>
                            )}
                            <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                    style={{ width: `${barPct}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <p className="text-[0.7rem] text-text-muted text-center tracking-wide pt-1 pb-2">
                Earned {earned} · Lost {lost} · Minimum {required} · {data.regulation}
            </p>
        </div>
    );
}
