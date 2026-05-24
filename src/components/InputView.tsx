import { useAcademic } from '../context/AcademicContext';
import SemesterCard from './SemesterCard';
import PDFUploader from './PDFUploader';
import { REGULATIONS } from '../constants/grading';
import type { Regulation } from '../types';
import { User, GraduationCap, ClipboardList, Sparkles, Trash2, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
};

export default function InputView() {
    const { data, setRegulation, setStudentInfo, clearAllData } = useAcademic();

    // Silky-smooth 60fps cursor tracking hover glow handler
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    return (
        <div className="space-y-12">
            {/* 1. Primary Action: Unified Google Bar */}
            <motion.section {...fadeInUp}>
                <PDFUploader />
            </motion.section>

            {/* 2. Personal Profile Card (Google-style clean welcome) */}
            <motion.section
                {...fadeInUp}
                transition={{ delay: 0.1 }}
            >
                <div 
                    onMouseMove={handleMouseMove}
                    className="card glowing-card p-8 md:p-10 border border-white/5 relative overflow-hidden"
                >
                    {/* Floating soft glowing indicator inside the card */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/5 flex items-center justify-center border border-primary/20 shadow-md shadow-primary/5">
                                <User className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2 font-heading">
                                    Let's Personalize Your Journey
                                    <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                                </h2>
                                <p className="text-sm text-text-muted mt-0.5">Type your name and Student ID to customize your reports</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                        <div>
                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2.5 block font-heading">Grading Scheme</label>
                            <select
                                value={data.regulation}
                                onChange={(e) => setRegulation(e.target.value as Regulation)}
                                className="input-field cursor-pointer font-bold font-heading"
                            >
                                {REGULATIONS.map((reg) => (
                                    <option key={reg} value={reg}>{reg} Regulation</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2.5 block font-heading">What should we call you?</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70 pointer-events-none select-none" />
                                <input
                                    type="text"
                                    value={data.studentName || ''}
                                    onChange={(e) => setStudentInfo(e.target.value)}
                                    placeholder="e.g. Rahul Sharma"
                                    className="input-field !pl-14 font-semibold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2.5 block font-heading">Enter your Student ID</label>
                            <div className="relative">
                                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70 pointer-events-none select-none" />
                                <input
                                    type="text"
                                    value={data.hallTicket || ''}
                                    onChange={(e) => setStudentInfo(undefined, e.target.value)}
                                    placeholder="e.g. 20B91A05XX"
                                    className="input-field !pl-14 font-mono font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-end items-center gap-4 relative z-10">
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to clear all data? This will reset all your semesters and grades.')) {
                                    clearAllData();
                                }
                            }}
                            className="text-xs text-rose-400 font-bold font-heading uppercase tracking-wider hover:text-rose-300 flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-rose-500/10 border border-transparent hover:border-rose-500/10 transition-all cursor-pointer"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear All Data
                        </button>
                    </div>
                </div>
            </motion.section>

            {/* 3. Semester Data Grid */}
            <motion.section
                {...fadeInUp}
                transition={{ delay: 0.2 }}
            >
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 flex items-center justify-center border border-amber-500/20 shadow-md shadow-amber-500/5">
                        <ClipboardList className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white font-heading">Your Academic Chapters</h2>
                        <p className="text-sm text-text-muted mt-0.5">Click any semester card below to view or change your grades.</p>
                    </div>
                </div>

                <div className="semester-grid">
                    {data.semesters.map((semester, index) => (
                        <motion.div
                            key={semester.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.05 }}
                        >
                            <SemesterCard semester={semester} />
                        </motion.div>
                    ))}
                </div>
            </motion.section>
            
            {/* Soft signature footer */}
            <div className="text-center text-[10px] text-text-muted py-2 flex items-center justify-center gap-1 font-heading font-bold uppercase tracking-widest no-print">
                Built with <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" /> for students
            </div>
        </div>
    );
}
