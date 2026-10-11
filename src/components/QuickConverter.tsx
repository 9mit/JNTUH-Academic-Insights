import React, { useState } from 'react';
import { toPercentage } from '../constants/grading';
import { validateGPA } from '../utils/calculations';
import { ArrowRight, Percent } from 'lucide-react';

export default function QuickConverter() {
    const [input, setInput] = useState<string>('');
    const [error, setError] = useState<string>('');

    const numValue = parseFloat(input);
    const isValid = !isNaN(numValue) && validateGPA(numValue);
    const percentage = isValid ? toPercentage(numValue) : null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInput(value);
        setError('');

        if (value && parseFloat(value) > 10) {
            setError('GPA must be ≤ 10.0');
        }
    };

    return (
        <div className="card p-5 border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                        <Percent className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-text-primary">CGPA to Percentage Converter</h3>
                        <p className="text-xs text-text-muted">Official JNTUH Academic Regulations Formula</p>
                    </div>
                </div>
                <span className="text-[11px] font-mono text-text-muted">R16 · R18 · R22 · R24</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                <div>
                    <label className="field-label">Cumulative GPA / SGPA</label>
                    <input
                        type="number"
                        value={input}
                        onChange={handleChange}
                        placeholder="e.g. 8.25"
                        min="0"
                        max="10"
                        step="0.01"
                        className={`input-field font-mono font-semibold text-base ${error ? 'border-rose-500 ring-1 ring-rose-500/20' : ''}`}
                    />
                    {error && <p className="text-rose-700 text-xs mt-1 font-mono font-medium">{error}</p>}
                </div>

                <div className="hidden sm:flex items-center justify-center pt-5">
                    <ArrowRight className="w-4 h-4 text-text-muted" />
                </div>

                <div>
                    <label className="field-label">Percentage Equivalent</label>
                    <div className="input-field font-mono font-bold text-base flex items-center justify-center bg-bg-card-subtle text-text-primary">
                        {isValid ? `${percentage?.toFixed(2)}%` : '—'}
                    </div>
                </div>
            </div>

            <div className="p-3 rounded bg-bg-card-subtle border border-border-subtle text-xs font-mono text-text-muted leading-relaxed">
                <span className="text-text-primary font-medium">Formula:</span> Percentage = (CGPA − 0.5) × 10
            </div>
        </div>
    );
}
