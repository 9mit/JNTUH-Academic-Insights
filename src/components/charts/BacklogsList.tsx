import { useAcademic } from '../../context/AcademicContext';
import { getBacklogs } from '../../utils/calculations';
import { getSemesterShortLabel } from '../../constants/grading';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function BacklogsList() {
    const { data } = useAcademic();
    const backlogs = getBacklogs(data.semesters);

    if (backlogs.length === 0) {
        return (
            <div className="card p-6 border border-border flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-text-primary">Clean Academic Record</h4>
                    <p className="text-xs text-text-muted mt-0.5">
                        Zero pending backlogs across all recorded semesters.
                    </p>
                </div>
            </div>
        );
    }

    const totalLostCredits = backlogs.reduce((sum, b) => sum + b.credits, 0);

    return (
        <div className="card p-5 border border-border">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-text-primary">Pending Backlogs</h4>
                        <p className="text-xs text-text-muted">Courses requiring supplementary clearance</p>
                    </div>
                </div>
                <div className="text-right font-mono">
                    <span className="text-sm font-semibold text-rose-600">{backlogs.length}</span>
                    <span className="text-xs text-text-muted ml-1">subjects ({totalLostCredits} cr)</span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                    <thead>
                        <tr className="border-b border-border text-text-muted text-[10px] uppercase tracking-wider">
                            <th className="text-left pb-2 font-medium">Subject</th>
                            <th className="text-left pb-2 font-medium">Sem</th>
                            <th className="text-center pb-2 font-medium">Grade</th>
                            <th className="text-right pb-2 font-medium">Credits</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {backlogs.map((backlog, i) => (
                            <tr key={i} className="hover:bg-surface-subtle transition-colors">
                                <td className="py-2.5 pr-2">
                                    <p className="font-sans font-medium text-text-primary truncate max-w-[220px]">
                                        {backlog.subjectName}
                                    </p>
                                    {backlog.subjectCode && (
                                        <p className="text-[10px] text-text-muted mt-0.5">{backlog.subjectCode}</p>
                                    )}
                                </td>
                                <td className="py-2.5 px-2 text-text-secondary">
                                    {getSemesterShortLabel(backlog.year, backlog.sem)}
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        backlog.grade === 'Ab'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}>
                                        {backlog.grade === 'Ab' ? 'ABSENT' : backlog.grade}
                                    </span>
                                </td>
                                <td className="py-2.5 pl-2 text-right text-text-secondary tabular-nums">
                                    {backlog.credits}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-border font-semibold">
                            <td colSpan={3} className="pt-3 text-right text-[11px] text-text-muted uppercase">
                                Total At Risk
                            </td>
                            <td className="pt-3 text-right text-sm text-rose-600 tabular-nums">
                                {totalLostCredits} cr
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
