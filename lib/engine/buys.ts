import type { AccountSnapshot } from "@/lib/engine/portfolio";
import type { PricedRow, Trade } from "@/lib/engine/plan-types";
import { decimalsFor, floorUnits, isExecutable } from "@/lib/engine/trade-rules";

type BuyInput = {
  rows: PricedRow[];
  account: AccountSnapshot;
  /** Cash available to spend: cash + sell proceeds - cash buffer, never negative. */
  budget: number;
  minTradeValue: number;
};

/**
 * Buys for underweight holdings, funded by `budget`. When the budget is short, EVERY buy is scaled by the same
 * factor (returned as `scale`, 1 = no scaling) so the allocation drifts toward target evenly. Units round down.
 */
export function planBuys({ rows, account, budget, minTradeValue }: BuyInput): { buys: Trade[]; scale: number } {
  const wanted = rows.filter((r) => r.diff > 0);
  const wantedTotal = wanted.reduce((sum, r) => sum + r.diff, 0);
  const scale = wantedTotal > budget && wantedTotal > 0 ? budget / wantedTotal : 1;

  const buys: Trade[] = [];
  for (const row of wanted) {
    const units = floorUnits((row.diff * scale) / row.price, decimalsFor(row.assetType, account.supportsFractional));
    const estValue = units * row.price;
    if (units > 0 && estValue >= minTradeValue) buys.push({ symbol: row.symbol, side: "buy", units, price: row.price, estValue, assetType: row.assetType, executable: isExecutable(account, row.assetType) });
  }
  return { buys, scale };
}
