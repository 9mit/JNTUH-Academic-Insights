import React from 'react';
import { useAcademic } from '../context/AcademicContext';
import { Award, AlertCircle, CheckCircle2 } from 'lucide-react';

export function PerformanceReport() {
    const { getCGPA } = useAcademic();
    const { cgpa, percentage } = getCGPA();

    let status = 'Good Standing';
    let color = 'text-accent';
    let icon = CheckCircle2;
    let message = 'Performance aligns with university degree criteria.';

    if (cgpa >= 8.5) {
        status = 'Distinction Tier';
        color = 'text-emerald-700';
        icon = Award;
        message = 'Top academic cohort · First Class with Distinction.';
    } else if (cgpa < 6.5) {
        status = 'Remediation Recommended';
        color = 'text-amber-800';
        icon = AlertCircle;
        message = 'Focus on clearing any pending backlogs and raising core course grades.';
    }

    return (
        <div className="card p-3 border border-border-subtle bg-bg-card flex items-start gap-3">
            <div className={`p-1.5 rounded bg-bg-card-subtle ${color} border border-border-subtle shrink-0`}>
                {React.createElement(icon, { className: "w-4 h-4" })}
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold font-mono ${color}`}>
                        {status}
                    </span>
                    <span className="text-[11px] font-mono text-text-muted">
                        {cgpa.toFixed(2)} CGPA ({percentage.toFixed(1)}%)
                    </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed mt-0.5">
                    {message}
                </p>
            </div>
        </div>
    );
}

export default PerformanceReport;
