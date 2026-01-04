import type { Semester } from '../types';
import { getSemesterSGPA } from './calculations';

interface HeuristicInsight {
    type: 'trend' | 'volatility' | 'recovery' | 'performance' | 'warning';
    message: string;
    value?: number;
}

/**
 * Calculate trend slope using simple linear regression
 */
function calculateTrendSlope(data: number[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = data.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
}

/**
 * Calculate volatility (standard deviation of differences)
 */
function calculateVolatility(data: number[]): number {
    if (data.length < 2) return 0;

    const diffs = [];
    for (let i = 1; i < data.length; i++) {
        diffs.push(Math.abs(data[i] - data[i - 1]));
    }

    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = diffs.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / diffs.length;

    return Math.sqrt(variance);
}

/**
 * Generate heuristic insights from SGPA data
 */
export function generateHeuristicInsights(semesters: Semester[]): HeuristicInsight[] {
    const insights: HeuristicInsight[] = [];

    const sgpaData = semesters
        .map(sem => getSemesterSGPA(sem))
        .filter(sgpa => sgpa > 0);

    if (sgpaData.length < 2) {
        insights.push({
            type: 'warning',
            message: 'Add data for at least 2 semesters to see performance insights.',
        });
        return insights;
    }

    // Trend analysis
    const slope = calculateTrendSlope(sgpaData);
    if (slope > 0.2) {
        insights.push({
            type: 'trend',
            message: `Strong upward trend! Your SGPA is improving by ~${(slope).toFixed(2)} per semester.`,
            value: slope,
        });
    } else if (slope > 0.05) {
        insights.push({
            type: 'trend',
            message: `Steady improvement. Your performance is gradually increasing.`,
            value: slope,
        });
    } else if (slope < -0.2) {
        insights.push({
            type: 'warning',
            message: `Downward trend detected. Your SGPA is declining by ~${Math.abs(slope).toFixed(2)} per semester.`,
            value: slope,
        });
    } else if (slope < -0.05) {
        insights.push({
            type: 'trend',
            message: `Slight decline in performance. Consider reviewing your study habits.`,
            value: slope,
        });
    } else {
        insights.push({
            type: 'trend',
            message: `Stable performance. Your SGPA is consistent across semesters.`,
            value: slope,
        });
    }

    // Volatility analysis
    const volatility = calculateVolatility(sgpaData);
    if (volatility > 1.0) {
        insights.push({
            type: 'volatility',
            message: `High volatility (${volatility.toFixed(2)}). Your performance varies significantly between semesters.`,
            value: volatility,
        });
    } else if (volatility < 0.3) {
        insights.push({
            type: 'volatility',
            message: `Low volatility (${volatility.toFixed(2)}). You maintain consistent performance.`,
            value: volatility,
        });
    }

    // Best/Worst semester
    const maxSGPA = Math.max(...sgpaData);
    const minSGPA = Math.min(...sgpaData);
    const maxIdx = sgpaData.indexOf(maxSGPA);
    const minIdx = sgpaData.indexOf(minSGPA);

    if (maxSGPA - minSGPA > 1.5) {
        insights.push({
            type: 'performance',
            message: `Highest: ${maxSGPA.toFixed(2)} (Sem ${maxIdx + 1}), Lowest: ${minSGPA.toFixed(2)} (Sem ${minIdx + 1}). Gap: ${(maxSGPA - minSGPA).toFixed(2)}`,
        });
    }

    // Recovery analysis
    if (sgpaData.length >= 3) {
        const lastThree = sgpaData.slice(-3);
        if (lastThree[0] < lastThree[1] && lastThree[1] < lastThree[2]) {
            insights.push({
                type: 'recovery',
                message: 'Great recovery! Your last 3 semesters show consistent improvement.',
            });
        }
    }

    // Current performance level
    const latest = sgpaData[sgpaData.length - 1];
    const avg = sgpaData.reduce((a, b) => a + b, 0) / sgpaData.length;

    if (latest >= 9) {
        insights.push({
            type: 'performance',
            message: `Outstanding! Your latest SGPA (${latest.toFixed(2)}) is excellent.`,
        });
    } else if (latest >= 8) {
        insights.push({
            type: 'performance',
            message: `Very Good! Your latest SGPA (${latest.toFixed(2)}) is above average.`,
        });
    } else if (latest < avg - 0.5) {
        insights.push({
            type: 'warning',
            message: `Your latest SGPA (${latest.toFixed(2)}) is below your average (${avg.toFixed(2)}).`,
        });
    }

    return insights;
}

/**
 * Calculate required SGPA to reach target CGPA
 */
export function getRequiredSGPAForTarget(
    semesters: Semester[],
    targetCGPA: number,
    remainingSemesters: number = 1,
    creditsPerSemester: number = 20
): { required: number; achievable: boolean; message: string } | null {
    if (targetCGPA < 0 || targetCGPA > 10) return null;
    if (remainingSemesters < 1) return null;

    const sgpaData = semesters.filter(sem => getSemesterSGPA(sem) > 0);

    if (sgpaData.length === 0) {
        return {
            required: targetCGPA,
            achievable: targetCGPA <= 10,
            message: `You need an average SGPA of ${targetCGPA.toFixed(2)} to achieve your target.`,
        };
    }

    // Calculate current weighted sum
    let currentSum = 0;
    let currentCredits = 0;

    for (const sem of sgpaData) {
        const sgpa = getSemesterSGPA(sem);
        const credits = sem.mode === 'manual' ? 20 : sem.subjects.reduce((sum, s) => sum + s.credits, 0);
        currentSum += sgpa * credits;
        currentCredits += credits;
    }

    // Calculate required SGPA
    const futureCredits = remainingSemesters * creditsPerSemester;
    const totalCredits = currentCredits + futureCredits;
    const requiredSum = targetCGPA * totalCredits;
    const neededSum = requiredSum - currentSum;
    const requiredSGPA = neededSum / futureCredits;

    const achievable = requiredSGPA >= 0 && requiredSGPA <= 10;

    let message: string;
    if (requiredSGPA > 10) {
        message = `Target CGPA of ${targetCGPA.toFixed(2)} is not achievable. Maximum possible CGPA with perfect 10s is ${((currentSum + futureCredits * 10) / totalCredits).toFixed(2)}.`;
    } else if (requiredSGPA < 0) {
        message = `You've already exceeded your target! You can score 0 in remaining semesters and still achieve ${targetCGPA.toFixed(2)} CGPA.`;
    } else if (requiredSGPA >= 9.5) {
        message = `You need ${requiredSGPA.toFixed(2)} SGPA (near-perfect) in ${remainingSemesters} remaining semester(s). This is challenging but possible!`;
    } else if (requiredSGPA >= 8) {
        message = `You need ${requiredSGPA.toFixed(2)} SGPA in ${remainingSemesters} remaining semester(s). This is achievable with good effort!`;
    } else {
        message = `You need just ${requiredSGPA.toFixed(2)} SGPA in ${remainingSemesters} remaining semester(s). You're on track!`;
    }

    return {
        required: Math.round(requiredSGPA * 100) / 100,
        achievable,
        message,
    };
}
