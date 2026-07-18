import type { Grade, Regulation } from '../types';

/** Regulation-specific grade points — mirrors backend/shared.py GRADE_POINTS_BY_REGULATION */
export const GRADE_POINTS_BY_REGULATION: Record<Regulation, Record<string, number>> = {
    R25: { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, D: 4, F: 0, Ab: 0, '-': 0 },
    R24: { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, D: 4, F: 0, Ab: 0, '-': 0 },
    R22: { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, D: 4, F: 0, Ab: 0, '-': 0 },
    R18: { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, D: 4, F: 0, Ab: 0, '-': 0 },
    R16: { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, O: 10, 'A+': 9, 'B+': 8, 'C+': 7, F: 0, Ab: 0, '-': 0 },
    R15: { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, O: 10, 'A+': 9, 'B+': 8, 'C+': 7, F: 0, Ab: 0, '-': 0 },
    R13: { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, O: 10, 'A+': 9, 'B+': 8, 'C+': 7, F: 0, Ab: 0, '-': 0 },
};

export function getGradePointsForRegulation(grade: Grade | string, regulation: Regulation = 'R22'): number {
    const map = GRADE_POINTS_BY_REGULATION[regulation] ?? GRADE_POINTS_BY_REGULATION.R18;
    return map[grade] ?? 0;
}

export function detectRegulationFromHallTicket(htno: string): Regulation {
    if (!htno || htno.length < 2) return 'R18';
    try {
        const year = parseInt(htno.slice(0, 2), 10);
        if (year >= 25) return 'R25';
        if (year >= 24) return 'R24';
        if (year >= 22) return 'R22';
        if (year >= 18) return 'R18';
        if (year >= 16) return 'R16';
        if (year === 15) return 'R15';
        return 'R13';
    } catch {
        return 'R18';
    }
}

export function getValidGradesForRegulation(regulation: Regulation): string[] {
    return Object.keys(GRADE_POINTS_BY_REGULATION[regulation] ?? GRADE_POINTS_BY_REGULATION.R18);
}
