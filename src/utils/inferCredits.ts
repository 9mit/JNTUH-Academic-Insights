import type { Grade, Regulation } from '../types';

/** Compact syllabus credit lookup (mirrors backend/syllabus.json codes). */
const SYLLABUS_CREDITS: Partial<Record<Regulation, Record<string, number>>> = {
  R22: {
    MA101BS: 4, CH102BS: 4, CS103ES: 3, EN104HS: 2, ME105ES: 1.5, CS106ES: 1.5,
    CH107BS: 1.5, EN108HS: 1.5, MC109ES: 0, MA201BS: 4, PH202BS: 4, CS203ES: 3,
    EE204ES: 2, ME205ES: 1.5, PH206BS: 1.5, CS207ES: 1.5, EE208ES: 1.5,
    CS301PC: 3, CS302PC: 3, CS303PC: 3, CS304PC: 3, CS305PC: 3, CS306PC: 1.5,
    CS307PC: 1.5, CS308PC: 1.5, MC301ES: 0, CS401PC: 3, CS402PC: 3, CS403PC: 3,
    CS404PC: 3, CS405PC: 1.5, CS406PC: 1.5, MC401ES: 0,
  },
  R18: {
    MA101BS: 3, CH102BS: 3, EE103ES: 3, ME105ES: 1.5, EN105HS: 2, CS103ES: 3,
    MC109ES: 0, CS301PC: 4, CS302PC: 4, CS401PC: 4, MC400: 0,
  },
  R24: {
    MA101BS: 4, CH102BS: 4, CS103ES: 3, EN104HS: 2, ME105ES: 1.5, CS106ES: 1.5,
    CH107BS: 1.5, EN108HS: 1.5, MC109ES: 0,
  },
  R16: {
    MA101BS: 4, CS102ES: 4, ME103ES: 4, PH104BS: 4, CH105BS: 4,
  },
};

const FAIL_GRADES = new Set(['F', 'Ab', 'AB', 'ABSENT']);

const ZERO_CREDIT_KEYWORDS = [
  'environmental', 'constitution', 'ethics', 'gender sensitization',
  'human values', 'cyber security', 'audit', 'non-credit', 'ncc', 'nss', 'sports',
];

/**
 * Infer subject credits when upstream APIs return 0 (common for F/Ab grades).
 * Keep in sync with server.py infer_credits.
 */
export function inferCredits(
  code: string | undefined,
  name: string | undefined,
  year: number,
  sem: number,
  regulation: Regulation = 'R18'
): number {
  const nameLower = (name || '').toLowerCase().trim();
  const codeUpper = (code || '').toUpperCase().trim();
  const codeLower = (code || '').toLowerCase().trim();
  const isOld = regulation === 'R13' || regulation === 'R15' || regulation === 'R16';

  if (ZERO_CREDIT_KEYWORDS.some((kw) => nameLower.includes(kw))) {
    return isOld ? 2 : 0;
  }

  const fromSyllabus = SYLLABUS_CREDITS[regulation]?.[codeUpper];
  if (typeof fromSyllabus === 'number') return fromSyllabus;

  const projectKeywords = ['project work', 'main project', 'major project', 'dissertation'];
  if (year === 4 && sem === 2 && projectKeywords.some((kw) => nameLower.includes(kw))) return 10;
  if (year === 4 && sem === 2 && (nameLower.includes('viva') || nameLower.includes('comprehensive'))) return 2;
  if (['seminar', 'colloq', 'presentation'].some((kw) => nameLower.includes(kw))) return 2;
  if (nameLower.includes('mini project') || nameLower.includes('course project')) return isOld ? 3 : 2;
  if (nameLower.includes('project')) return 2;
  if ((codeLower.endsWith('l') && codeUpper.length >= 5) || nameLower.includes('lab') || nameLower.includes('practical')) {
    return isOld ? 2 : 1.5;
  }
  if (['workshop', 'skill', 'induction', 'communication'].some((kw) => nameLower.includes(kw))) {
    return isOld ? 2 : 1;
  }

  const heavy = ['mathematics', 'calculus', 'statistics', 'probability', 'physics', 'chemistry', 'mechanics'];
  if (heavy.some((kw) => nameLower.includes(kw))) return 4;

  return 3;
}

/**
 * Resolve credits for backlog / display weights.
 * - Keep API credits when > 0
 * - Never invent credits for non-credit / audit rows
 * - Audit / non-credit → 0
 * - F/Ab with 0 → infer (backlog / lost credits)
 * - Pass with 0 → syllabus / lab heuristics only; do NOT invent default 3
 */
export function resolveCredits(
  credits: number | undefined | null,
  code: string | undefined,
  name: string | undefined,
  year: number,
  sem: number,
  regulation: Regulation = 'R18',
  grade?: string | Grade,
  nonCredit?: boolean
): number {
  if (nonCredit) return 0;
  if (typeof credits === 'number' && credits > 0) return credits;

  const nameLower = (name || '').toLowerCase().trim();
  const codeUpper = (code || '').toUpperCase().trim();
  const isOld = regulation === 'R13' || regulation === 'R15' || regulation === 'R16';

  if (ZERO_CREDIT_KEYWORDS.some((kw) => nameLower.includes(kw))) {
    return isOld ? 2 : 0;
  }

  const fromSyllabus = SYLLABUS_CREDITS[regulation]?.[codeUpper];
  if (typeof fromSyllabus === 'number') return fromSyllabus;

  const g = (grade || '').trim();
  const isFail = FAIL_GRADES.has(g);

  if (isFail) {
    return inferCredits(code, name, year, sem, regulation);
  }

  // Pass (or unknown grade) with 0 from API: only apply structural heuristics, never blanket 3
  const codeLower = (code || '').toLowerCase().trim();
  if ((codeLower.endsWith('l') && codeUpper.length >= 5) || nameLower.includes('lab') || nameLower.includes('practical')) {
    return isOld ? 2 : 1.5;
  }
  if (['workshop', 'skill', 'induction'].some((kw) => nameLower.includes(kw))) {
    return isOld ? 2 : 1;
  }
  if (nameLower.includes('mini project') || nameLower.includes('course project')) {
    return isOld ? 3 : 2;
  }
  if (year === 4 && sem === 2 && (nameLower.includes('project work') || nameLower.includes('major project'))) {
    return 10;
  }

  // Leave 0 rather than invent theory credits — prevents 166/160 inflation
  return 0;
}
