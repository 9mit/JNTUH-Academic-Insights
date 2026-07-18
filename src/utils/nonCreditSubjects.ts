/**
 * Dynamic non-credit detection from fetched marks (no name/code hardcoding).
 *
 * Audit courses often arrive as credits=0 with inverted marks
 * (internal = score, external = 0). Credit courses can share the same
 * single-sided pattern when credits > 0, so we only classify when credits == 0
 * AND the marks layout matches a single-mark audit row.
 *
 * Failed credit subjects also often arrive with credits=0 but with both
 * internal and external populated — those must NOT be flagged non-credit.
 */

export interface MarksCreditsInput {
  internal?: number | null;
  external?: number | null;
  total?: number | null;
  credits?: number | null;
}

export interface NormalizedNonCredit {
  internal?: number;
  external?: number;
  total?: number;
  credits: number;
  nonCredit: boolean;
}

function asNum(v: number | null | undefined): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return v;
}

function isZeroOrMissing(v: number | undefined): boolean {
  return v === undefined || v === 0;
}

/** Inverted audit layout: score in internal, external empty, total matches score */
export function isInvertedSingleMark(
  internal: number | undefined,
  external: number | undefined,
  total: number | undefined
): boolean {
  if (internal === undefined || internal <= 0) return false;
  if (!isZeroOrMissing(external)) return false;
  if (total !== undefined && total !== internal) return false;
  return true;
}

/** Correct audit layout: internal 0, external has the only mark */
export function isCorrectAuditMark(
  internal: number | undefined,
  external: number | undefined,
  total: number | undefined
): boolean {
  if (external === undefined || external <= 0) return false;
  if (!isZeroOrMissing(internal)) return false;
  if (total !== undefined && total !== external) return false;
  return true;
}

function isTotalOnlyMark(
  internal: number | undefined,
  external: number | undefined,
  total: number | undefined
): boolean {
  return (
    isZeroOrMissing(internal) &&
    isZeroOrMissing(external) &&
    total !== undefined &&
    total > 0
  );
}

/**
 * Normalize marks + flag non-credit for a fetched subject row.
 * Never forces credits=0 when API/PDF already reported credits > 0.
 */
export function normalizeNonCreditSubject(input: MarksCreditsInput): NormalizedNonCredit {
  const internal = asNum(input.internal ?? undefined);
  const external = asNum(input.external ?? undefined);
  const total = asNum(input.total ?? undefined);
  const rawCredits = asNum(input.credits ?? undefined);
  const credits = rawCredits !== undefined && rawCredits > 0 ? rawCredits : 0;

  if (credits > 0) {
    return {
      ...(internal !== undefined ? { internal } : {}),
      ...(external !== undefined ? { external } : {}),
      ...(total !== undefined ? { total } : {}),
      credits,
      nonCredit: false,
    };
  }

  // credits == 0 + inverted single-mark → non-credit, swap Int/Ext
  if (isInvertedSingleMark(internal, external, total)) {
    const mark = internal!;
    return {
      internal: 0,
      external: mark,
      total: total ?? mark,
      credits: 0,
      nonCredit: true,
    };
  }

  // credits == 0 + correct audit layout
  if (isCorrectAuditMark(internal, external, total)) {
    return {
      internal: 0,
      external: external!,
      total: total ?? external!,
      credits: 0,
      nonCredit: true,
    };
  }

  // PDF 1-token often lands only in total
  if (isTotalOnlyMark(internal, external, total)) {
    return {
      internal: 0,
      external: total!,
      total: total!,
      credits: 0,
      nonCredit: true,
    };
  }

  // credits == 0 but not an audit marks pattern (e.g. F/Ab with both marks)
  return {
    ...(internal !== undefined ? { internal } : {}),
    ...(external !== undefined ? { external } : {}),
    ...(total !== undefined ? { total } : {}),
    credits: 0,
    nonCredit: false,
  };
}

/** True only when explicitly flagged as audit / non-credit */
export function isNonCreditSubject(subject: {
  nonCredit?: boolean;
}): boolean {
  return subject.nonCredit === true;
}
