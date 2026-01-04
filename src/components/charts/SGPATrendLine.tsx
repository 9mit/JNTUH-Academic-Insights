import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    Line,
} from 'recharts';
import { useAcademic } from '../../context/AcademicContext';
import { getSemesterSGPA } from '../../utils/calculations';
import { getSemesterShortLabel } from '../../constants/grading';

export default function SGPATrendLine() {
    const { data } = useAcademic();

    const chartData = data.semesters
        .map(sem => ({
            name: getSemesterShortLabel(sem.year, sem.sem),
            sgpa: getSemesterSGPA(sem),
            year: sem.year,
            sem: sem.sem,
        }))
        // Filter out completely empty semesters (no data), but keep 0 SGPA if valid
        .filter(item => {
            const sem = data.semesters.find(s => s.year === item.year && s.sem === item.sem);
            if (!sem) return false;
            return (sem.mode === 'detailed' && sem.subjects.length > 0) ||
                (sem.mode === 'manual' && (sem.manualSGPA ?? -1) >= 0);
        });

    if (chartData.length === 0) {
        return (
            <div className="glass-card p-6 h-80 flex items-center justify-center">
                <p className="text-gray-500">No data available for SGPA trend</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">SGPA Trend</h3>
            <p className="text-xs text-gray-500 mb-4">
                Performance across {chartData.length} semester(s)
            </p>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="sgpaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <YAxis
                            domain={[0, 10]}
                            stroke="#64748b"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            ticks={[0, 2, 4, 6, 8, 10]}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #38bdf8',
                                borderRadius: '8px',
                                boxShadow: '0 0 20px rgba(56, 189, 248, 0.3)',
                            }}
                            labelStyle={{ color: '#e2e8f0' }}
                            itemStyle={{ color: '#38bdf8' }}
                            formatter={(value: number | undefined) => [value !== undefined ? value.toFixed(2) : '—', 'SGPA']}
                        />
                        <Area
                            type="monotone"
                            dataKey="sgpa"
                            stroke="#38bdf8"
                            strokeWidth={3}
                            fill="url(#sgpaGradient)"
                        />
                        <Line
                            type="monotone"
                            dataKey="sgpa"
                            stroke="#38bdf8"
                            strokeWidth={3}
                            dot={{ fill: '#38bdf8', strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 8, fill: '#22d3ee', stroke: '#38bdf8', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
