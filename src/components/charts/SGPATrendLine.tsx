import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts';
import { useAcademic } from '../../context/AcademicContext';
import { getSemesterSGPA, hasSemesterData } from '../../utils/calculations';
import { getSemesterShortLabel } from '../../constants/grading';

export default function SGPATrendLine({ showContainer = false }: { showContainer?: boolean }) {
    const { data } = useAcademic();

    const chartData = data.semesters
        .map(sem => ({
            name: getSemesterShortLabel(sem.year, sem.sem),
            sgpa: getSemesterSGPA(sem, data.regulation),
            year: sem.year,
            sem: sem.sem,
        }))
        .filter(item => {
            const sem = data.semesters.find(s => s.year === item.year && s.sem === item.sem);
            if (!sem) return false;
            return hasSemesterData(sem);
        });

    if (chartData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm font-mono">
                No semester SGPA data recorded
            </div>
        );
    }

    const sgpaValues = chartData.map(d => d.sgpa).filter(v => v > 0);
    const avgSGPA = sgpaValues.length > 0 ? (sgpaValues.reduce((a, b) => a + b, 0) / sgpaValues.length).toFixed(2) : '—';
    const maxSGPA = sgpaValues.length > 0 ? Math.max(...sgpaValues).toFixed(2) : '—';

    const content = (
        <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-text-muted font-mono">
                <span>Recorded: {chartData.length} semesters</span>
                <span className="tabular-nums">Avg: {avgSGPA} · Peak: {maxSGPA}</span>
            </div>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="sgpaAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3155E7" stopOpacity={0.16} />
                                <stop offset="95%" stopColor="#3155E7" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
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
                            formatter={(value: number | undefined) => [
                                value !== undefined ? `${value.toFixed(2)} SGPA` : '—',
                                'Performance'
                            ]}
                        />
                        <Area
                            type="monotone"
                            dataKey="sgpa"
                            stroke="#3155E7"
                            strokeWidth={2.5}
                            fill="url(#sgpaAreaGradient)"
                            dot={{ fill: '#FFFFFF', stroke: '#3155E7', strokeWidth: 2, r: 4 }}
                            activeDot={{ fill: '#3155E7', stroke: '#FFFFFF', strokeWidth: 2, r: 6 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    if (showContainer) {
        return (
            <div className="card p-6">
                <h3 className="text-base font-semibold text-text-primary mb-2">SGPA Trajectory</h3>
                {content}
            </div>
        );
    }

    return content;
}
