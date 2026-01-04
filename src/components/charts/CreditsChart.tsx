import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { useAcademic } from '../../context/AcademicContext';
import { getCreditsStats } from '../../utils/calculations';
import { REGULATION_CREDITS } from '../../constants/grading';
import type { Regulation } from '../../types';

export default function CreditsChart() {
    const { data } = useAcademic();
    const { earned, lost } = getCreditsStats(data.semesters);
    const regulation = data.regulation as Regulation;

    // Get total required credits for this regulation (defaults to 160)
    const requiredCredits = REGULATION_CREDITS[regulation] || 160;
    const attempted = earned + lost;
    const remaining = Math.max(0, requiredCredits - earned);
    const progressPercent = Math.min(100, (earned / requiredCredits) * 100);

    if (attempted === 0) {
        return (
            <div className="h-80 flex items-center justify-center">
                <p className="text-text-muted text-sm">No credits data available (use Detailed Mode)</p>
            </div>
        );
    }

    const chartData = [
        { name: 'Earned', value: earned, color: '#10b981' },
        { name: 'Lost (F/Ab)', value: lost, color: '#ef4444' },
        { name: 'Remaining', value: remaining, color: '#1f2937' },
    ].filter(item => item.value > 0);

    return (
        <div className="space-y-4">
            {/* Progress Bar */}
            <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Degree Progress</span>
                    <span className="text-xs font-bold text-primary">{regulation}</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden mb-2">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-white font-bold">{earned} <span className="text-text-muted font-normal">/ {requiredCredits} Credits</span></span>
                    <span className={`font-bold ${progressPercent >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {progressPercent.toFixed(0)}%
                    </span>
                </div>
            </div>

            {/* Pie Chart */}
            <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    style={{
                                        filter: entry.name !== 'Remaining' ? `drop-shadow(0 0 6px ${entry.color}50)` : 'none',
                                    }}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#111',
                                border: '1px solid #333',
                                borderRadius: '8px',
                            }}
                            formatter={(value: number | undefined, name: string | undefined) => [
                                `${value || 0} credits`,
                                name || '',
                            ]}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Stats Table */}
            <div className="grid grid-cols-3 gap-2 text-center border-t border-white/5 pt-4">
                <div>
                    <p className="text-lg font-black text-emerald-400">{earned}</p>
                    <p className="text-[10px] text-text-muted font-bold uppercase">Earned</p>
                </div>
                <div>
                    <p className="text-lg font-black text-rose-400">{lost}</p>
                    <p className="text-[10px] text-text-muted font-bold uppercase">Lost</p>
                </div>
                <div>
                    <p className="text-lg font-black text-text-secondary">{remaining}</p>
                    <p className="text-[10px] text-text-muted font-bold uppercase">Remaining</p>
                </div>
            </div>
        </div>
    );
}
