import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { useAcademic } from '../../context/AcademicContext';
import { getYearlyAverages } from '../../utils/calculations';

const COLORS = ['#38bdf8', '#22d3ee', '#a78bfa', '#4ade80'];

export default function YearlyBarChart() {
    const { data } = useAcademic();
    const yearlyData = getYearlyAverages(data.semesters);

    const chartData = yearlyData.map(item => ({
        name: `Year ${item.year}`,
        average: item.average,
        semesters: item.semesters,
    }));

    if (chartData.length === 0) {
        return (
            <div className="glass-card p-6 h-80 flex items-center justify-center">
                <p className="text-gray-500">No data available for yearly averages</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Yearly Averages</h3>
            <p className="text-xs text-gray-500 mb-4">
                Average SGPA by academic year
            </p>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                            formatter={(value: number | undefined, _name: string | undefined, props: { payload?: { semesters?: number } }) => [
                                `${value !== undefined ? value.toFixed(2) : '—'} (${props.payload?.semesters || 0} sem)`,
                                'Avg. SGPA',
                            ]}
                        />
                        <Bar dataKey="average" radius={[8, 8, 0, 0]}>
                            {chartData.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    style={{
                                        filter: `drop-shadow(0 0 8px ${COLORS[index % COLORS.length]}40)`,
                                    }}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
