import { useState, type ChangeEvent } from 'react';
import type { Semester } from '../types';
import { useAcademic } from '../context/AcademicContext';
import { getStandardSemesterCredits, toPercentage } from '../constants/grading';
import { validateGPA } from '../utils/calculations';
import { Info, Target, TrendingUp } from 'lucide-react';

interface ManualModeInputProps {
    semester: Semester;
}

export default function ManualModeInput({ semester }: ManualModeInputProps) {
    const { setManualSGPA, data } = useAcademic();
    const manualCredits = getStandardSemesterCredits(data.regulation);
    const [inputValue, setInputValue] = useState<string>(
        semester.manualSGPA?.toString() || ''
    );
    const [error, setError] = useState<string>('');

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        setError('');

        if (value === '') {
            setManualSGPA(semester.id, null);
            return;
        }

        const numValue = parseFloat(value);

        if (isNaN(numValue)) {
            setError('Please enter a valid numeric SGPA');
            return;
        }

        if (!validateGPA(numValue)) {
            setError('SGPA must be between 0.00 and 10.00');
            return;
        }

        setManualSGPA(semester.id, numValue);
    };

    const percentage = semester.manualSGPA ? toPercentage(semester.manualSGPA) : null;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="flex-1 w-full max-w-xs">
                    <label className="field-label flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-accent" />
                        Semester SGPA
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={inputValue}
                            onChange={handleChange}
                            placeholder="0.00"
                            min="0"
                            max="10"
                            step="0.01"
                            className={`input-field font-mono font-bold text-lg ${error ? 'border-rose-500 ring-1 ring-rose-500/20' : ''}`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-mono font-medium pointer-events-none">
                            / 10.0
                        </div>
                    </div>
                    {error && (
                        <p className="text-rose-600 text-xs mt-1.5 font-mono flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            {error}
                        </p>
                    )}
                </div>

                {semester.manualSGPA && semester.manualSGPA > 0 && (
                    <div className="flex-1 w-full font-mono">
                        <label className="field-label flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-accent" />
                            Equivalent Percentage
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-surface-card border border-border rounded-lg p-2.5">
                                <span className="text-[10px] text-text-muted uppercase block">SGPA</span>
                                <span className="text-base font-bold text-text-primary">
                                    {semester.manualSGPA.toFixed(2)}
                                </span>
                            </div>
                            <div className="bg-surface-card border border-border rounded-lg p-2.5">
                                <span className="text-[10px] text-text-muted uppercase block">Percentage</span>
                                <span className="text-base font-bold text-accent">
                                    {percentage?.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-3 bg-surface-card border border-border rounded-lg flex items-start gap-2.5 text-xs text-text-muted font-mono leading-relaxed">
                <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <p>
                    Manual mode assigns an estimated semester weight of <strong className="text-text-primary">{manualCredits} credits</strong> ({data.regulation}).
                    For regulation-precise credit weighted calculations, switch to <strong>Detailed Mode</strong>.
                </p>
            </div>
        </div>
    );
}
