import React, { useState } from 'react';
import { toPercentage } from '../constants/grading';
import { validateGPA } from '../utils/calculations';
import { Calculator, ArrowRight, Info, Sparkles } from 'lucide-react';

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
            setError('Value must be ≤ 10');
        }
    };

    return (
        <div className="space-y-6">
            <div className="card p-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            Percentage Calculator
                            <Sparkles className="w-4 h-4 text-accent" />
                        </h2>
                        <p className="text-sm text-text-muted">Convert CGPA/SGPA to percentage using official JNTUH formula</p>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    {/* Converter Row */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                        <div>
                            <label className="label-caps mb-2">CGPA / SGPA</label>
                            <input
                                type="number"
                                value={input}
                                onChange={handleChange}
                                placeholder="e.g., 8.50"
                                min="0"
                                max="10"
                                step="0.01"
                                className={`input-field w-full text-2xl font-black ${error ? 'border-error ring-1 ring-error/20' : ''}`}
                            />
                            {error && <p className="text-error text-xs mt-2 font-medium">{error}</p>}
                        </div>

                        <div className="hidden md:flex items-center justify-center pb-4">
                            <ArrowRight className="w-6 h-6 text-text-muted" />
                        </div>

                        <div>
                            <label className="label-caps mb-2">Percentage</label>
                            <div className={`input-field w-full text-2xl font-black flex items-center justify-center ${isValid ? 'text-accent bg-accent/5' : 'text-text-muted'
                                }`}>
                                {isValid ? `${percentage?.toFixed(2)}%` : '—'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Formula Info */}
            <div className="card p-6">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-text-primary mb-1">Official JNTUH Formula</h3>
                        <div className="bg-bg-primary border border-border rounded-lg p-3 font-mono text-sm text-primary mb-2">
                            Percentage = (CGPA - 0.5) × 10
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed">
                            This formula is as per JNTUH Academic Regulations for R16, R18, R22 and R24.
                            Example: CGPA 8.5 → (8.5 - 0.5) × 10 = <b className="text-accent">80%</b>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
