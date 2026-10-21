import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rebalanceOrders } from "@/lib/db/schema";
import type { Trade } from "@/lib/engine/trades";
import { describeOrderError } from "@/lib/rebalance/order-errors";
import { snaptradeFetch, SnapTradeError } from "@/lib/snaptrade/client";
import { orderRecordSchema } from "@/lib/snaptrade/schemas";

const TRADE_GAP_MS = 1100; // SnapTrade's soft limit is 1 trade/second/account
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Inserts an order row, then submits it as a Market/Day equity order via POST /trade/place.
 * The row's UUID is sent as `client_order_id` so a duplicate submission can be recognised by the brokerage.
 * Failures are recorded on the row, never thrown: one bad order must not stop the others.
 */
export async function submitOrders(userId: string, runId: string, accountId: string, trades: Trade[]) {
  for (const [i, trade] of trades.entries()) {
    if (i > 0) await sleep(TRADE_GAP_MS);
    const [row] = await db
      .insert(rebalanceOrders)
      .values({ runId, symbol: trade.symbol, side: trade.side, units: trade.units, estValue: trade.estValue, status: "pending" })
      .returning({ id: rebalanceOrders.id });
    try {
      const record = await snaptradeFetch(userId, "/trade/place", orderRecordSchema, {
        method: "POST",
        body: {
          account_id: accountId,
          action: trade.side === "buy" ? "BUY" : "SELL",
          symbol: trade.symbol,
          universal_symbol_id: null,
          order_type: "Market",
          time_in_force: "Day",
          units: trade.units,
          client_order_id: row.id,
        },
      });
      await db
        .update(rebalanceOrders)
        .set({ brokerageOrderId: record.brokerage_order_id ?? null, status: record.status ?? "PENDING" })
        .where(eq(rebalanceOrders.id, row.id));
    } catch (err) {
      if (!(err instanceof SnapTradeError)) console.error("order submit failed", err instanceof Error ? err.name : "unknown");
      await db.update(rebalanceOrders).set({ status: "FAILED", error: describeOrderError(err) }).where(eq(rebalanceOrders.id, row.id));
    }
  }
}
