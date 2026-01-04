import { useAcademic } from '../context/AcademicContext';
import SGPATrendLine from './charts/SGPATrendLine';
import YearlyBarChart from './charts/YearlyBarChart';
import GradeDistribution from './charts/GradeDistribution';
import CreditsChart from './charts/CreditsChart';
import SubjectInsights from './charts/SubjectInsights';
import BacklogsList from './charts/BacklogsList';
import QuickConverter from './QuickConverter';
import ActionButtons from './ActionButtons';
import { Award, TrendingUp, BookOpen, Calendar, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

// Animation variants
const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
};

export default function Dashboard() {
    const { getCGPA, data } = useAcademic();
    const { cgpa, percentage, totalCredits } = getCGPA();

    const semestersWithData = data.semesters.filter(sem => {
        if (sem.mode === 'manual') return (sem.manualSGPA ?? 0) > 0;
        return sem.subjects.length > 0;
    }).length;

    return (
        <div className="space-y-8">
            {/* Action Buttons - Export & Share */}
            <motion.div {...fadeIn} className="flex justify-end">
                <ActionButtons />
            </motion.div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-12 gap-5">
                {/* Hero CGPA Card - Large */}
                <motion.div
                    {...fadeIn}
                    className="col-span-12 lg:col-span-5 bg-gradient-to-br from-primary/20 via-bg-card to-bg-card rounded-3xl p-8 border border-primary/20 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                                <Award className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Cumulative GPA</p>
                                <p className="text-text-muted text-sm">Overall Performance</p>
                            </div>
                        </div>
                        <p className="text-7xl font-black text-white tracking-tight mb-2">
                            {cgpa > 0 ? cgpa.toFixed(2) : '0.00'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-text-muted">
                            <Sparkles className="w-4 h-4 text-accent" />
                            <span>{cgpa >= 8.5 ? 'Distinction' : cgpa >= 7 ? 'First Class' : 'Keep Going'}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Percentage Card */}
                <motion.div
                    {...fadeIn}
                    transition={{ delay: 0.1 }}
                    className="col-span-6 lg:col-span-4 bg-gradient-to-br from-amber-500/10 to-bg-card rounded-3xl p-6 border border-amber-500/20"
                >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4">
                        <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.15em] mb-1">Percentage</p>
                    <p className="text-4xl font-black text-white">{percentage > 0 ? `${percentage.toFixed(1)}%` : '—'}</p>
                </motion.div>

                {/* Credits & Semesters Stacked */}
                <motion.div
                    {...fadeIn}
                    transition={{ delay: 0.2 }}
                    className="col-span-6 lg:col-span-3 space-y-5"
                >
                    <div className="bg-gradient-to-br from-emerald-500/10 to-bg-card rounded-2xl p-5 border border-emerald-500/20">
                        <BookOpen className="w-5 h-5 text-emerald-400 mb-2" />
                        <p className="text-2xl font-black text-white">{totalCredits || '—'}</p>
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Credits</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-bg-card rounded-2xl p-5 border border-purple-500/20">
                        <Calendar className="w-5 h-5 text-purple-400 mb-2" />
                        <p className="text-2xl font-black text-white">{semestersWithData}<span className="text-lg text-text-muted">/8</span></p>
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Semesters</p>
                    </div>
                </motion.div>

                {/* SGPA Trend - Wide */}
                <motion.div
                    {...fadeIn}
                    transition={{ delay: 0.3 }}
                    className="col-span-12 lg:col-span-8 bg-bg-card rounded-3xl p-6 border border-white/5"
                >
                    <h3 className="text-lg font-bold text-white mb-4">SGPA Trend</h3>
                    <SGPATrendLine />
                </motion.div>

                {/* Grade Distribution */}
                <motion.div
                    {...fadeIn}
                    transition={{ delay: 0.4 }}
                    className="col-span-12 lg:col-span-4 bg-bg-card rounded-3xl p-6 border border-white/5"
                >
                    <h3 className="text-lg font-bold text-white mb-4">Grades</h3>
                    <GradeDistribution />
                </motion.div>

                {/* Yearly Performance */}
                <motion.div
                    {...fadeIn}
                    transition={{ delay: 0.5 }}
                    className="col-span-12 lg:col-span-6 bg-bg-card rounded-3xl p-6 border border-white/5"
                >
                    <h3 className="text-lg font-bold text-white mb-4">Yearly Performance</h3>
                    <YearlyBarChart />
                </motion.div>

                {/* Credits Chart */}
                <motion.div
                    {...fadeIn}
                    transition={{ delay: 0.6 }}
                    className="col-span-12 lg:col-span-6 bg-bg-card rounded-3xl p-6 border border-white/5"
                >
                    <h3 className="text-lg font-bold text-white mb-4">Credits Breakdown</h3>
                    <CreditsChart />
                </motion.div>
            </div>

            {/* Subject Insights */}
            <motion.div {...fadeIn} transition={{ delay: 0.65 }} className="col-span-12">
                <SubjectInsights />
            </motion.div>

            {/* Backlogs List */}
            <motion.div {...fadeIn} transition={{ delay: 0.7 }} className="col-span-12 lg:col-span-6">
                <BacklogsList />
            </motion.div>

            {/* Quick Converter */}
            <motion.div {...fadeIn} transition={{ delay: 0.75 }} className="col-span-12 lg:col-span-6">
                <QuickConverter />
            </motion.div>
        </div>
    );
}
