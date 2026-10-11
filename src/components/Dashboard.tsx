import { useAcademic } from '../context/AcademicContext';
import { PerformanceReport } from './PerformanceReport';
import SGPATrendLine from './charts/SGPATrendLine';
import YearlyBarChart from './charts/YearlyBarChart';
import GradeDistribution from './charts/GradeDistribution';
import CreditsChart from './charts/CreditsChart';
import SubjectInsights from './charts/SubjectInsights';
import BacklogsList from './charts/BacklogsList';
import QuickConverter from './QuickConverter';
import ActionButtons from './ActionButtons';
import StudentStatusCard from './StudentStatusCard';
import AllAttemptsAudit from './AllAttemptsAudit';
import { hasSemesterData } from '../utils/calculations';
import { getRequiredCredits } from '../constants/grading';
import { LayoutDashboard, Award, Percent, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
    const { getCGPA, data } = useAcademic();
    const { cgpa, percentage, totalCredits } = getCGPA();
    const requiredCredits = getRequiredCredits(data.regulation);

    const semestersWithData = data.semesters.filter(hasSemesterData).length;

    if (semestersWithData === 0) {
        return (
            <div className="empty-state select-none">
                <div className="empty-state-icon">
                    <LayoutDashboard className="w-6 h-6 text-accent-blue-bright" />
                </div>
                <h2 className="empty-state-title">
                    No academic records loaded
                </h2>
                <p className="empty-state-desc">
                    Import results via hall ticket auto-fetch or upload memo PDFs to generate comprehensive performance metrics, credit tracking, and grade distribution.
                </p>
            </div>
        );
    }

    const distinctRegulations = Array.from(
        new Set(data.semesters.map((s) => s.regulation).filter(Boolean))
    ) as string[];
    const isMultiRegulation = distinctRegulations.length > 1;

    let academicClass = 'Pass Class';
    if (cgpa >= 8.5) academicClass = 'First Class with Distinction';
    else if (cgpa >= 7.0) academicClass = 'First Class';
    else if (cgpa >= 6.0) academicClass = 'Second Class';

    const semStatusList = [
        { label: '1-1', sem: data.semesters.find(s => s.year === 1 && s.sem === 1) },
        { label: '1-2', sem: data.semesters.find(s => s.year === 1 && s.sem === 2) },
        { label: '2-1', sem: data.semesters.find(s => s.year === 2 && s.sem === 1) },
        { label: '2-2', sem: data.semesters.find(s => s.year === 2 && s.sem === 2) },
        { label: '3-1', sem: data.semesters.find(s => s.year === 3 && s.sem === 1) },
        { label: '3-2', sem: data.semesters.find(s => s.year === 3 && s.sem === 2) },
        { label: '4-1', sem: data.semesters.find(s => s.year === 4 && s.sem === 1) },
        { label: '4-2', sem: data.semesters.find(s => s.year === 4 && s.sem === 2) },
    ].map(item => {
        const hasData = item.sem && hasSemesterData(item.sem);
        const hasBacklog = item.sem?.subjects?.some(s => s.grade === 'F' || s.grade === 'Ab');
        return {
            label: item.label,
            hasData,
            status: !hasData ? 'pending' : hasBacklog ? 'backlog' : 'cleared'
        };
    });

    const creditPercent = Math.min(100, Math.round((totalCredits / requiredCredits) * 100));

    return (
        <div className="space-y-6 select-none">
            {isMultiRegulation && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                        Multi-regulation career reconstructed:{' '}
                        <strong className="font-semibold text-text-primary">{distinctRegulations.join(' → ')}</strong>
                    </span>
                </div>
            )}

            {/* Dashboard Header Bar */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-4 border-b border-border">
                <div>
                    <h2 className="text-xl font-bold text-text-primary tracking-tight">Academic Overview</h2>
                    <p className="text-xs text-text-muted mt-0.5 font-mono">
                        Regulation: <span className="font-semibold text-accent">{data.regulation}</span> · Official JNTUH weighted grading scheme
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto no-print">
                    <div className="w-full sm:w-auto shrink">
                        <PerformanceReport />
                    </div>
                    <div className="shrink-0">
                        <ActionButtons />
                    </div>
                </div>
            </div>

            {/* Dynamic Result Audit Info (If present) */}
            {data.resolutionAudit && data.resolutionAudit.length > 0 && (
                <div className="card p-4 border border-border bg-surface-subtle space-y-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <span className="text-xs font-mono font-medium text-text-primary uppercase tracking-wider">
                            Result Traversals Across Regulations
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap font-mono">
                            {data.resolutionAudit.map((item, idx) => (
                                <span
                                    key={idx}
                                    className={`text-[11px] px-2 py-0.5 rounded border ${
                                        item.status === 'FOUND'
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                            : item.status === 'SOURCE_ERROR'
                                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                                            : 'bg-white border-border text-text-muted'
                                    }`}
                                >
                                    {item.regulation}: {item.status === 'FOUND' ? `${item.semesters_found} sems` : 'checked'}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Standing Card */}
            <StudentStatusCard />

            {/* Primary Metrics Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CGPA with SVG Progress Ring */}
                <div className="glass-card-interactive p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="stat-label">Cumulative GPA</span>
                        <div className="relative w-9 h-9 flex items-center justify-center">
                            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                                <circle
                                    cx="18" cy="18" r="14"
                                    className="stroke-border"
                                    strokeWidth="3.5"
                                    fill="none"
                                />
                                <circle
                                    cx="18" cy="18" r="14"
                                    className={
                                        cgpa >= 8.5 ? "stroke-accent" :
                                        cgpa >= 7.0 ? "stroke-blue-600" :
                                        cgpa >= 6.0 ? "stroke-indigo-600" :
                                        "stroke-amber-500"
                                    }
                                    strokeWidth="3.5"
                                    strokeDasharray="88"
                                    strokeDashoffset={88 - (88 * (cgpa / 10))}
                                    strokeLinecap="round"
                                    fill="none"
                                />
                            </svg>
                            <Award className="w-3.5 h-3.5 absolute text-accent" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="stat-value text-3xl font-extrabold text-text-primary font-mono">{cgpa > 0 ? cgpa.toFixed(2) : '0.00'}</p>
                        <span className="text-xs font-mono text-text-muted">/ 10.0</span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                            cgpa >= 8.5 ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                            cgpa >= 7.0 ? "bg-blue-50 border-blue-200 text-blue-700" :
                            cgpa >= 6.0 ? "bg-indigo-50 border-indigo-200 text-indigo-700" :
                            "bg-amber-50 border-amber-200 text-amber-700"
                        }`}>
                            {academicClass}
                        </span>
                    </div>
                </div>

                {/* Percentage Score */}
                <div className="glass-card-interactive p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="stat-label">Percentage Score</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                            <Percent className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="stat-value text-3xl font-extrabold text-text-primary font-mono">{percentage > 0 ? `${percentage.toFixed(1)}%` : '—'}</p>
                    </div>
                    <p className="text-[11px] font-mono text-text-muted mt-2.5 flex items-center gap-1">
                        <span>Formula:</span>
                        <span className="text-text-secondary">(CGPA - 0.5) × 10</span>
                    </p>
                </div>

                {/* Earned Credits with Progress Bar */}
                <div className="glass-card-interactive p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="stat-label">Earned Credits</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                            <BookOpen className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="stat-value text-3xl font-extrabold text-text-primary font-mono">{totalCredits}</p>
                        <span className="text-xs font-mono text-text-muted">/ {requiredCredits} min</span>
                    </div>
                    <div className="mt-2.5 space-y-1">
                        <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-accent h-full rounded-full transition-all duration-500"
                                style={{ width: `${creditPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-text-muted">
                            <span>{creditPercent}% Degree Cleared</span>
                            <span>{totalCredits >= requiredCredits ? 'Satisfied' : `${requiredCredits - totalCredits} req.`}</span>
                        </div>
                    </div>
                </div>

                {/* Recorded Semesters Matrix */}
                <div className="glass-card-interactive p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="stat-label">Recorded Semesters</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-accent border border-blue-200 flex items-center justify-center">
                            <Layers className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="stat-value text-3xl font-extrabold text-text-primary font-mono">{semestersWithData}</p>
                        <span className="text-xs font-mono text-text-muted">/ 8</span>
                    </div>
                    {/* Visual Semester Status Chips */}
                    <div className="mt-2.5 grid grid-cols-4 gap-1 font-mono text-[9px] text-center">
                        {semStatusList.map((item) => (
                            <div
                                key={item.label}
                                className={`py-0.5 rounded border transition-colors ${
                                    item.status === 'cleared'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
                                        : item.status === 'backlog'
                                        ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
                                        : 'bg-surface-subtle border-border text-text-muted'
                                }`}
                                title={`${item.label}: ${item.status}`}
                            >
                                {item.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Performance Analytics: Trajectory & Grade Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-8 card p-5 border border-border">
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-text-primary">Semester SGPA Trajectory</h3>
                        <p className="text-xs text-text-muted mt-0.5 font-mono">Weighted term-by-term progression</p>
                    </div>
                    <SGPATrendLine />
                </div>

                <div className="lg:col-span-4 card p-5 border border-border">
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-text-primary">Grade Distribution</h3>
                        <p className="text-xs text-text-muted mt-0.5 font-mono">Count by letter grade across all exams</p>
                    </div>
                    <GradeDistribution />
                </div>
            </div>

            {/* Annual Performance & Credit Allocation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-6 card p-5 border border-border">
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-text-primary">Annual SGPA Average</h3>
                        <p className="text-xs text-text-muted mt-0.5 font-mono">Mean performance by academic year</p>
                    </div>
                    <YearlyBarChart />
                </div>

                <div className="lg:col-span-6 card p-5 border border-border">
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-text-primary">Degree Credit Audit</h3>
                        <p className="text-xs text-text-muted mt-0.5 font-mono">Earned vs lost vs degree minimum</p>
                    </div>
                    <CreditsChart />
                </div>
            </div>

            {/* Subject-Level Deep Dive */}
            <SubjectInsights />

            {/* Complete Exam Attempt History (Regular + Supple) */}
            <AllAttemptsAudit />

            {/* Backlogs & Quick Converter */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-6">
                    <BacklogsList />
                </div>
                <div className="lg:col-span-6">
                    <QuickConverter />
                </div>
            </div>
        </div>
    );
}
