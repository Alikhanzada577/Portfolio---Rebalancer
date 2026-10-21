import { afterWeights } from "@/lib/engine/after-weights";
import { planBuys } from "@/lib/engine/buys";
import { breachesBand, CASH, computeDrift, withImplicitCash } from "@/lib/engine/drift";
import type { PlanInput, PlanRow, PricedRow, RebalancePlan } from "@/lib/engine/plan-types";
import { postTradeWarnings, preTradeWarnings, scalingWarning } from "@/lib/engine/plan-warnings";
import { planSells } from "@/lib/engine/sells";

export type { PlanInput, RebalancePlan, Trade } from "@/lib/engine/plan-types";

const isPriced = (row: PlanRow): row is PricedRow => row.symbol !== CASH && row.price !== null && row.assetType !== null;

/**
 * Turns an account snapshot and targets into a rebalance plan. Pure: no I/O.
 * Within the drift band -> no trades. Otherwise EVERY targeted symbol is brought to target
 * (sells first, then buys funded by cash + proceeds - buffer).
 */
export function generatePlan(input: PlanInput): RebalancePlan {
  const { account, instruments = {}, driftBandPct, cashBufferPct, minTradeValue = 1, now = new Date() } = input;

  if (!account.currencyOk) {
    return { status: "excluded", mode: "manual", message: "This account isn't in a single USD currency, so it can't be rebalanced.", base: 0, rows: [], trades: [], after: [], leftoverCash: account.cash, unmanaged: [], warnings: account.warnings };
  }

  const drift = computeDrift(account, input.targets, instruments); // validates, and turns unallocated % into cash
  const targets = withImplicitCash(input.targets);
  const { base, rows } = drift;
  const mode = account.supportsTrading ? "trade" : "manual";
  const unmanaged = drift.unmanaged.map((h) => ({ symbol: h.symbol, value: h.value }));
  const warnings = preTradeWarnings(account, rows, now);

  if (!breachesBand(rows, driftBandPct)) {
    return { status: "within_band", mode, message: "Within band, no trades needed.", base, rows, trades: [], after: afterWeights(rows, [], account.cash, base), leftoverCash: account.cash, unmanaged, warnings };
  }

  const tradable = rows.filter(isPriced);
  const sells = planSells(tradable, account, minTradeValue);
  const proceeds = sells.reduce((sum, t) => sum + t.estValue, 0);

  const budget = Math.max(0, account.cash + proceeds - (base * cashBufferPct) / 100);
  const { buys, scale } = planBuys({ rows: tradable, account, budget, minTradeValue });
  if (scale < 1) warnings.push(scalingWarning(cashBufferPct, scale));

  const trades = [...sells, ...buys];
  const leftoverCash = account.cash + proceeds - buys.reduce((sum, t) => sum + t.estValue, 0);
  const after = afterWeights(rows, trades, leftoverCash, base);
  warnings.push(...postTradeWarnings({ account, trades, after, targets }));

  return { status: "rebalance", mode, message: null, base, rows, trades, after, leftoverCash, unmanaged, warnings };
}
