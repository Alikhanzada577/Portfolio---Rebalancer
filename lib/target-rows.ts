// Pure helpers for the targets editor: what the user typed -> totals, validity and the cash remainder.

export type TargetRow = { symbol: string; /** What the user typed. "" means "not managed". */ pct: string; held: boolean };

export type TargetSummary = {
  /** Sum of the percentages entered for symbols. */
  total: number;
  /** What is actually allocated to direct holdings. Equals `total`, except in "total exposure" mode, where a stock's
   *  target includes what the ETFs already hold, so less is allocated directly. Drives the cash remainder. */
  allocated: number;
  /** What's left over: it stays in cash. */
  remainder: number;
  /** How many symbols have a target. */
  count: number;
  /** Some entry isn't a number from 0 to 100. */
  invalid: boolean;
  /** Symbols alone add up to more than 100%. */
  over: boolean;
  canSave: boolean;
};

const OVER_TOLERANCE = 0.01;

export const parsePct = (value: string) => (value.trim() === "" ? null : Number(value));

export function summarizeTargets(rows: TargetRow[], allocatedOverride?: number): TargetSummary {
  let total = 0;
  let count = 0;
  let invalid = false;
  for (const row of rows) {
    const pct = parsePct(row.pct);
    if (pct === null) continue;
    count++;
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) invalid = true;
    else total += pct;
  }
  const allocated = allocatedOverride ?? total;
  const over = allocated > 100 + OVER_TOLERANCE;
  return { total, allocated, remainder: Math.max(0, 100 - allocated), count, invalid, over, canSave: !invalid && !over && count > 0 };
}

/** Held symbols get their current weight (2 dp); everything else is cleared. Cash is simply what's left. */
export function withCurrentWeights(rows: TargetRow[], weights: Record<string, number>): TargetRow[] {
  return rows.map((row) => (row.held && weights[row.symbol] > 0 ? { ...row, pct: String(Math.round(weights[row.symbol] * 100) / 100) } : { ...row, pct: "" }));
}

/** Canonical ticker (BRK-B -> BRK.B), or null when it isn't a plausible symbol. */
export function normalizeSymbol(input: string): string | null {
  const symbol = input.trim().toUpperCase().replace(/-/g, ".");
  return /^[A-Z0-9][A-Z0-9.]{0,11}$/.test(symbol) ? symbol : null;
}
