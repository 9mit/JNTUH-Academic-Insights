import { useState, type ChangeEvent } from 'react';
import type { Semester } from '../types';
import { useAcademic } from '../context/AcademicContext';
import { STANDARD_CREDITS, toPercentage } from '../constants/grading';
import { validateGPA } from '../utils/calculations';
import { Info, Target, TrendingUp } from 'lucide-react';

interface ManualModeInputProps {
    semester: Semester;
}

export default function ManualModeInput({ semester }: ManualModeInputProps) {
    const { setManualSGPA } = useAcademic();
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
            setError('Please enter a valid number');
            return;
        }

        if (!validateGPA(numValue)) {
            setError('SGPA must be between 0 and 10');
            return;
        }

        setManualSGPA(semester.id, numValue);
    };

    const percentage = semester.manualSGPA ? toPercentage(semester.manualSGPA) : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex-1 w-full max-w-xs">
                    <label className="label-caps mb-2 flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" />
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
                            className={`input-field text-xl font-bold ${error ? 'border-error ring-1 ring-error/20' : ''}`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-bold pointer-events-none">
                            / 10.0
                        </div>
                    </div>
                    {error && (
                        <p className="text-error text-xs mt-2 font-medium flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            {error}
                        </p>
                    )}
                </div>

                {semester.manualSGPA && semester.manualSGPA > 0 && (
                    <div className="flex-1 w-full">
                        <label className="label-caps mb-2 flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Quick Conversion
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-bg-primary border border-border rounded-xl p-3">
                                <span className="text-[10px] font-bold text-text-muted uppercase block mb-1">SGPA</span>
                                <span className="text-xl font-black text-primary">
                                    {semester.manualSGPA.toFixed(2)}
                                </span>
                            </div>
                            <div className="bg-bg-primary border border-border rounded-xl p-3">
                                <span className="text-[10px] font-bold text-text-muted uppercase block mb-1">Marks %</span>
                                <span className="text-xl font-black text-accent">
                                    {percentage?.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-3">
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary leading-relaxed">
                    <b className="text-primary">Manual Mode</b> uses a fixed weight of <b className="text-primary">{STANDARD_CREDITS} credits</b>.
                    For precise university calculations that account for variable course credits, use <b className="text-accent underline cursor-pointer">Detailed Mode</b>.
                </p>
            </div>
        </div>
    );
}
