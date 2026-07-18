import { useAcademic } from '../context/AcademicContext';
import SemesterCard from './SemesterCard';
import PDFUploader from './PDFUploader';
import { REGULATIONS } from '../constants/grading';
import type { Regulation } from '../types';
import { User, GraduationCap, ClipboardList, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import SectionHeader from './ui/SectionHeader';
import SessionVaultPanel from './SessionVaultPanel';

const fadeInUp = {
    initial: false as const,
    animate: { y: 0 },
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }
};

export default function InputView({ onImportSuccess }: { onImportSuccess?: () => void }) {
    const { data, setRegulation, setStudentInfo, clearAllData } = useAcademic();

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    };

    return (
        <div className="space-y-8">
            <motion.section {...fadeInUp}>
                <PDFUploader onImportSuccess={onImportSuccess} />
            </motion.section>

            <motion.section {...fadeInUp} transition={{ delay: 0.06 }}>
                <div
                    onMouseMove={handleMouseMove}
                    className="card glowing-card p-5 md:p-7 relative"
                >
                    <div className="absolute top-0 right-0 w-56 h-56 bg-primary/[0.04] rounded-full blur-[70px] pointer-events-none" />

                    <SectionHeader
                        icon={User}
                        title="Profile"
                        subtitle="Regulation, name, and hall ticket for reports in this session"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
                        <div>
                            <label className="field-label">Grading scheme</label>
                            <select
                                value={data.regulation}
                                onChange={(e) => setRegulation(e.target.value as Regulation)}
                                className="input-field cursor-pointer font-semibold"
                            >
                                {REGULATIONS.map((reg) => (
                                    <option key={reg} value={reg}>{reg} Regulation</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="field-label">Full name</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60 pointer-events-none" />
                                <input
                                    type="text"
                                    value={data.studentName || ''}
                                    onChange={(e) => setStudentInfo(e.target.value)}
                                    placeholder="Your full name"
                                    className="input-field !pl-11 font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="field-label">Student ID</label>
                            <div className="relative">
                                <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60 pointer-events-none" />
                                <input
                                    type="text"
                                    value={data.hallTicket || ''}
                                    onChange={(e) => setStudentInfo(undefined, e.target.value)}
                                    placeholder="e.g. 20B91A05XX"
                                    className="input-field !pl-11 font-mono font-semibold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-7 pt-5 border-t border-white/[0.06] flex justify-end relative z-10">
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm('Clear all semester data for this session?')) {
                                    clearAllData();
                                }
                            }}
                            className="text-[0.68rem] text-rose-400 font-semibold uppercase tracking-[0.12em] hover:text-rose-300 flex items-center gap-2 px-3.5 py-2 rounded-xl hover:bg-rose-500/10 border border-transparent hover:border-rose-500/15 transition-all cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear session
                        </button>
                    </div>
                </div>
            </motion.section>

            <motion.section {...fadeInUp} transition={{ delay: 0.08 }}>
                <SessionVaultPanel />
            </motion.section>

            <motion.section {...fadeInUp} transition={{ delay: 0.1 }}>
                <SectionHeader
                    icon={ClipboardList}
                    title="Academic chapters"
                    subtitle="Open any semester to review or edit grades"
                />

                <div className="semester-grid">
                    {data.semesters.map((semester, index) => (
                        <motion.div
                            key={semester.id}
                            initial={false}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.08 + index * 0.02 }}
                        >
                            <SemesterCard semester={semester} />
                        </motion.div>
                    ))}
                </div>
            </motion.section>
        </div>
    );
}
