import { Trash2, PlusCircle, LayoutGrid, Info } from 'lucide-react';
import type { Subject, Grade, Regulation } from '../types';
import { useAcademic } from '../context/AcademicContext';
import { getValidGradesForRegulation } from '../utils/regulationGrades';
import { useMemo } from 'react';

interface DetailedModeTableProps {
    semester: {
        id: string;
        subjects: Subject[];
        regulation?: Regulation;
    };
}

export default function DetailedModeTable({ semester }: DetailedModeTableProps) {
    const { addSubject, updateSubject, removeSubject, data } = useAcademic();
    const semesterReg =
        (semester as { regulation?: Regulation }).regulation || data.regulation;
    const grades = useMemo(() => {
        const base = getValidGradesForRegulation(semesterReg).filter(g => g !== '-') as Grade[];
        const present = new Set(base);
        for (const s of semester.subjects) {
            if (s.grade && !present.has(s.grade as Grade)) {
                present.add(s.grade as Grade);
                base.push(s.grade as Grade);
            }
        }
        return base;
    }, [semesterReg, semester.subjects]);

    return (
        <div className="space-y-3">
            {semester.subjects.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-subtle text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                                <th className="px-3 py-2.5 font-medium">Subject Name</th>
                                <th className="px-3 py-2.5 text-center w-14 font-medium">Int</th>
                                <th className="px-3 py-2.5 text-center w-14 font-medium">Ext</th>
                                <th className="px-3 py-2.5 text-center w-14 font-medium">Total</th>
                                <th className="px-3 py-2.5 text-center w-20 font-medium">Grade</th>
                                <th className="px-3 py-2.5 text-center w-16 font-medium">Credits</th>
                                <th className="px-2 py-2.5 text-right w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {semester.subjects.map((subject) => (
                                <tr key={subject.id} className="hover:bg-surface-subtle transition-colors">
                                    <td className="px-3 py-2 font-sans font-medium text-text-primary">
                                        <div className="flex items-center gap-2">
                                            <span>{subject.name}</span>
                                            {subject.nonCredit && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                                    Audit / Non-Credit
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-center text-text-muted">
                                        {subject.internal ?? '—'}
                                    </td>
                                    <td className="px-3 py-2 text-center text-text-muted">
                                        {subject.external ?? '—'}
                                    </td>
                                    <td className="px-3 py-2 text-center font-bold text-text-primary">
                                        {subject.total ?? '—'}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <select
                                            value={subject.grade}
                                            onChange={(e) => updateSubject(semester.id, subject.id, { grade: e.target.value as Grade })}
                                            className="bg-surface-card border border-border rounded px-2 py-1 text-center font-mono font-semibold text-xs text-text-primary focus:border-accent focus:outline-none"
                                        >
                                            {grades.map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <input
                                            type="number"
                                            value={subject.credits}
                                            onChange={(e) => updateSubject(semester.id, subject.id, { credits: Number(e.target.value) })}
                                            className="bg-surface-card border border-border rounded px-2 py-1 text-center font-mono font-semibold text-xs text-text-primary focus:border-accent focus:outline-none w-14"
                                        />
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                        <button
                                            onClick={() => removeSubject(semester.id, subject.id)}
                                            className="text-text-muted hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                            title="Delete Course"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed border-border rounded-lg">
                    <LayoutGrid className="w-6 h-6 text-text-muted mb-2 opacity-50" />
                    <p className="text-xs font-semibold text-text-primary">No courses in this semester</p>
                    <p className="text-[11px] text-text-muted mt-0.5 mb-4 max-w-xs">
                        Add courses manually or import official PDF memos.
                    </p>
                    <button
                        onClick={() => addSubject(semester.id)}
                        className="btn-primary py-1.5 px-3 text-xs"
                    >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Add Subject
                    </button>
                </div>
            )}

            {semester.subjects.length > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono">
                        <Info className="w-3 h-3 text-accent" />
                        Credits follow official course scheme
                    </div>
                    <button
                        onClick={() => addSubject(semester.id)}
                        className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1"
                    >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Add Row
                    </button>
                </div>
            )}
        </div>
    );
}
