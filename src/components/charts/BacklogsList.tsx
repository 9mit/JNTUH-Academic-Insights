import { useAcademic } from '../../context/AcademicContext';
import { getBacklogs } from '../../utils/calculations';
import { getSemesterLabel } from '../../constants/grading';
import { AlertTriangle, BookX } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BacklogsList() {
    const { data } = useAcademic();
    const backlogs = getBacklogs(data.semesters);

    if (backlogs.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-emerald-500/10 to-bg-card rounded-3xl p-6 border border-emerald-500/20 text-center"
            >
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4">
                    <BookX className="w-6 h-6 text-emerald-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">No Backlogs!</h4>
                <p className="text-sm text-text-muted">You have cleared all your subjects. Great job! 🎉</p>
            </motion.div>
        );
    }

    const totalLostCredits = backlogs.reduce((sum, b) => sum + b.credits, 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-rose-500/10 to-bg-card rounded-3xl p-6 border border-rose-500/20"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white">Backlogs</h4>
                        <p className="text-xs text-rose-400 font-medium">Clear these to complete your degree</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-rose-400">{backlogs.length}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Subjects</p>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">Subject</th>
                            <th className="text-left py-3 px-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">Semester</th>
                            <th className="text-center py-3 px-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">Grade</th>
                            <th className="text-right py-3 px-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">Credits</th>
                        </tr>
                    </thead>
                    <tbody>
                        {backlogs.map((backlog, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="py-3 px-2">
                                    <p className="font-medium text-white truncate max-w-[200px]">{backlog.subjectName}</p>
                                    {backlog.subjectCode && (
                                        <p className="text-[10px] text-text-muted">{backlog.subjectCode}</p>
                                    )}
                                </td>
                                <td className="py-3 px-2 text-text-secondary">
                                    {getSemesterLabel(backlog.year, backlog.sem)}
                                </td>
                                <td className="py-3 px-2 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${backlog.grade === 'F'
                                            ? 'bg-rose-500/20 text-rose-400'
                                            : 'bg-amber-500/20 text-amber-400'
                                        }`}>
                                        {backlog.grade === 'Ab' ? 'Absent' : backlog.grade}
                                    </span>
                                </td>
                                <td className="py-3 px-2 text-right font-bold text-text-secondary">
                                    {backlog.credits}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-white/10">
                            <td colSpan={3} className="py-3 px-2 text-right text-xs font-bold text-text-muted uppercase">Total Lost Credits</td>
                            <td className="py-3 px-2 text-right text-lg font-black text-rose-400">{totalLostCredits}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* CTA */}
            <div className="mt-4 p-3 bg-rose-500/10 rounded-xl border border-rose-500/10 text-center">
                <p className="text-xs text-rose-300">
                    💡 Clear these {backlogs.length} subject(s) to earn <span className="font-bold">{totalLostCredits} credits</span> and complete your degree.
                </p>
            </div>
        </motion.div>
    );
}
