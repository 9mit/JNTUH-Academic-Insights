import type { Subject, Semester, CalculationResult, CGPAResult, GradeDistribution, YearlyAverage, Regulation } from '../types';
import { GRADE_POINTS, toPercentage, REGULATION_CREDITS } from '../constants/grading';

/**
 * Normalizes subject identifier to heavily reduce duplicate tracking issues.
 */
export function getSubjectKey(subject: Subject): string {
    const rawCode = subject.code ? subject.code.toUpperCase() : '';
    if (rawCode && rawCode.length > 2) {
        return rawCode.replace(/[^A-Z0-9]/g, '');
    }
    return subject.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isMeaningfulSubject(subject: Subject): boolean {
    const code = subject.code?.trim().toUpperCase() ?? '';
    const name = subject.name.trim().toUpperCase();

    if (!code && !name) {
        return false;
    }

    if (code === 'SUBJECTCODE' || code === 'SUBJECT CODE' || code === 'CODE') {
        return false;
    }

    if (name === 'SUBJECT NAME' || name === 'NAME') {
        return false;
    }

    return Number.isFinite(subject.credits) && subject.credits >= 0;
}

export function getBestSubjects(subjects: Subject[]): Subject[] {
    const bestMap = new Map<string, Subject>();

    for (const subject of subjects) {
        if (!isMeaningfulSubject(subject)) {
            continue;
        }

        const key = getSubjectKey(subject);
        const existing = bestMap.get(key);
        if (!existing) {
            bestMap.set(key, subject);
            continue;
        }

        const currGP = GRADE_POINTS[subject.grade] ?? 0;
        const prevGP = GRADE_POINTS[existing.grade] ?? 0;
        if (currGP > prevGP || (existing.grade === 'Ab' && subject.grade === 'F')) {
            bestMap.set(key, subject);
        }
    }

    return Array.from(bestMap.values());
}

export function hasSemesterData(semester: Semester): boolean {
    if (semester.mode === 'manual') {
        return semester.manualSGPA !== null;
    }

    return getBestSubjects(semester.subjects).length > 0;
}

/**
 * Calculate SGPA for a set of subjects
 * Formula: Sum(credit * gradePoint) / Sum(credits)
 * Note: 0-credit subjects (mandatory courses) are excluded from calculation
 */
export function calculateSGPA(subjects: Subject[]): CalculationResult {
    // Deduplicate to find best attempt for calculation (handles multiple attempts in same semester)
    const bestSubjects = getBestSubjects(subjects);
    const creditSubjects = bestSubjects.filter(s => s.credits > 0);

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
    const officialSubject = getBestSubjects(semester.subjects).find(
        s => s.official_sem_sgpa !== undefined && s.official_sem_sgpa > 0
    );
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
    const validSemesters = semesters.filter(sem => hasSemesterData(sem) && getSemesterCredits(sem) > 0);

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
 * Check if a student is graduated based on their performance
 */
export function isGraduated(semesters: Semester[], regulation: Regulation = 'R18'): boolean {
    const { earned } = getCreditsStats(semesters);
    const required = REGULATION_CREDITS[regulation] ?? 160;
    
    const allSemesters = semesters.length >= 8;
    const backlogs = getBacklogs(semesters);
    
    // Direct credit match or clear pass of all 8 semesters
    if (earned >= required) return true;
    if (allSemesters && backlogs.length === 0 && earned >= required * 0.95) return true;
    
    return false;
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
        'S': 0, 'O': 0, 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0, 'Ab': 0
    };

    for (const semester of semesters) {
        if (semester.mode === 'detailed') {
            for (const subject of getBestSubjects(semester.subjects)) {
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

        if (hasSemesterData(semester) && credits > 0) {
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
    // Collect every attempt keyed by normalised subject code.
    // Key: uppercase subject code (or name if code is missing).
    const attemptsBySubject = new Map<
        string,
        { subject: Subject; year: number; sem: number }[]
    >();

    const FAIL_GRADES: string[] = ['F', 'Ab'];

    for (const semester of semesters) {
        if (semester.mode !== 'detailed') continue;

        for (const subject of semester.subjects) {
            if (!isMeaningfulSubject(subject)) {
                continue;
            }
            const key = getSubjectKey(subject);
            if (!attemptsBySubject.has(key)) {
                attemptsBySubject.set(key, []);
            }
            attemptsBySubject.get(key)!.push({
                subject,
                year: semester.year,
                sem: semester.sem,
            });
        }
    }

    const backlogs: BacklogInfo[] = [];

    for (const [, attempts] of attemptsBySubject) {
        // Check if the student has ANY passing attempt for this subject.
        const hasPassingAttempt = attempts.some(
            (a) => !FAIL_GRADES.includes(a.subject.grade)
        );

        if (hasPassingAttempt) continue; // Cleared — not a current backlog.

        // Still a backlog — use the earliest failure for display.
        const earliest = attempts[0];
        backlogs.push({
            subjectName: earliest.subject.name,
            subjectCode: earliest.subject.code || '',
            year: earliest.year,
            sem: earliest.sem,
            grade: earliest.subject.grade,
            credits: earliest.subject.credits,
        });
    }

    return backlogs;
}

/**
 * Get the count of distinct semesters with actual data
 */
export function getCompletedSemesterCount(semesters: Semester[]): number {
    return semesters.filter(sem => hasSemesterData(sem)).length;
}

/**
 * Determine student's graduation status
 * Returns: "graduated" | "graduated_with_backlogs" | "studying"
 */
export function getStudentStatus(semesters: Semester[], _regulation: Regulation = 'R18'): 'graduated' | 'graduated_with_backlogs' | 'studying' {
    const completedCount = getCompletedSemesterCount(semesters);
    const backlogs = getBacklogs(semesters);
    const hasAllEightSemesters = completedCount >= 8;

    // Check if student has completed all 8 semesters
    if (hasAllEightSemesters) {
        // Has all semesters but with active backlogs
        if (backlogs.length > 0) {
            return 'graduated_with_backlogs';
        }
        // Has all semesters and no backlogs
        return 'graduated';
    }

    // Still studying (has data but not all 8 semesters yet)
    return 'studying';
}

/**
 * Get display string for student status with details
 */
export function getStatusLabel(semesters: Semester[], _regulation: Regulation = 'R18'): string {
    const status = getStudentStatus(semesters, _regulation);
    const completedCount = getCompletedSemesterCount(semesters);
    const backlogs = getBacklogs(semesters);

    switch (status) {
        case 'graduated':
            return `✓ Graduated (${completedCount}/8 semesters, No Backlogs)`;
        case 'graduated_with_backlogs':
            return `✓ Graduated with ${backlogs.length} Backlog(s) (${completedCount}/8 semesters)`;
        case 'studying':
            return `→ Currently Studying (${completedCount}/8 semesters)`;
        default:
            return 'Status Unknown';
    }
}
