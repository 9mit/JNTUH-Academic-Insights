import { useAcademic } from '../context/AcademicContext';
import SemesterCard from './SemesterCard';
import PDFUploader from './PDFUploader';
import { REGULATIONS } from '../constants/grading';
import type { Regulation } from '../types';
import { User, FileBadge, ClipboardList, Trash2 } from 'lucide-react';
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

    return (
        <div className="space-y-8">
            <motion.section {...fadeInUp}>
                <PDFUploader onImportSuccess={onImportSuccess} />
            </motion.section>

            <motion.section {...fadeInUp} transition={{ delay: 0.06 }}>
                <div className="card p-5 md:p-6">
                    <SectionHeader
                        icon={User}
                        title="Student Academic Profile"
                        subtitle="Regulation, candidate name, and hall ticket ID for official transcript and reports"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="field-label">Regulation Scheme</label>
                            <select
                                value={data.regulation}
                                onChange={(e) => setRegulation(e.target.value as Regulation)}
                                className="input-field cursor-pointer font-medium"
                            >
                                {REGULATIONS.map((reg) => (
                                    <option key={reg} value={reg}>{reg} Academic Scheme</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="field-label">Student Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                                <input
                                    type="text"
                                    value={data.studentName || ''}
                                    onChange={(e) => setStudentInfo(e.target.value)}
                                    placeholder="Candidate Full Name"
                                    className="input-field !pl-9"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="field-label">Hall Ticket Number</label>
                            <div className="relative">
                                <FileBadge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                                <input
                                    type="text"
                                    value={data.hallTicket || ''}
                                    onChange={(e) => setStudentInfo(undefined, e.target.value)}
                                    placeholder="e.g. 20B91A05XX"
                                    className="input-field !pl-9 font-mono font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-border-subtle flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm('Clear all semester records for this session?')) {
                                    clearAllData();
                                }
                            }}
                            className="text-xs text-rose-600 font-mono hover:text-rose-700 flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer font-medium"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear Active Session
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
                    title="Semester Course Records"
                    subtitle="Inspect or manually adjust course grades, credits, and marks per semester"
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
