import type { Subject, Semester, CalculationResult, CGPAResult, GradeDistribution, YearlyAverage } from '../types';
import { GRADE_POINTS, toPercentage } from '../constants/grading';

/**
 * Calculate SGPA for a set of subjects
 * Formula: Sum(credit * gradePoint) / Sum(credits)
 * Note: 0-credit subjects (mandatory courses) are excluded from calculation
 */
export function calculateSGPA(subjects: Subject[]): CalculationResult {
    // Filter out 0-credit subjects (mandatory courses like Environmental Science, Constitution of India)
    const creditSubjects = subjects.filter(s => s.credits > 0);

    if (creditSubjects.length === 0) {
        return { sgpa: 0, totalCredits: 0, earnedCredits: 0, lostCredits: 0 };
    }

    let totalCredits = 0;
    let totalGradePoints = 0;
    let earnedCredits = 0;
    let lostCredits = 0;

    for (const subject of creditSubjects) {
        const gradePoint = GRADE_POINTS[subject.grade] ?? 0;
        totalCredits += subject.credits;
        totalGradePoints += subject.credits * gradePoint;

        if (subject.grade === 'F' || subject.grade === 'Ab') {
            lostCredits += subject.credits;
        } else {
            earnedCredits += subject.credits;
        }
    }

    const sgpa = totalCredits > 0 ? Math.round((totalGradePoints / totalCredits) * 100) / 100 : 0;

    return { sgpa, totalCredits, earnedCredits, lostCredits };
}

/**
 * Get SGPA for a semester
 * Priority:
 * 1. Manual mode: uses user-entered SGPA
 * 2. Official SGPA from JNTUH website (if available)
 * 3. Calculated from subject data (fallback)
 */
export function getSemesterSGPA(semester: Semester): number {
    // Manual mode: user enters their SGPA
    if (semester.mode === 'manual') {
        return semester.manualSGPA ?? 0;
    }

    // Detailed mode: prefer official SGPA if available
    const officialSubject = semester.subjects.find(s => s.official_sem_sgpa !== undefined && s.official_sem_sgpa > 0);
    if (officialSubject?.official_sem_sgpa) {
        return officialSubject.official_sem_sgpa;
    }

    // Fallback: calculate from subjects using scraped credits
    return calculateSGPA(semester.subjects).sgpa;
}

/**
 * Get credits for a semester (from scraped subject data)
 */
export function getSemesterCredits(semester: Semester): number {
    if (semester.mode === 'manual') {
        return 20; // Standard for manual mode
    }
    // Use actual scraped credits from subjects (excluding 0-credit courses)
    return calculateSGPA(semester.subjects).totalCredits;
}

/**
 * Calculate CGPA across all semesters
 * Formula: Sum(semesterCredits * semesterSGPA) / Sum(totalCredits)
 */
export function calculateCGPA(semesters: Semester[]): CGPAResult {
    const validSemesters = semesters.filter(sem => {
        if (sem.mode === 'manual') return (sem.manualSGPA ?? 0) > 0;
        return sem.subjects.length > 0 && getSemesterSGPA(sem) > 0;
    });

    if (validSemesters.length === 0) {
        return { cgpa: 0, isWeighted: true, totalCredits: 0, percentage: 0 };
    }

    let totalCredits = 0;
    let weightedSum = 0;

    for (const semester of validSemesters) {
        const sgpa = getSemesterSGPA(semester);
        const credits = getSemesterCredits(semester);

        totalCredits += credits;
        weightedSum += sgpa * credits;
    }

    const cgpa = totalCredits > 0 ? Math.round((weightedSum / totalCredits) * 100) / 100 : 0;
    const percentage = toPercentage(cgpa);

    return { cgpa, isWeighted: true, totalCredits, percentage };
}

/**
 * Validate SGPA/CGPA input
 */
export function validateGPA(value: number): boolean {
    return value >= 0 && value <= 10;
}

/**
 * Get grade distribution across all semesters
 */
