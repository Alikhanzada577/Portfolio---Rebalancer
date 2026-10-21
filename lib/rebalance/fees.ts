import type { Trade } from "@/lib/engine/trades";
import { impactKey, type StoredPlan, type TradeImpact } from "@/lib/rebalance/types";

/** Commission + FX fees for one order, or null when the brokerage gave no estimate. Never $0 for "unknown". */
export function feeOf(impact: TradeImpact | null | undefined): number | null {
  if (!impact || (impact.commission === null && impact.forexFees === null)) return null;
  return (impact.commission ?? 0) + (impact.forexFees ?? 0);
}

export type FeeSummary = {
  /** Sum of the fees we know, or null when none are known. */
  known: number | null;
  /** Orders with no estimate. */
  unknown: number;
  /** How many orders this app will actually place (manual trades have no fee estimate). */
  placed: number;
};

export function summarizeFees(trades: Trade[], impact: StoredPlan["impact"]): FeeSummary {
  const fees = trades.filter((t) => t.executable).map((t) => feeOf(impact[impactKey(t.side, t.symbol)]));
  const known = fees.filter((f): f is number => f !== null);
  return { known: known.length ? known.reduce((sum, f) => sum + f, 0) : null, unknown: fees.length - known.length, placed: fees.length };
}
