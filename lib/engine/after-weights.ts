import { CASH } from "@/lib/engine/drift";
import type { PlanRow, Trade } from "@/lib/engine/plan-types";

/** Estimated weights (% of base) once the trades have filled, ignoring fees. Cash is always last. */
export function afterWeights(rows: PlanRow[], trades: Trade[], cashAfter: number, base: number) {
  const pct = (value: number) => (base > 0 ? (value / base) * 100 : 0);
  const weights = rows
    .filter((r) => r.symbol !== CASH)
    .map((row) => {
      const delta = trades.filter((t) => t.symbol === row.symbol).reduce((sum, t) => sum + (t.side === "buy" ? t.estValue : -t.estValue), 0);
      return { symbol: row.symbol, pct: pct(row.currentValue + delta) };
    });
  weights.push({ symbol: CASH, pct: pct(cashAfter) });
  return weights;
}