export function getGradeDistribution(semesters: Semester[]): GradeDistribution {
    const distribution: GradeDistribution = {
        'O': 0, 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'F': 0, 'Ab': 0
    };

    for (const semester of semesters) {
        if (semester.mode === 'detailed') {
            for (const subject of semester.subjects) {
                if (subject.grade && subject.credits > 0) {
                    distribution[subject.grade]++;
                }
            }
        }
    }

    return distribution;
}

/**
 * Get yearly averages
 */
export function getYearlyAverages(semesters: Semester[]): YearlyAverage[] {
    const yearlyData: Record<number, { sum: number; credits: number; semesters: number }> = {};

    for (const semester of semesters) {
        const sgpa = getSemesterSGPA(semester);
        const credits = getSemesterCredits(semester);

        if (sgpa > 0) {
            if (!yearlyData[semester.year]) {
                yearlyData[semester.year] = { sum: 0, credits: 0, semesters: 0 };
            }
            yearlyData[semester.year].sum += sgpa * credits;
            yearlyData[semester.year].credits += credits;
            yearlyData[semester.year].semesters++;
        }
    }

    return Object.entries(yearlyData).map(([year, data]) => ({
        year: parseInt(year),
        average: data.credits > 0 ? Math.round((data.sum / data.credits) * 100) / 100 : 0,
        semesters: data.semesters
    }));
}



/**
 * Calculate required SGPA to reach target CGPA
 */
export function calculateRequiredSGPA(
    semesters: Semester[],
    targetCGPA: number,
    remainingSemesters: number,
    creditsPerSemester: number = 20
): number | null {
    const currentResult = calculateCGPA(semesters);
    const currentCredits = currentResult.totalCredits;
    const currentWeightedSum = currentResult.cgpa * currentCredits;

    const futureCredits = remainingSemesters * creditsPerSemester;
    const totalCredits = currentCredits + futureCredits;
    const requiredWeightedSum = targetCGPA * totalCredits;
    const neededSum = requiredWeightedSum - currentWeightedSum;
    const requiredSGPA = neededSum / futureCredits;

    if (requiredSGPA > 10 || requiredSGPA < 0) {
        return null; // Not achievable
    }

    return Math.round(requiredSGPA * 100) / 100;
}

/**
 * Get performance category based on CGPA
 */
export function getPerformanceCategory(cgpa: number): string {
    if (cgpa >= 9.5) return 'Outstanding';
    if (cgpa >= 9.0) return 'Excellent';
    if (cgpa >= 8.0) return 'Very Good';
    if (cgpa >= 7.0) return 'Good';
    if (cgpa >= 6.0) return 'Above Average';
    if (cgpa >= 5.0) return 'Average';
    return 'Below Average';
}

/**
 * Get credits statistics (earned and lost)
 */
export function getCreditsStats(semesters: Semester[]): { earned: number; lost: number } {
    let earned = 0;
    let lost = 0;

    for (const semester of semesters) {
        if (semester.mode === 'detailed') {
            const result = calculateSGPA(semester.subjects);
            earned += result.earnedCredits;
            lost += result.lostCredits;
        } else if (semester.mode === 'manual' && (semester.manualSGPA ?? 0) > 0) {
            earned += 20; // Assume standard credits for manual mode
        }
    }

    return { earned, lost };
}

/**
 * Backlog information type
 */
interface BacklogInfo {
    subjectName: string;
    subjectCode: string;
    year: number;
    sem: number;
    grade: string;
    credits: number;
}

/**
 * Get list of backlog subjects
 */
export function getBacklogs(semesters: Semester[]): BacklogInfo[] {
    const backlogs: BacklogInfo[] = [];

    for (const semester of semesters) {
        if (semester.mode === 'detailed') {
            for (const subject of semester.subjects) {
                if ((subject.grade === 'F' || subject.grade === 'Ab') && subject.credits > 0) {
                    backlogs.push({
                        subjectName: subject.name,
                        subjectCode: subject.code || '',
                        year: semester.year,
                        sem: semester.sem,
                        grade: subject.grade,
                        credits: subject.credits
                    });
                }
            }
        }
    }

    return backlogs;
}
