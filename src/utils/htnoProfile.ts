/**
 * Parse JNTUH hall ticket hints for personalization.
 * Format example: 21C01A0585 → year=21, college=C01, degree=A (B.Tech), branch=05
 */

export interface HtnoProfile {
  admissionYear: number | null;
  examYearHint: string;
  collegeCode: string;
  degreeCode: string;
  degreeLabel: string;
  branchCode: string;
  regulationHint: string;
}

const DEGREE_MAP: Record<string, string> = {
  A: 'B.Tech',
  R: 'B.Tech',
  S: 'B.Pharmacy',
  E: 'B.Tech',
  F: 'MBA',
  D: 'M.Tech',
};

export function parseHtno(htno?: string): HtnoProfile | null {
  const raw = (htno || '').trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z0-9]{8}$/.test(raw)) return null;

  const yy = parseInt(raw.slice(0, 2), 10);
  const admissionYear = Number.isFinite(yy) ? 2000 + yy : null;
  const collegeCode = raw.slice(2, 5);
  const degreeCode = raw.slice(5, 6);
  const branchCode = raw.slice(6, 8);

  let regulationHint = 'R18';
  if (admissionYear) {
    if (admissionYear >= 2025) regulationHint = 'R25';
    else if (admissionYear >= 2024) regulationHint = 'R24';
    else if (admissionYear >= 2022) regulationHint = 'R22';
    else if (admissionYear >= 2018) regulationHint = 'R18';
    else if (admissionYear >= 2016) regulationHint = 'R16';
    else if (admissionYear === 2015) regulationHint = 'R15';
    else regulationHint = 'R13';
  }

  const current = new Date().getFullYear();
  return {
    admissionYear,
    examYearHint: String(current),
    collegeCode,
    degreeCode,
    degreeLabel: DEGREE_MAP[degreeCode] || 'B.Tech',
    branchCode,
    regulationHint,
  };
}

export function maskHallTicket(htno?: string): string {
  const raw = (htno || '').trim().toUpperCase();
  if (raw.length < 6) return raw || '—';
  return `${raw.slice(0, 4)}****${raw.slice(-2)}`;
}
