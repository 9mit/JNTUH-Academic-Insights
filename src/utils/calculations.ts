import type { Subject, Semester, CalculationResult, CGPAResult, GradeDistribution, YearlyAverage, Regulation } from '../types';
import { GRADE_POINTS, toPercentage, getRequiredCredits, getStandardSemesterCredits } from '../constants/grading';
import { getGradePointsForRegulation } from './regulationGrades';
import { isNonCreditSubject } from './nonCreditSubjects';

function gradePoints(grade: Subject['grade'], regulation?: Regulation): number {
    return regulation ? getGradePointsForRegulation(grade, regulation) : (GRADE_POINTS[grade] ?? 0);
}

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

export function getBestSubjects(subjects: Subject[], regulation?: Regulation): Subject[] {
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

        const currGP = gradePoints(subject.grade, regulation);
        const prevGP = gradePoints(existing.grade, regulation);
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
 * Note: non-credit / 0-credit subjects are excluded from calculation
 */
export function calculateSGPA(subjects: Subject[], regulation?: Regulation): CalculationResult {
    // Deduplicate to find best attempt for calculation (handles multiple attempts in same semester)
    const bestSubjects = getBestSubjects(subjects, regulation);
    const creditSubjects = bestSubjects.filter(s => !isNonCreditSubject(s) && s.credits > 0);

    if (creditSubjects.length === 0) {
        return { sgpa: 0, totalCredits: 0, earnedCredits: 0, lostCredits: 0 };
    }

    let totalCredits = 0;
    let totalGradePoints = 0;
    let earnedCredits = 0;
    let lostCredits = 0;

    for (const subject of creditSubjects) {
        const gradePoint = gradePoints(subject.grade, regulation);
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
export function getSemesterSGPA(semester: Semester, regulation?: Regulation): number {
    // Manual mode: user enters their SGPA
    if (semester.mode === 'manual') {
        return semester.manualSGPA ?? 0;
    }

    // Detailed mode: prefer official SGPA if available
    const officialSubject = getBestSubjects(semester.subjects, regulation).find(
        s => s.official_sem_sgpa !== undefined && s.official_sem_sgpa > 0
    );
    if (officialSubject?.official_sem_sgpa) {
        return officialSubject.official_sem_sgpa;
    }

    // Fallback: calculate from subjects using scraped credits
    return calculateSGPA(semester.subjects, regulation).sgpa;
}

/**
 * Get credits for a semester.
 * Prefer official API semesterCredits when present — subject rows can over-count
 * (e.g. electives listed with credits that are not in the semester total).
 */
export function getSemesterCredits(semester: Semester, regulation?: Regulation): number {
    if (semester.mode === 'manual') {
        return getStandardSemesterCredits(regulation);
    }
    if (typeof semester.officialCredits === 'number' && semester.officialCredits > 0) {
        return semester.officialCredits;
    }
    return calculateSGPA(semester.subjects, regulation).totalCredits;
}

/**
 * Calculate CGPA across all semesters
 * Formula: Sum(semesterCredits * semesterSGPA) / Sum(totalCredits)
 */
export function calculateCGPA(semesters: Semester[], regulation?: Regulation): CGPAResult {
    const validSemesters = semesters.filter(sem => hasSemesterData(sem) && getSemesterCredits(sem, regulation) > 0);

    if (validSemesters.length === 0) {
        return { cgpa: 0, isWeighted: true, totalCredits: 0, percentage: 0 };
    }

    let totalCredits = 0;
    let weightedSum = 0;

    for (const semester of validSemesters) {
        const sgpa = getSemesterSGPA(semester, regulation);
        const credits = getSemesterCredits(semester, regulation);

        totalCredits += credits;
        weightedSum += sgpa * credits;
    }

    const cgpa = totalCredits > 0 ? Math.round((weightedSum / totalCredits) * 100) / 100 : 0;
    const percentage = toPercentage(cgpa);

    return { cgpa, isWeighted: true, totalCredits, percentage };
}

/**
 * Degree award check: earned credits ≥ regulation minimum, no F/Ab credit loss,
 * and CGPA ≥ 5.0 (JNTUH award of degree rule across R16–R25).
 */
export function isGraduated(
    semesters: Semester[],
    regulation: Regulation = 'R18',
    officialCgpa?: number | null,
): boolean {
    const { earned, lost } = getCreditsStats(semesters, regulation);
    const required = getRequiredCredits(regulation);
    const cgpa =
        officialCgpa != null && officialCgpa > 0
            ? officialCgpa
            : calculateCGPA(semesters, regulation).cgpa;

    return earned >= required && lost === 0 && cgpa >= 5.0;
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
                if (subject.grade && !isNonCreditSubject(subject) && subject.credits > 0) {
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
export function getYearlyAverages(semesters: Semester[], regulation?: Regulation): YearlyAverage[] {
    const yearlyData: Record<number, { sum: number; credits: number; semesters: number }> = {};

    for (const semester of semesters) {
        const sgpa = getSemesterSGPA(semester, regulation);
        const credits = getSemesterCredits(semester, regulation);

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
    creditsPerSemester?: number,
    regulation?: Regulation,
): number | null {
    const perSem = creditsPerSemester ?? getStandardSemesterCredits(regulation);
    const currentResult = calculateCGPA(semesters, regulation);
    const currentCredits = currentResult.totalCredits;
    const currentWeightedSum = currentResult.cgpa * currentCredits;

    const futureCredits = remainingSemesters * perSem;
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
 * Get credits statistics (earned and lost).
 * When API semesterCredits are present, earned = official registered − lost (F/Ab).
 * Totals follow each regulation's official semester credits, not a fixed 160.
 */
export function getCreditsStats(
    semesters: Semester[],
    regulation?: Regulation
): { earned: number; lost: number } {
    let earned = 0;
    let lost = 0;
    const manualCredits = getStandardSemesterCredits(regulation);

    for (const semester of semesters) {
        if (semester.mode === 'detailed') {
            const result = calculateSGPA(semester.subjects, regulation);
            lost += result.lostCredits;
            if (typeof semester.officialCredits === 'number' && semester.officialCredits > 0) {
                earned += Math.max(0, semester.officialCredits - result.lostCredits);
            } else {
                earned += result.earnedCredits;
            }
        } else if (semester.mode === 'manual' && (semester.manualSGPA ?? 0) > 0) {
            earned += manualCredits;
        }
    }

    return { earned, lost };
}

/** Earned credits for a single academic year (official semesterCredits when available) */
export function getYearEarnedCredits(
    semesters: Semester[],
    year: number,
    regulation?: Regulation
): number {
    const manualCredits = getStandardSemesterCredits(regulation);
    return semesters
        .filter((s) => s.year === year)
        .reduce((sum, s) => {
            if (!hasSemesterData(s)) return sum;
            if (s.mode === 'manual') return sum + ((s.manualSGPA ?? 0) > 0 ? manualCredits : 0);
            const result = calculateSGPA(s.subjects, regulation);
            if (typeof s.officialCredits === 'number' && s.officialCredits > 0) {
                return sum + Math.max(0, s.officialCredits - result.lostCredits);
            }
            return sum + result.earnedCredits;
        }, 0);
}

/** Official registered credits for a year from API semesterCredits when present */
export function getYearOfficialCredits(semesters: Semester[], year: number): number | null {
    const yearSems = semesters.filter((s) => s.year === year && hasSemesterData(s));
    if (yearSems.length === 0) return null;
    const withOfficial = yearSems.filter((s) => typeof s.officialCredits === 'number' && s.officialCredits! > 0);
    if (withOfficial.length === 0) return null;
    return withOfficial.reduce((sum, s) => sum + (s.officialCredits || 0), 0);
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
            if (!isMeaningfulSubject(subject) || isNonCreditSubject(subject)) {
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
        // Prefer the highest known credit across attempts (API often sends 0 on F grades).
        const earliest = attempts[0];
        const creditCandidate = Math.max(...attempts.map((a) => a.subject.credits || 0));
        backlogs.push({
            subjectName: earliest.subject.name,
            subjectCode: earliest.subject.code || '',
            year: earliest.year,
            sem: earliest.sem,
            grade: earliest.subject.grade,
            credits: creditCandidate,
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
