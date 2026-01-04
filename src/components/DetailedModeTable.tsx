import { Trash2, PlusCircle, LayoutGrid, Info } from 'lucide-react';
import type { Subject, Grade } from '../types';
import { useAcademic } from '../context/AcademicContext';

interface DetailedModeTableProps {
    semester: {
        id: string;
        subjects: Subject[];
    };
}

export default function DetailedModeTable({ semester }: DetailedModeTableProps) {
    const { addSubject, updateSubject, removeSubject } = useAcademic();

    return (
        <div className="space-y-4">
            {semester.subjects.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-border text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                <th className="px-3 py-3">Subject Name</th>
                                <th className="px-3 py-3 text-center w-24">Grade</th>
                                <th className="px-3 py-3 text-center w-24">Credits</th>
                                <th className="px-3 py-3 text-right w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {semester.subjects.map((subject) => (
                                <tr key={subject.id} className="zebra-row group hover:bg-white/[0.01] transition-colors">
                                    <td className="px-3 py-4">
                                        <div className="font-semibold text-text-primary">{subject.name}</div>
                                    </td>
                                    <td className="px-3 py-4">
                                        <select
                                            value={subject.grade}
                                            onChange={(e) => updateSubject(semester.id, subject.id, { grade: e.target.value as Grade })}
                                            className="bg-bg-primary border border-border rounded-lg px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary/20 w-full font-bold text-center text-xs"
                                        >
                                            {['O', 'A+', 'A', 'B+', 'B', 'C', 'F', 'Ab'].map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-3 py-4 text-center">
                                        <input
                                            type="number"
                                            value={subject.credits}
                                            onChange={(e) => updateSubject(semester.id, subject.id, { credits: Number(e.target.value) })}
                                            className="bg-bg-primary border border-border rounded-lg px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary/20 w-full text-center text-xs font-bold"
                                        />
                                    </td>
                                    <td className="px-3 py-4 text-right">
                                        <button
                                            onClick={() => removeSubject(semester.id, subject.id)}
                                            className="text-text-muted hover:text-error transition-all p-2 rounded-lg hover:bg-error/10"
                                            title="Remove Subject"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-bg-primary/30 border-2 border-dashed border-border rounded-2xl">
                    <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
                        <LayoutGrid className="w-8 h-8 text-text-muted" />
                    </div>
                    <h4 className="text-base font-bold text-text-primary">Empty Academic Record</h4>
                    <p className="text-xs text-text-muted mt-2 mb-6 max-w-[260px] mx-auto leading-relaxed">
                        No subjects found for this semester. Import a PDF or add rows manually to begin calculation.
                    </p>
                    <button
                        onClick={() => addSubject(semester.id)}
                        className="btn-primary py-2.5 px-6 text-xs"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add First Subject
                    </button>
                </div>
            )}

            {semester.subjects.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                    <div className="flex items-center gap-2 text-[10px] text-text-muted font-bold uppercase tracking-wider">
                        <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                            <Info className="w-3 h-3 text-primary" />
                        </div>
                        Credits are mapped to course standards
                    </div>
                    <button
                        onClick={() => addSubject(semester.id)}
                        className="btn-secondary py-2 text-xs flex items-center gap-2 border-primary/20 hover:border-primary/50 text-primary"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add New Row
                    </button>
                </div>
            )}
        </div>
    );
}
