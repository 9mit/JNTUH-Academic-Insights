import type { Grade, Regulation } from '../types';

// JNTUH Official Grade Points (10-point scale)
export const GRADE_POINTS: Record<Grade, number> = {
    'O': 10,
    'A+': 9,
    'A': 8,
    'B+': 7,
    'B': 6,
    'C': 5,
    'F': 0,
    'Ab': 0,
};

// All available grades
export const GRADES: Grade[] = ['O', 'A+', 'A', 'B+', 'B', 'C', 'F', 'Ab'];

// Grade colors for visualization
export const GRADE_COLORS: Record<Grade, string> = {
    'O': '#10b981',
    'A+': '#14b8a6',
    'A': '#3b82f6',
    'B+': '#8b5cf6',
    'B': '#f59e0b',
    'C': '#fb923c',
    'F': '#ef4444',
    'Ab': '#ef4444',
};

// Standard credits per semester (for manual mode)
export const STANDARD_CREDITS = 20;

// Official JNTUH credits required per regulation (for degree)
// Source: JNTUH Academic Regulations
export const REGULATION_CREDITS: Record<Regulation, number> = {
    'R13': 216,  // 224 registered, 216 required for degree
    'R15': 200,  // Transition regulation
    'R16': 180,  // First CBCS regulation
    'R18': 160,  // AICTE model curriculum
    'R22': 160,  // Latest regulation
    'R24': 160,  // Follows R22 pattern
};

// Available regulations
export const REGULATIONS: Regulation[] = ['R13', 'R15', 'R16', 'R18', 'R22', 'R24'];

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
export const createEmptySemesters = (): Array<{
    id: string;
    year: number;
    sem: number;
    mode: 'detailed' | 'manual';
    subjects: never[];
    manualSGPA: null;
    isExpanded: boolean;
}> => {
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
