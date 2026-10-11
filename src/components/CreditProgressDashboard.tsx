import { useMemo } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { getRequiredCredits } from '../constants/grading';
import {
    getCreditsStats,
    getYearEarnedCredits,
    getSemesterCredits,
    hasSemesterData,
} from '../utils/calculations';
import { Award, AlertCircle, CheckCircle2, ShieldCheck, FileCheck2 } from 'lucide-react';
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

    let statusLabel = 'Good Standing · On Track';
    let statusClass = 'text-accent';
    if (canGraduate) {
        statusLabel = 'Degree Requirements Satisfied';
        statusClass = 'text-emerald-700';
    } else if (lost > 0) {
        statusLabel = `${lost} Credits Pending Clearance`;
        statusClass = 'text-amber-800';
    } else if (creditsMet && !cgpaMet) {
        statusLabel = 'Credits Met · CGPA Below 5.0 Threshold';
        statusClass = 'text-rose-700';
    }

    return (
        <div className="space-y-6 pb-4">
            <SectionHeader
                icon={FileCheck2}
                title="Degree Credit Audit"
                subtitle={`Regulation: ${data.regulation} · Minimum required for B.Tech degree conferment: ${required} credits`}
            />

            {/* Primary Credit Audit Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-5 border border-border-subtle">
                    <span className="stat-label">Credits Earned</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className="stat-value text-accent">{earned}</p>
                        <span className="text-xs font-mono text-text-muted">/ {required} min</span>
                    </div>
                    <p className="text-xs text-text-muted font-mono mt-2">
                        {earned >= required ? (
                            <span className="text-emerald-700 font-semibold">
                                Minimum threshold satisfied (+{earned - required} excess credits)
                            </span>
                        ) : (
                            <span>{remaining} credits needed for graduation</span>
                        )}
                    </p>
                </div>

                <div className="card p-5 border border-border">
                    <span className="stat-label">Curriculum Progress</span>
                    <p className="stat-value text-text-primary mt-1">{progressPct}%</p>
                    <div className="h-2 bg-border rounded-full overflow-hidden mt-3">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${
                                canGraduate ? 'bg-emerald-600' : 'bg-accent'
                            }`}
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>

                <div className="card p-5 border border-border">
                    <span className="stat-label">Academic Graduation Status</span>
                    <div className="flex items-center gap-2.5 mt-2">
                        {canGraduate ? (
                            <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : lost > 0 || (creditsMet && !cgpaMet) ? (
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        ) : (
                            <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                        )}
                        <p className={`text-sm font-semibold font-mono ${statusClass}`}>
                            {statusLabel}
                        </p>
                    </div>
                </div>
            </div>

            {/* Year-by-Year Distribution */}
            <div className="card p-5 sm:p-6 border border-border">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-text-primary">Year-wise Credit Progression</h3>
                    <p className="text-xs text-text-muted mt-0.5">
                        Yearly load distribution reconstructed from official term records under {data.regulation}.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {yearProgress.map(({ year, credits, label, barPct, semesters }) => (
                        <div key={year} className="rounded-lg p-4 border border-border bg-surface-subtle font-mono">
                            <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                                <span className="font-sans font-medium text-text-primary">{label}</span>
                                <span className="text-[10px] uppercase">Year {year}</span>
                            </div>
                            <p className="text-2xl font-bold text-accent tabular-nums">
                                {credits}
                                <span className="text-xs text-text-muted font-normal ml-1">credits</span>
                            </p>
                            {semesters.length > 0 && (
                                <p className="text-[11px] text-text-muted mt-2 tabular-nums">
                                    {semesters.map((s) => `Sem ${s.sem}: ${s.credits}cr`).join(' · ')}
                                </p>
                            )}
                            <div className="mt-3 h-1.5 bg-border-subtle rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-accent-blue rounded-full transition-all duration-300"
                                    style={{ width: `${barPct}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Promotion & Detention Criteria Guidelines */}
            <div className="card p-5 border border-border-subtle bg-bg-card-subtle">
                <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-accent-blue-bright shrink-0" />
                    <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-primary">
                        JNTUH Credit Detention & Promotion Guidelines ({data.regulation})
                    </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-text-muted font-mono leading-relaxed">
                    <div className="p-3 rounded border border-border-subtle bg-bg-card">
                        <strong className="text-text-primary block font-sans mb-1">Promotion to II Year</strong>
                        Must secure minimum 50% of total credits registered in regular I Year examinations (both semesters combined).
                    </div>
                    <div className="p-3 rounded border border-border-subtle bg-bg-card">
                        <strong className="text-text-primary block font-sans mb-1">Promotion to III Year</strong>
                        Must secure minimum 60% of total credits registered across I Year and II Year (up to 2-2 semester).
                    </div>
                    <div className="p-3 rounded border border-border-subtle bg-bg-card">
                        <strong className="text-text-primary block font-sans mb-1">Promotion to IV Year</strong>
                        Must secure minimum 60% of total credits registered across I, II, and III Years (up to 3-2 semester).
                    </div>
                </div>
            </div>
        </div>
    );
}
