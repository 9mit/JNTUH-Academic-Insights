import type { MouseEvent } from 'react';
import type { Semester } from '../types';
import { useAcademic } from '../context/AcademicContext';
import { getSemesterLabel } from '../constants/grading';
import { getSemesterSGPA, hasSemesterData } from '../utils/calculations';
import { ChevronRight, ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import DetailedModeTable from './DetailedModeTable';
import ManualModeInput from './ManualModeInput';

interface SemesterCardProps {
    semester: Semester;
}

export default function SemesterCard({ semester }: SemesterCardProps) {
    const { toggleSemesterExpand, setSemesterMode, data } = useAcademic();
    const sgpa = getSemesterSGPA(semester, data.regulation);
    const hasData = hasSemesterData(semester);

    const handleModeToggle = (e: MouseEvent) => {
        e.stopPropagation();
        setSemesterMode(semester.id, semester.mode === 'detailed' ? 'manual' : 'detailed');
    };

    return (
        <div className={`card overflow-hidden transition-all duration-150 ${
            semester.isExpanded
                ? 'border-accent/40 shadow-sm'
                : 'hover:border-border-strong'
        }`}>
            {/* Header */}
            <button
                onClick={() => toggleSemesterExpand(semester.id)}
                className="w-full flex items-center justify-between p-3.5 hover:bg-surface-subtle text-left transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-3 min-w-0">
                    {hasData ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                        <Circle className="w-4 h-4 text-text-muted/40 shrink-0" />
                    )}

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="block text-xs font-semibold text-text-primary truncate">
                                {getSemesterLabel(semester.year, semester.sem)}
                            </span>
                            {semester.regulation && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-subtle border border-accent/20 text-accent">
                                    {semester.regulation}
                                </span>
                            )}
                        </div>
                        <div className="mt-1">
                            {hasData ? (
                                <span className="text-[11px] font-mono font-semibold text-emerald-700">
                                    SGPA: {sgpa.toFixed(2)}
                                </span>
                            ) : (
                                <span className="text-[11px] font-mono text-text-muted">
                                    {semester.mode === 'detailed' ? 'No Grades Recorded' : 'No SGPA'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {/* Mode Toggle Pills */}
                    <div
                        onClick={handleModeToggle}
                        className="hidden sm:flex items-center bg-surface-subtle border border-border rounded-md p-0.5 text-[10px] font-mono font-medium"
                    >
                        <span className={`px-2 py-0.5 rounded transition-all ${
                            semester.mode === 'detailed' ? 'bg-accent text-white font-bold shadow-xs' : 'text-text-muted hover:text-text-primary'
                        }`}>Detailed</span>
                        <span className={`px-2 py-0.5 rounded transition-all ${
                            semester.mode === 'manual' ? 'bg-accent text-white font-bold shadow-xs' : 'text-text-muted hover:text-text-primary'
                        }`}>Manual</span>
                    </div>

                    <span className="text-text-muted">
                        {semester.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                </div>
            </button>

            {/* Content */}
            {semester.isExpanded && (
                <div className="p-4 bg-surface-subtle border-t border-border">
                    {semester.mode === 'detailed' ? (
                        <DetailedModeTable semester={semester} />
                    ) : (
                        <ManualModeInput semester={semester} />
                    )}
                </div>
            )}
        </div>
    );
}
