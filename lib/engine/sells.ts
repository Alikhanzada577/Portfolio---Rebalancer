import type { AccountSnapshot } from "@/lib/engine/portfolio";
import type { PricedRow, Trade } from "@/lib/engine/plan-types";
import { decimalsFor, floorUnits, isExecutable } from "@/lib/engine/trade-rules";

/**
 * Sells for overweight holdings. A 0% target sells the exact held quantity (ignoring rounding); otherwise
 * units round down and never exceed what is held. Trades under the minimum value are dropped.
 */
export function planSells(rows: PricedRow[], account: AccountSnapshot, minTradeValue: number): Trade[] {
  const held = new Map(account.holdings.map((h) => [h.symbol, h]));
  const sells: Trade[] = [];
  for (const row of rows.filter((r) => r.diff < 0)) {
    const position = held.get(row.symbol)!;
    const units = row.targetValue <= 0 ? position.units : Math.min(position.units, floorUnits(-row.diff / row.price, decimalsFor(row.assetType, account.supportsFractional)));
    const estValue = units * row.price;
    if (units > 0 && estValue >= minTradeValue) sells.push({ symbol: row.symbol, side: "sell", units, price: row.price, estValue, assetType: row.assetType, executable: isExecutable(account, row.assetType) });
  }
  return sells;
}
