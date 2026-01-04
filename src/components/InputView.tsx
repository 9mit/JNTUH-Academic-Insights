import { useAcademic } from '../context/AcademicContext';
import SemesterCard from './SemesterCard';
import PDFUploader from './PDFUploader';
import { REGULATIONS } from '../constants/grading';
import type { Regulation } from '../types';
import { User, GraduationCap, ClipboardList, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
};

export default function InputView() {
    const { data, setRegulation, setStudentInfo, clearAllData } = useAcademic();

    return (
        <div className="space-y-10">
            {/* 1. Primary Action: Import Results */}
            <motion.section {...fadeInUp}>
                <PDFUploader />
            </motion.section>

            {/* 2. Metadata Row: Profile Information */}
            <motion.section
                {...fadeInUp}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-primary/5 to-bg-card rounded-3xl p-8 border border-primary/10"
            >
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                        <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white">Profile Information</h2>
                        <p className="text-sm text-text-muted">Personalize your academic transcript</p>
                    </div>
                    <div className="ml-auto">
                        <Sparkles className="w-5 h-5 text-accent/50" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="text-[10px] font-bold text-primary uppercase tracking-[0.15em] mb-2 block">Regulation</label>
                        <select
                            value={data.regulation}
                            onChange={(e) => setRegulation(e.target.value as Regulation)}
                            className="input-field cursor-pointer"
                        >
                            {REGULATIONS.map((reg) => (
                                <option key={reg} value={reg}>{reg}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-primary uppercase tracking-[0.15em] mb-2 block">Student Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none select-none" />
                            <input
                                type="text"
                                value={data.studentName || ''}
                                onChange={(e) => setStudentInfo(e.target.value)}
                                placeholder="e.g. John Doe"
                                className="input-field !pl-16"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-primary uppercase tracking-[0.15em] mb-2 block">Hall Ticket</label>
                        <div className="relative">
                            <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none select-none" />
                            <input
                                type="text"
                                value={data.hallTicket || ''}
                                onChange={(e) => setStudentInfo(undefined, e.target.value)}
                                placeholder="e.g. 20B91A05XX"
                                className="input-field !pl-16"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to clear all data?')) {
                                clearAllData();
                            }
                        }}
                        className="text-sm text-red-400 font-semibold hover:text-red-300 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-red-500/10 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                        Reset All Data
                    </button>
                </div>
            </motion.section>

            {/* 3. Semester Data: 2-Column Grid */}
            <motion.section
                {...fadeInUp}
                transition={{ delay: 0.2 }}
            >
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/20">
                        <ClipboardList className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white">Semester Records</h2>
                        <p className="text-sm text-text-muted">Manage your scores for each term</p>
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
        </div>
    );
}

