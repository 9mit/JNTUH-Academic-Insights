import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { useAcademic } from '../../context/AcademicContext';
import { getYearlyAverages } from '../../utils/calculations';

export default function YearlyBarChart({ showContainer = false }: { showContainer?: boolean }) {
    const { data } = useAcademic();
    const yearlyData = getYearlyAverages(data.semesters, data.regulation);

    const chartData = yearlyData.map(item => ({
        name: `Year ${item.year}`,
        average: item.average,
        semesters: item.semesters,
    }));

    if (chartData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm font-mono">
                No yearly averages available
            </div>
        );
    }

    const content = (
        <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-text-muted font-mono">
                <span>Academic Years: {chartData.length}</span>
                <span>Range: 0.00 – 10.00</span>
            </div>

            <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke="#E8EAF0" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#94A3B8"
                            tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                            axisLine={{ stroke: '#E8EAF0' }}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[0, 10]}
                            stroke="#94A3B8"
                            tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                            ticks={[0, 2, 4, 6, 8, 10]}
                            axisLine={{ stroke: '#E8EAF0' }}
                            tickLine={false}
                        />
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
                            itemStyle={{ color: '#3155E7', fontWeight: 600 }}
                            formatter={(value: number | undefined, _name: string | undefined, props: { payload?: { semesters?: number } }) => [
                                `${value !== undefined ? value.toFixed(2) : '—'} SGPA (${props.payload?.semesters || 0} semesters)`,
                                'Annual Average'
                            ]}
                        />
                        <Bar
                            dataKey="average"
                            fill="#3155E7"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={48}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    if (showContainer) {
        return (
            <div className="card p-6">
                <h3 className="text-base font-semibold text-text-primary mb-2">Yearly Average Performance</h3>
                {content}
            </div>
        );
    }

    return content;
}
