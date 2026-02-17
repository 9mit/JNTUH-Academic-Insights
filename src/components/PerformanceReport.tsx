import React from 'react';
import { useAcademic } from '../context/AcademicContext';
import { Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function PerformanceReport() {
    const { getCGPA } = useAcademic();
    const { cgpa, percentage } = getCGPA();

    // Simple analysis based on CGPA
    let status = 'Good';
    let color = 'text-emerald-400';
    let icon = CheckCircle2;
    let message = 'You are maintaining a good academic standing.';

    if (cgpa >= 8.5) {
        status = 'Excellent';
        color = 'text-purple-400';
        icon = Sparkles;
        message = 'Outstanding performance! You are in the top tier.';
    } else if (cgpa < 6.5) {
        status = 'Needs Improvement';
        color = 'text-amber-400';
        icon = AlertTriangle;
        message = 'Focus on clearing backlogs and improving grades in upcoming semesters.';
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-4">
            <div className={`p-2 rounded-xl bg-white/5 ${color} border border-white/5`}>
                {React.createElement(icon, { className: "w-5 h-5" })}
            </div>
            <div>
                <h4 className={`text-sm font-bold ${color} mb-1`}>
                    Performance: {status}
                </h4>
                <p className="text-xs text-text-muted leading-relaxed">
                    {message} With a current CGPA of <strong className="text-white">{cgpa.toFixed(2)}</strong>, you have secured {percentage.toFixed(1)}% marks.
                </p>
            </div>
        </div>
    );
}

export default PerformanceReport;
