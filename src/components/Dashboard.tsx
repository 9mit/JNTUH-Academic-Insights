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
import { hasSemesterData } from '../utils/calculations';

import { Award, TrendingUp, BookOpen, Calendar, Sparkles, LayoutDashboard, Zap } from 'lucide-react';

export default function Dashboard() {
    const { getCGPA, data } = useAcademic();
    const { cgpa, percentage, totalCredits } = getCGPA();

    const semestersWithData = data.semesters.filter(hasSemesterData).length;

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    if (semestersWithData === 0) {
        return (
            <div className="empty-state relative select-none">
                <div className="empty-state-icon">
                    <Sparkles className="w-8 h-8 text-[var(--accent-blue-bright)]" />
                </div>
                <h2 className="empty-state-title">
                    No results in this session
                </h2>
                <p className="empty-state-desc">
                    Import a hall ticket or memo PDF from <strong className="text-white font-medium">Import Results</strong> to unlock trends, grade distribution, and credit progress.
                </p>
            </div>
        );
    }

    const distinctRegulations = Array.from(
        new Set(data.semesters.map((s) => s.regulation).filter(Boolean))
    ) as string[];
    const isMultiRegulation = distinctRegulations.length > 1;

    return (
        <div className="space-y-8 select-none">
            {isMultiRegulation && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                        Consolidated Academic Record reconstructed across regulations:{' '}
                        <strong className="font-semibold text-white">{distinctRegulations.join(' → ')}</strong>
                    </span>
                </div>
            )}

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 border-b border-white/[0.06] pb-5">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <LayoutDashboard className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white font-heading tracking-tight">Academic overview</h2>
                        <p className="text-[0.65rem] text-text-muted font-heading font-semibold uppercase tracking-[0.14em] mt-0.5">Weighted CGPA · official formula</p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full xl:w-auto no-print">
                    <div className="w-full md:w-auto max-w-lg shrink">
                        <PerformanceReport />
                    </div>
                    <div className="shrink-0">
                        <ActionButtons />
                    </div>
                </div>
            </div>

            <StudentStatusCard />

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-6">
                    <div
                        onMouseMove={handleMouseMove}
                        className="card glowing-card p-8 border border-white/5 relative overflow-hidden h-full"
                    >
                        <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

                        <div className="relative">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/5 flex items-center justify-center border border-primary/25 shadow-md shadow-primary/5">
                                    <Award className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-[0.65rem] font-bold text-primary uppercase tracking-[0.14em] font-heading">Cumulative GPA</p>
                                    <p className="text-text-muted text-xs mt-0.5">Official JNTUH weighted formula</p>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-4 mb-4">
                                <p className="text-7xl lg:text-8xl font-bold text-white tracking-tighter font-heading leading-none">
                                    {cgpa > 0 ? cgpa.toFixed(2) : '0.00'}
                                </p>
                                <span className="text-[0.65rem] font-bold px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg font-heading uppercase tracking-wider">
                                    CGPA
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold font-heading text-text-secondary border-t border-white/5 pt-4">
                                <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                                <span>Academic Class:</span>
                                <span className="text-white font-extrabold">
                                    {cgpa >= 8.5 ? 'FIRST CLASS WITH DISTINCTION' : cgpa >= 7.0 ? 'FIRST CLASS' : 'PASSING'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-3">
                    <div
                        onMouseMove={handleMouseMove}
                        className="bg-gradient-to-br from-orange-500/5 to-bg-card rounded-[32px] p-6 border border-orange-500/15 flex flex-col justify-between relative overflow-hidden h-full card glowing-card"
                    >
                        <div>
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-500/5 flex items-center justify-center mb-6 border border-orange-500/20 shadow-md">
                                <TrendingUp className="w-6 h-6 text-orange-400" />
                            </div>
                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest font-heading mb-1">Percentage Score</p>
                            <p className="text-4xl lg:text-5xl font-black text-white font-heading tracking-tight">{percentage > 0 ? `${percentage.toFixed(1)}%` : '—'}</p>
                        </div>
                        <p className="text-[9px] text-text-muted font-heading uppercase font-bold tracking-wider mt-4">Formula: (CGPA - 0.5) * 10</p>
                    </div>
                </div>

                <div className="col-span-12 sm:col-span-6 lg:col-span-3 grid grid-rows-2 gap-4">
                    <div
                        onMouseMove={handleMouseMove}
                        className="bg-gradient-to-br from-emerald-500/5 to-bg-card rounded-[24px] p-5 border border-emerald-500/15 flex items-center gap-4 relative overflow-hidden card glowing-card"
                    >
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-white font-heading leading-tight">{totalCredits || '—'}</p>
                            <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider font-heading">Degree Points Completed</p>
                        </div>
                    </div>

                    <div
                        onMouseMove={handleMouseMove}
                        className="bg-gradient-to-br from-emerald-500/5 to-bg-card rounded-[24px] p-5 border border-emerald-500/15 flex items-center gap-4 relative overflow-hidden card glowing-card"
                    >
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-white font-heading leading-tight">
                                {semestersWithData}
                                <span className="text-sm font-normal text-text-muted ml-1">/8</span>
                            </p>
                            <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider font-heading">Academic Chapters Completed</p>
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-8">
                    <div
                        onMouseMove={handleMouseMove}
                        className="card glowing-card p-6 border border-white/5 h-full"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-white font-heading">Your Grade Progress Over Time</h3>
                        </div>
                        <SGPATrendLine />
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4">
                    <div
                        onMouseMove={handleMouseMove}
                        className="card glowing-card p-6 border border-white/5 h-full"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white font-heading">My Grades Summary</h3>
                        </div>
                        <GradeDistribution />
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-6">
                    <div
                        onMouseMove={handleMouseMove}
                        className="card glowing-card p-6 border border-white/5 h-full"
                    >
                        <h3 className="text-lg font-bold text-white font-heading mb-6 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Yearly Score breakdown
                        </h3>
                        <YearlyBarChart />
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-6">
                    <div
                        onMouseMove={handleMouseMove}
                        className="card glowing-card p-6 border border-white/5 h-full"
                    >
                        <h3 className="text-lg font-bold text-white font-heading mb-6 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Degree points breakdown
                        </h3>
                        <CreditsChart />
                    </div>
                </div>
            </div>

            <SubjectInsights />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
