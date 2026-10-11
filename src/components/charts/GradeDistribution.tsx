import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { useAcademic } from '../../context/AcademicContext';
import { getGradeDistribution } from '../../utils/calculations';
import { GRADE_COLORS, GRADES } from '../../constants/grading';

export default function GradeDistribution({ showContainer = false }: { showContainer?: boolean }) {
    const { data } = useAcademic();
    const distribution = getGradeDistribution(data.semesters);

    const chartData = GRADES
        .map(grade => ({
            name: grade,
            value: distribution[grade] || 0,
            color: GRADE_COLORS[grade] || '#64748b',
        }))
        .filter(item => item.value > 0);

    const totalGrades = chartData.reduce((sum, item) => sum + item.value, 0);

    if (totalGrades === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm font-mono">
                No subject grades recorded
            </div>
        );
    }

    const content = (
        <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-text-muted font-mono">
                <span>Evaluated: {totalGrades} subjects</span>
                <span>O/S/A+: {((chartData.filter(d => ['O', 'S', 'A+'].includes(d.name)).reduce((a, b) => a + b.value, 0) / totalGrades) * 100).toFixed(0)}%</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="h-48 w-48 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={42}
                                outerRadius={68}
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
                                    `${value || 0} courses (${value !== undefined ? ((value / totalGrades) * 100).toFixed(1) : 0}%)`,
                                    `Grade ${name}`
                                ]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-2 gap-1.5 w-full text-xs font-mono">
                    {chartData.map(item => (
                        <div
                            key={item.name}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-surface-subtle border border-border"
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="font-semibold text-text-primary">{item.name}</span>
                            </div>
                            <span className="text-text-muted tabular-nums">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    if (showContainer) {
        return (
            <div className="card p-6">
                <h3 className="text-base font-semibold text-text-primary mb-2">Grade Distribution</h3>
                {content}
            </div>
        );
    }

    return content;
}
