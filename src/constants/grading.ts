import type { Grade, Regulation } from '../types';

// JNTUH Official Grade Points (10-point scale)
export const GRADE_POINTS: Record<Grade, number> = {
    'S': 10,
    'O': 10,
    'A+': 9,
    'A': 8,
    'B+': 7,
    'B': 6,
    'C': 5,
    'D': 4,
    'E': 5,
    'F': 0,
    'Ab': 0,
};

// All available grades
export const GRADES: Grade[] = ['S', 'O', 'A+', 'A', 'B+', 'B', 'C', 'D', 'E', 'F', 'Ab'];

// Grade colors for visualization
export const GRADE_COLORS: Record<Grade, string> = {
    'S': '#22c55e',
    'O': '#10b981',
    'A+': '#14b8a6',
    'A': '#3b82f6',
    'B+': '#8b5cf6',
    'B': '#f59e0b',
    'C': '#fb923c',
    'D': '#f97316',
    'E': '#facc15',
    'F': '#ef4444',
    'Ab': '#ef4444',
};

// Legacy R18 default — prefer getStandardSemesterCredits(regulation) at call sites
export const STANDARD_CREDITS = 20;

// Official JNTUH credits required per regulation (degree minimum to award B.Tech).
// Prefer official memo SGPA/CGPA; earned credits use API semesterCredits so extras
// that inflate subject rows do not inflate degree progress. Year bars = distribution only.
// Sources: R13/R15/R16/R18/R22/R25 academic regulation PDFs (jntuh.ac.in and affiliates).
export const REGULATION_CREDITS: Record<Regulation, number> = {
    'R13': 216,  // register 224, secure 216
    'R15': 218,  // register 226, secure 218
    'R16': 192,  // 24 credits × 8 semesters
    'R18': 160,
    'R22': 160,
    'R24': 160,  // transitional alias (no standalone R24 PDF; colleges sometimes use R24 label)
    'R25': 160,  // register 164, earn ≥160
};

/** Credits registered in course structure (when different from earn minimum) */
export const REGULATION_REGISTERED_CREDITS: Partial<Record<Regulation, number>> = {
    'R13': 224,
    'R15': 226,
    'R25': 164,
};

/** Default when regulation is unknown / empty */
export const DEFAULT_REGULATION: Regulation = 'R18';

/** Degree credit minimum for a regulation (never hardcode 160/180/etc. at call sites) */
export function getRequiredCredits(regulation: Regulation | string | undefined | null): number {
    const key = (regulation || DEFAULT_REGULATION) as Regulation;
    return REGULATION_CREDITS[key] ?? REGULATION_CREDITS[DEFAULT_REGULATION];
}

/** Typical per-semester load for manual entry ≈ degree min ÷ 8 semesters */
export function getStandardSemesterCredits(regulation: Regulation | string | undefined | null): number {
    return Math.round(getRequiredCredits(regulation) / 8);
}

// Available regulations
export const REGULATIONS: Regulation[] = ['R13', 'R15', 'R16', 'R18', 'R22', 'R24', 'R25'];

// Semester labels
export const SEMESTER_LABELS: Record<string, string> = {
    '1-1': 'I Year I Semester',
    '1-2': 'I Year II Semester',
    '2-1': 'II Year I Semester',
    '2-2': 'II Year II Semester',
    '3-1': 'III Year I Semester',
    '3-2': 'III Year II Semester',
    '4-1': 'IV Year I Semester',
    '4-2': 'IV Year II Semester',
};

export const getSemesterLabel = (year: number, sem: number): string => {
    return SEMESTER_LABELS[`${year}-${sem}`] || `Year ${year} Sem ${sem}`;
};

export const getSemesterShortLabel = (year: number, sem: number): string => {
    return `${year}-${sem}`;
};

/**
 * Convert CGPA/SGPA to Percentage
 * 
 * Official JNTUH Formula (R16, R18, R22):
 * Percentage = (CGPA - 0.5) × 10
 * 
 * Source: JNTUH Academic Regulations
 */
export const toPercentage = (gpa: number): number => {
    if (gpa < 0 || gpa > 10) return 0;
    const percentage = (gpa - 0.5) * 10;
    return Math.max(0, Math.round(percentage * 100) / 100);
};

// Initialize empty semesters
export const createEmptySemesters = (): Array<import('../types').Semester> => {
    const semesters = [];
    for (let year = 1; year <= 4; year++) {
        for (let sem = 1; sem <= 2; sem++) {
            semesters.push({
                id: `${year}-${sem}`,
                year,
                sem,
                mode: 'detailed' as const,
                subjects: [],
                manualSGPA: null,
                isExpanded: year === 1 && sem === 1,
            });
        }
    }
    return semesters;
};

// Generate unique ID
export const generateId = (): string => {
    return Math.random().toString(36).substring(2, 11);
};
