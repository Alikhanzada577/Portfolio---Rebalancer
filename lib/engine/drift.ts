import type { AccountSnapshot, AssetType } from "@/lib/engine/portfolio";

/** Reserved target key for the account's cash. */
export const CASH = "CASH";

export type Targets = Record<string, number>; // symbol -> percent (0-100)

/** Price info for symbols the account doesn't hold yet (from a quote). Held symbols use their position price. */
export type Instruments = Record<string, { price: number; assetType: AssetType }>;

const SUM_TOLERANCE = 0.01;

export class InvalidTargetsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTargetsError";
  }
}

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
const sumOf = (t: Targets) => Object.values(t).reduce((s, p) => s + p, 0);

/**
 * Returns a plain-language problem, or null when the targets are usable.
 * Symbol targets may add up to LESS than 100: the rest stays in cash (see withImplicitCash).
 * They may never add up to more. If the caller sets an explicit CASH target, everything must add up to exactly 100.
 */
export function targetsProblem(targets: Targets): string | null {
  const entries = Object.entries(targets);
  if (entries.length === 0) return "Add at least one target.";
  for (const [sym, pct] of entries) {
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return `${sym}: a target must be between 0% and 100%.`;
  }
  const sum = sumOf(targets);
  if (CASH in targets) {
    if (Math.abs(sum - 100) > SUM_TOLERANCE) return `Targets (including cash) add up to ${sum.toFixed(2)}%, but they must add up to 100%.`;
  } else if (sum > 100 + SUM_TOLERANCE) {
    return `Targets add up to ${sum.toFixed(2)}%, which is more than 100%. Lower one of them.`;
  }
  return null;
}

/**
 * Whatever the targets don't allocate stays in cash: AAPL 10% + TSLA 20% means 70% cash.
 * Nothing is added when the targets already reach 100% (fully invested) or CASH is set explicitly.
 */
export function withImplicitCash(targets: Targets): Targets {
  if (CASH in targets) return targets;
  const rest = round4(100 - sumOf(targets));
  return rest > SUM_TOLERANCE ? { ...targets, [CASH]: rest } : targets;
}

export type DriftRow = {
  symbol: string; // CASH for the cash row
  assetType: AssetType | null; // null for cash
  held: boolean;
  units: number;
  price: number | null; // null: no price known, so it can't be traded
  currentValue: number;
  currentPct: number;
  targetPct: number;
  /** Percentage points: current minus target. Positive = overweight. */
  driftPct: number;
  targetValue: number;
  /** Dollars to buy (+) or sell (-) to reach target. */
  diff: number;
};

type Drift = {
  /** Cash + value of every targeted holding. Untargeted holdings are outside it. */
  base: number;
  rows: DriftRow[];
  unmanaged: AccountSnapshot["holdings"];
};

export function computeDrift(account: AccountSnapshot, rawTargets: Targets, instruments: Instruments = {}): Drift {
  const problem = targetsProblem(rawTargets);
  if (problem) throw new InvalidTargetsError(problem);
  const targets = withImplicitCash(rawTargets);

  const held = new Map(account.holdings.map((h) => [h.symbol, h]));
  const targetedHoldings = account.holdings.filter((h) => h.symbol in targets);
  const base = account.cash + targetedHoldings.reduce((s, h) => s + h.value, 0);
  const pctOf = (v: number) => (base > 0 ? (v / base) * 100 : 0);

  const rows: DriftRow[] = Object.entries(targets).map(([symbol, targetPct]) => {
    const targetValue = (base * targetPct) / 100;
    if (symbol === CASH) {
      return { symbol, assetType: null, held: true, units: account.cash, price: null, currentValue: account.cash, currentPct: pctOf(account.cash), targetPct, driftPct: pctOf(account.cash) - targetPct, targetValue, diff: targetValue - account.cash };
    }
    const h = held.get(symbol);
    const inst = instruments[symbol];
    const price = h?.price ?? inst?.price ?? null;
    const currentValue = h?.value ?? 0;
    return {
      symbol,
      assetType: h?.assetType ?? inst?.assetType ?? null,
      held: !!h,
      units: h?.units ?? 0,
      price,
      currentValue,
      currentPct: pctOf(currentValue),
      targetPct,
      driftPct: pctOf(currentValue) - targetPct,
      targetValue,
      diff: targetValue - currentValue,
    };
  });

  return { base, rows, unmanaged: account.holdings.filter((h) => !(h.symbol in targets)) };
}

/** True when any targeted row is further than `bandPct` percentage points from its target. */
export const breachesBand = (rows: DriftRow[], bandPct: number) => rows.some((r) => Math.abs(r.driftPct) > bandPct);
