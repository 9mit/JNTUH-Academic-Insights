import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts';
import { useAcademic } from '../../context/AcademicContext';
import { getGradeDistribution } from '../../utils/calculations';
import { GRADE_COLORS, GRADES } from '../../constants/grading';

export default function GradeDistribution() {
    const { data } = useAcademic();
    const distribution = getGradeDistribution(data.semesters);

    const chartData = GRADES
        .map(grade => ({
            name: grade,
            value: distribution[grade],
            color: GRADE_COLORS[grade],
        }))
        .filter(item => item.value > 0);

    const totalGrades = chartData.reduce((sum, item) => sum + item.value, 0);

    if (totalGrades === 0) {
        return (
            <div className="glass-card p-6 h-80 flex items-center justify-center">
                <p className="text-gray-500">No grade data available (use Detailed Mode)</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Grade Distribution</h3>
            <p className="text-xs text-gray-500 mb-4">
                Total: {totalGrades} subjects
            </p>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    style={{
                                        filter: `drop-shadow(0 0 8px ${entry.color}40)`,
                                    }}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #38bdf8',
                                borderRadius: '8px',
                                boxShadow: '0 0 20px rgba(56, 189, 248, 0.3)',
                            }}
                            formatter={(value: number | undefined, name: string | undefined) => [
                                `${value || 0} (${value !== undefined ? ((value / totalGrades) * 100).toFixed(1) : 0}%)`,
                                name || '',
                            ]}
                        />
                        <Legend
                            formatter={(value) => (
                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
