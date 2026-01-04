// JNTUH Grading Types and Interfaces

export type Regulation = 'R13' | 'R15' | 'R16' | 'R18' | 'R22' | 'R24';

export type Grade = 'O' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'F' | 'Ab';

export interface Subject {
    id: string;
    code?: string;
    name: string;
    grade: Grade;
    credits: number;
    internal?: number;
    external?: number;
    total?: number;
    official_sem_sgpa?: number; // Official SGPA from memo
}

export interface Semester {
    id: string;
    year: number; // 1, 2, 3, 4
    sem: number; // 1, 2
    mode: 'detailed' | 'manual';
    subjects: Subject[];
    manualSGPA: number | null;
    isExpanded: boolean;
}

export interface AcademicData {
    regulation: Regulation;
    semesters: Semester[];
    studentName?: string;
    hallTicket?: string;
    official_cgpa?: number;
}

export interface ParsedSubject {
    code?: string;
    name: string;
    grade: Grade;
    credits: number;
    official_sem_sgpa?: number;
}

export interface ParsedSemester {
    year: number;
    sem: number;
    subjects: ParsedSubject[];
    sgpa?: number;
}

export interface ParsedResult {
    semesters: ParsedSemester[];
    studentName?: string;
    hallTicket?: string;
    official_cgpa?: number;
}

export interface CalculationResult {
    sgpa: number;
    totalCredits: number;
    earnedCredits: number;
    lostCredits: number;
}

export interface CGPAResult {
    cgpa: number;
    isWeighted: boolean;
    totalCredits: number;
    percentage: number;
}

export interface GradeDistribution {
    O: number;
    'A+': number;
    A: number;
    'B+': number;
    B: number;
    C: number;
    F: number;
    Ab: number;
}

export interface PredictionResult {
    predictedSGPA: number;
    confidence: {
        low: number;
        high: number;
    };
    isMLBased: boolean;
    insights: string[];
}

export interface YearlyAverage {
    year: number;
    average: number;
    semesters: number;
}

export type ViewScope = 'all' | 'yearly' | 'single';

export type TabType = 'input' | 'dashboard' | 'predictions' | 'transcript' | 'notes' | 'help';
