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

    const semestersWithData = data.semesters.filter(hasSemesterData).length;

    // Silky-smooth 60fps cursor tracking hover glow handler
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    if (semestersWithData === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[65vh] text-center px-6 relative select-none">
                {/* Glowing orbital backdrop effect (Gemini style) */}
                <div className="absolute w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute w-[300px] h-[300px] bg-accent/5 rounded-full blur-[80px] pointer-events-none" />

                <motion.div 
                    {...fadeIn} 
                    className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/15 via-indigo-500/10 to-transparent flex items-center justify-center mb-8 border border-primary/20 shadow-2xl shadow-primary/10 relative"
                >
                    <div className="absolute inset-1.5 bg-gradient-to-br from-primary to-accent rounded-2xl opacity-20 blur-md" />
                    <Sparkles className="w-12 h-12 text-primary relative z-10 animate-pulse" />
                </motion.div>
                
                <motion.h2 
                    {...fadeIn} 
                    transition={{ delay: 0.1 }} 
                    className="text-3xl lg:text-4xl font-bold text-white mb-4 tracking-tight font-heading"
                >
                    Let's Get Started!
                </motion.h2>
                
                <motion.p 
                    {...fadeIn} 
                    transition={{ delay: 0.2 }} 
                    className="text-text-muted max-w-md text-base mb-8 mx-auto leading-relaxed"
                >
                    Type your Student ID (Hall Ticket) or drag-and-drop your result PDFs in the main tab to unlock visual insights, grade trend lines, and backlog tracking!
                </motion.p>
            </div>
        );
    }

    return (
        <div className="space-y-8 select-none">
            {/* Action Header - Google-style clean layout */}
            <motion.div {...fadeIn} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
                        <LayoutDashboard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white font-heading">Your Academic Journey</h2>
                        <p className="text-[10px] text-text-muted font-heading font-bold uppercase tracking-widest mt-0.5">Automated analytics and insights based on your results</p>
                    </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto no-print">
                    <PerformanceReport />
                    <ActionButtons />
                </div>
            </motion.div>

            {/* Student Status Card */}
            <StudentStatusCard />

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-12 gap-6">
                
                {/* Hero CGPA Card - Large */}
                <motion.div
                    {...fadeIn}
                    className="col-span-12 lg:col-span-6"
                >
                    <div 
                        onMouseMove={handleMouseMove}
                        className="card glowing-card p-8 border border-white/5 relative overflow-hidden h-full"
                    >
                        {/* Glowing mesh overlay */}
                        <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

                        <div className="relative">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/5 flex items-center justify-center border border-primary/25 shadow-md shadow-primary/5">
                                    <Award className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-primary uppercase tracking-widest font-heading">Overall Grade Score (CGPA)</p>
                                    <p className="text-text-muted text-xs font-heading font-semibold">Calculated automatically using the official university formula</p>
                                </div>
                            </div>
                            
                            <div className="flex items-baseline gap-4 mb-4">
                                <p className="text-7xl lg:text-8xl font-black text-white tracking-tighter font-heading leading-none">
                                    {cgpa > 0 ? cgpa.toFixed(2) : '0.00'}
                                </p>
                                <span className="text-xs font-bold px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-xl font-heading uppercase tracking-wider">
                                    My Score
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
                </motion.div>

                {/* Percentage Card */}
                <motion.div
                    {...fadeIn}
                    transition={{ delay: 0.1 }}
                    className="col-span-12 sm:col-span-6 lg:col-span-3"
                >
                    <div 
                        onMouseMove={handleMouseMove}
                        className="bg-gradient-to-br from-amber-500/5 to-bg-card rounded-[32px] p-6 border border-amber-500/15 flex flex-col justify-between relative overflow-hidden h-full card glowing-card"
                    >
                        <div>
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 flex items-center justify-center mb-6 border border-amber-500/20 shadow-md">
                                <TrendingUp className="w-6 h-6 text-amber-400" />
                            </div>
                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-heading mb-1">Percentage Score</p>
                            <p className="text-4xl lg:text-5xl font-black text-white font-heading tracking-tight">{percentage > 0 ? `${percentage.toFixed(1)}%` : '—'}</p>
                        </div>
                        <p className="text-[9px] text-text-muted font-heading uppercase font-bold tracking-wider mt-4">Formula: (CGPA - 0.5) * 10</p>
                    </div>
                </motion.div>

                {/* Credits & Semesters Bento Stack */}
                <motion.div
                    {...fadeIn}
                    transition={{ delay: 0.2 }}
                    className="col-span-12 sm:col-span-6 lg:col-span-3 grid grid-rows-2 gap-4"
                >
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
                        className="bg-gradient-to-br from-purple-500/5 to-bg-card rounded-[24px] p-5 border border-purple-500/15 flex items-center gap-4 relative overflow-hidden card glowing-card"
                    >
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-white font-heading leading-tight">
                                {semestersWithData}
                                <span className="text-sm font-normal text-text-muted ml-1">/8</span>
                            </p>
                            <p className="text-[9px] font-bold text-purple-400 uppercase tracking-wider font-heading">Academic Chapters Completed</p>
                        </div>
                    </div>
                </motion.div>

                {/* SGPA Trend - Wide */}
                <motion.div
                    {...fadeIn}
                    transition={{ delay: 0.3 }}
                    className="col-span-12 lg:col-span-8"
                >
                    <div 
                        onMouseMove={handleMouseMove}
                        className="card glowing-card p-6 border border-white/5 h-full"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-white font-heading">Your Grade Progress Over Time</h3>
                        </div>
                        <SGPATrendLine />
                    </div>
                </motion.div>

                {/* Grade Distribution */}
                <motion.div
                    {...fadeIn}
                    transition={{ delay: 0.4 }}
                    className="col-span-12 lg:col-span-4"
                >
                    <div 
                        onMouseMove={handleMouseMove}
                        className="card glowing-card p-6 border border-white/5 h-full"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-accent" />
                            </div>
                            <h3 className="text-lg font-bold text-white font-heading">My Grades Summary</h3>
                        </div>
                        <GradeDistribution />
                    </div>
                </motion.div>

                {/* Yearly Performance */}
                <motion.div
                    {...fadeIn}
                    transition={{ delay: 0.5 }}
                    className="col-span-12 lg:col-span-6"
                >
                    <div 
                        onMouseMove={handleMouseMove}
                        className="card glowing-card p-6 border border-white/5 h-full"
                    >
                        <h3 className="text-lg font-bold text-white font-heading mb-6 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            Yearly Score breakdown
                        </h3>
                        <YearlyBarChart />
                    </div>
                </motion.div>

                {/* Credits Chart */}
                <motion.div
                    {...fadeIn}
                    transition={{ delay: 0.6 }}
                    className="col-span-12 lg:col-span-6"
                >
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
                </motion.div>
            </div>

            {/* Subject Insights */}
            <motion.div {...fadeIn} transition={{ delay: 0.65 }}>
                <SubjectInsights />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Backlogs List */}
                <motion.div {...fadeIn} transition={{ delay: 0.7 }} className="lg:col-span-6">
                    <BacklogsList />
                </motion.div>

                {/* Quick Converter */}
                <motion.div {...fadeIn} transition={{ delay: 0.75 }} className="lg:col-span-6">
                    <QuickConverter />
                </motion.div>
            </div>
        </div>
    );
}
