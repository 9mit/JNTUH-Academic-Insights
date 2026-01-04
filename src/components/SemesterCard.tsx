import type { MouseEvent } from 'react';
import type { Semester } from '../types';
import { useAcademic } from '../context/AcademicContext';
import { getSemesterLabel } from '../constants/grading';
import { getSemesterSGPA } from '../utils/calculations';
import { ChevronRight, ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import DetailedModeTable from './DetailedModeTable';
import ManualModeInput from './ManualModeInput';

interface SemesterCardProps {
    semester: Semester;
}

export default function SemesterCard({ semester }: SemesterCardProps) {
    const { toggleSemesterExpand, setSemesterMode } = useAcademic();
    const sgpa = getSemesterSGPA(semester);

    // Determine status
    const hasData = semester.mode === 'manual'
        ? (semester.manualSGPA ?? 0) > 0
        : semester.subjects.length > 0;

    const isComplete = hasData && sgpa > 0;

    const handleModeToggle = (e: MouseEvent) => {
        e.stopPropagation();
        setSemesterMode(semester.id, semester.mode === 'detailed' ? 'manual' : 'detailed');
    };

    return (
        <div className={`card overflow-hidden transition-all duration-200 ${semester.isExpanded ? 'ring-1 ring-primary/30 shadow-lg' : 'hover:border-primary/50'}`}>
            {/* Header */}
            <button
                onClick={() => toggleSemesterExpand(semester.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02]"
            >
                <div className="flex items-center gap-3">
                    {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-accent" />
                    ) : (
                        <Circle className="w-5 h-5 text-text-muted opacity-30" />
                    )}

                    <div className="text-left">
                        <span className="block text-sm font-bold text-text-primary">
                            {getSemesterLabel(semester.year, semester.sem)}
                        </span>
                        {isComplete ? (
                            <span className="status-badge badge-success">
                                SGPA: {sgpa.toFixed(2)}
                            </span>
                        ) : (
                            <span className="status-badge badge-empty">
                                {semester.mode === 'detailed' ? 'No Grades' : 'No SGPA'}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Mode Toggle Pills */}
                    <div
                        onClick={handleModeToggle}
                        className="hidden sm:flex items-center bg-bg-primary rounded-lg p-0.5 text-[9px] uppercase font-bold tracking-wider"
                    >
                        <span className={`px-2.5 py-1 rounded-[5px] transition-all ${semester.mode === 'detailed' ? 'bg-primary text-white' : 'text-text-muted'
                            }`}>Detailed</span>
                        <span className={`px-2.5 py-1 rounded-[5px] transition-all ${semester.mode === 'manual' ? 'bg-accent text-white' : 'text-text-muted'
                            }`}>Manual</span>
                    </div>

                    <span className="text-text-muted">
                        {semester.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                </div>
            </button>

            {/* Content */}
            {semester.isExpanded && (
                <div className="p-4 bg-bg-primary/50 border-t border-border">
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
