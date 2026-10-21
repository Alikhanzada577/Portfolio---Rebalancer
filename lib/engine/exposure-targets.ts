import { CASH, type Targets } from "@/lib/engine/drift";
import type { EtfData, Exposure } from "@/lib/engine/exposure";

/**
 * What a target percentage means for an account:
 * - "direct":   the share of the account held directly in that symbol (the default).
 * - "exposure": for a stock, its TOTAL share of the account, counting what the targeted ETFs already hold of it.
 *               "Apple 20%" then means 20% Apple overall, so only the part the ETFs don't already provide is bought.
 */
export type TargetMode = "direct" | "exposure";

type ResolvedTargets = {
  /** Direct-holding targets the rebalance engine should aim for. */
  targets: Targets;
  /** One plain-language line per stock whose direct target was reduced, e.g. "AAPL: 20% total = 15.9% direct + 4.1% via SPY, VOO". */
  notes: string[];
  warnings: string[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

/** Which targeted symbols are ETFs: held positions typed as ETFs, plus tickers we know are ETFs (not yet held). */
export function targetedEtfs(targets: Targets, heldEtfs: Iterable<string>, knownEtfs: Iterable<string>): Set<string> {
  const etfs = new Set([...heldEtfs, ...knownEtfs]);
  return new Set(Object.keys(targets).filter((s) => s !== CASH && etfs.has(s)));
}

/**
 * Turns "total exposure" targets into the direct-holding targets the engine trades toward:
 *   direct(S) = exposureTarget(S) - sum over targeted ETFs E of ( target(E) * weight of S in E )
 * ETFs keep their own target (they are held directly). If the ETFs alone already exceed a stock's target, its
 * direct target is clamped to 0 with a warning (we never sell short or "sell the ETF's share" of it).
 * Whatever isn't allocated afterwards stays in cash, so an explicit CASH target is dropped (it would no longer add up).
 */
export function resolveTargets(targets: Targets, mode: TargetMode, etfs: Set<string>, etfData: Record<string, EtfData | undefined>): ResolvedTargets {
  if (mode !== "exposure" || etfs.size === 0) return { targets, notes: [], warnings: [] };

  const out: Targets = { ...targets };
  const notes: string[] = [];
  const warnings: string[] = [];
  let changed = false;

  for (const [symbol, target] of Object.entries(targets)) {
    if (symbol === CASH || etfs.has(symbol)) continue;
    let via = 0;
    const sources: string[] = [];
    for (const etf of etfs) {
      const weight = etfData[etf]?.constituents[symbol] ?? 0;
      if (weight > 0 && targets[etf] > 0) {
        via += targets[etf] * weight;
        sources.push(etf);
      }
    }
    if (via <= 0) continue;

    changed = true;
    const direct = Math.max(0, target - via);
    out[symbol] = round4(direct);
    if (target - via < 0) {
      warnings.push(`${symbol}: ${sources.join(", ")} alone already give about ${round2(via)}% exposure, above your ${round2(target)}% target, so nothing is held directly.`);
    } else {
      notes.push(`${symbol}: ${round2(target)}% total = ${round2(direct)}% held directly + ${round2(via)}% via ${sources.join(", ")}.`);
    }
  }

  if (changed) delete out[CASH];
  return { targets: out, notes, warnings };
}

/**
 * Current weight of each symbol on the same basis as the targets in "exposure" mode, in percent of the account:
 * a stock counts directly plus through ETFs; an ETF that was looked through counts as its own direct holding.
 */
export function exposureWeights(exposure: Exposure): Record<string, number> {
  return Object.fromEntries(exposure.rows.map((r) => [r.symbol, r.truePct > 0 ? r.truePct : r.directPct]));
}
