import { CASH, type Targets } from "@/lib/engine/drift";
import type { AccountSnapshot } from "@/lib/engine/portfolio";
import type { PlanRow, Trade } from "@/lib/engine/plan-types";

const STALE_MS = 15 * 60 * 1000;
const RESIDUAL_DRIFT_PP = 1;

/** Problems knowable before any trade is sized. */
export function preTradeWarnings(account: AccountSnapshot, rows: PlanRow[], now: Date): string[] {
  const warnings: string[] = [];
  if (!account.supportsTrading) warnings.push("This account can't place trades through this app (read-only connection or unsupported). Use the trade list below to trade manually.");
  if (account.asOf && now.getTime() - new Date(account.asOf).getTime() > STALE_MS) warnings.push(`Positions were last refreshed ${new Date(account.asOf).toLocaleString()}. Prices may be out of date.`);
  for (const row of rows) {
    if (row.symbol === CASH) continue;
    if (row.price === null) warnings.push(`No price available for ${row.symbol}, so it is left out of this rebalance.`);
    else if (!row.held && row.targetPct > 0) warnings.push(`${row.symbol} isn't held yet; this rebalance will only buy it.`);
  }
  return warnings;
}

export const scalingWarning = (cashBufferPct: number, scale: number) =>
  `Keeping the ${cashBufferPct}% cash buffer leaves less cash than the targets need, so every buy was scaled to ${(scale * 100).toFixed(1)}% of its full size.`;

type PostInput = { account: AccountSnapshot; trades: Trade[]; after: { symbol: string; pct: number }[]; targets: Targets };

/** Problems only visible once the trades are known. */
export function postTradeWarnings({ account, trades, after, targets }: PostInput): string[] {
  const warnings: string[] = [];
  if (!account.supportsFractional) {
    const worst = Math.max(0, ...after.filter((a) => a.symbol in targets).map((a) => Math.abs(a.pct - targets[a.symbol])));
    if (worst > RESIDUAL_DRIFT_PP) warnings.push("This brokerage doesn't support fractional shares, so rounding to whole shares leaves some residual drift.");
  }
  if (account.supportsTrading && trades.some((t) => !t.executable)) warnings.push("Some trades (e.g. crypto) can't be placed by this app and are listed as manual trades.");
  if (trades.length === 0) warnings.push("The drift is outside the band, but every trade is smaller than the minimum trade size.");
  return warnings;
}
