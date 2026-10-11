import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { useAcademic } from '../../context/AcademicContext';
import { getCreditsStats } from '../../utils/calculations';
import { getRequiredCredits } from '../../constants/grading';
import type { Regulation } from '../../types';

export default function CreditsChart() {
    const { data } = useAcademic();
    const regulation = data.regulation as Regulation;
    const { earned, lost } = getCreditsStats(data.semesters, regulation);

    const requiredCredits = getRequiredCredits(regulation);
    const attempted = earned + lost;
    const remaining = Math.max(0, requiredCredits - earned);
    const progressPercent = Math.min(100, (earned / requiredCredits) * 100);

    if (attempted === 0) {
        return (
            <div className="h-60 flex items-center justify-center text-text-muted text-sm font-mono">
                No credit data available
            </div>
        );
    }

    const chartData = [
        { name: 'Earned', value: earned, color: '#10b981' },
        { name: 'Pending / Backlogs', value: lost, color: '#ef4444' },
        { name: 'Future Semesters', value: remaining, color: '#E2E8F0' },
    ].filter(item => item.value > 0);

    return (
        <div className="space-y-4">
            {/* Linear Progress Bar */}
            <div className="p-3.5 rounded-lg bg-surface-subtle border border-border">
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-text-muted">Degree Completion ({regulation})</span>
                    <span className="font-semibold text-text-primary tabular-nums">{progressPercent.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-border-subtle rounded-full overflow-hidden">
                    <div
                        className="h-full bg-accent rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mt-2">
                    <span>{earned} earned of {requiredCredits} min</span>
                    {remaining > 0 ? (
                        <span>{remaining} remaining</span>
                    ) : (
                        <span className="text-color-success">Requirement satisfied</span>
                    )}
                </div>
            </div>

            {/* Donut Distribution & Summary */}
            <div className="flex items-center justify-between gap-4">
                <div className="h-44 w-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={38}
                                outerRadius={62}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="#FFFFFF"
                                strokeWidth={2}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #E8EAF0',
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 25px -5px rgba(17, 19, 24, 0.08), 0 8px 10px -6px rgba(17, 19, 24, 0.04)',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '12px',
                                }}
                                labelStyle={{ color: '#111318', fontWeight: 600 }}
                                itemStyle={{ color: '#111318', fontWeight: 600 }}
                                formatter={(value: number | undefined, name: string | undefined) => [
                                    `${value || 0} credits`,
                                    name || ''
                                ]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 gap-2 w-full text-xs font-mono">
                    <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-text-secondary">Earned</span>
                        </div>
                        <span className="font-semibold text-emerald-600 tabular-nums">{earned}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="text-text-secondary">Failed / Absent</span>
                        </div>
                        <span className="font-semibold text-rose-600 tabular-nums">{lost}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                            <span className="text-text-secondary">Remaining</span>
                        </div>
                        <span className="font-semibold text-text-secondary tabular-nums">{remaining}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
