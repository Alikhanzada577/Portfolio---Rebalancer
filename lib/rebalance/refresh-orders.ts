import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rebalanceOrders } from "@/lib/db/schema";
import type { Order } from "@/lib/rebalance/runs";
import { isTerminal } from "@/lib/rebalance/status";
import { snaptradeFetch, SnapTradeError } from "@/lib/snaptrade/client";
import { orderListSchema, recentOrdersSchema } from "@/lib/snaptrade/schemas";

const REFRESH_THROTTLE_MS = 8000; // SnapTrade allows ~10 requests/minute/account for Personal users
const UNKNOWN_AFTER_MS = 30_000;

type Records = Awaited<ReturnType<typeof fetchRecentOrdersUncached>>;

// recentOrders is real-time but only covers the last 24 hours. Older orders (a run that waited overnight, or history
// being brought up to date) come from the 7-day order list.
const fetchRecentOrdersUncached = async (userId: string, accountId: string, deep: boolean) =>
  deep
    ? snaptradeFetch(userId, `/accounts/${accountId}/orders?days=7&state=all`, orderListSchema)
    : (await snaptradeFetch(userId, `/accounts/${accountId}/recentOrders?only_executed=false`, recentOrdersSchema)).orders;

// One recentOrders call returns EVERY order for the account, so all runs and pollers (status page, driver, worker)
// can share one result for a few seconds. In-flight requests are shared too. Failures aren't cached.
const recent = new Map<string, { at: number; promise: Promise<Records> }>();

function fetchRecentOrders(userId: string, accountId: string, deep: boolean): Promise<Records> {
  const key = `${accountId}:${deep ? "deep" : "recent"}`;
  const hit = recent.get(key);
  if (hit && Date.now() - hit.at < REFRESH_THROTTLE_MS) return hit.promise;
  const promise = fetchRecentOrdersUncached(userId, accountId, deep);
  recent.set(key, { at: Date.now(), promise });
  promise.catch(() => recent.delete(key));
  return promise;
}

/** For tests: forget cached order lists. */
export const resetRecentOrdersCache = () => recent.clear();

/**
 * Pulls current order statuses from the brokerage into our rows. Throttled, and a failed call
 * (including a 429) just leaves the old statuses in place. Mutates `orders` to match what it writes.
 */
export async function refreshOrders(userId: string, accountId: string, orders: Order[], opts: { /** The run is older than recentOrders can see. */ deep?: boolean } = {}) {
  // A row with no brokerage id after 30s means we never saw the submit result. We can't tell whether
  // it was placed, so we say so rather than resubmitting (which could double-trade).
  for (const order of orders) {
    if (order.status === "pending" && !order.brokerageOrderId && Date.now() - order.updatedAt.getTime() > UNKNOWN_AFTER_MS) {
      await db
        .update(rebalanceOrders)
        .set({ status: "FAILED", error: "We couldn't confirm whether this order was placed. Check your brokerage before trying again." })
        .where(eq(rebalanceOrders.id, order.id));
      order.status = "FAILED";
    }
  }

  const live = orders.filter((o) => o.brokerageOrderId && !isTerminal(o.status));
  if (live.length === 0) return;
  const newest = Math.max(...orders.map((o) => o.updatedAt.getTime()));
  if (Date.now() - newest < REFRESH_THROTTLE_MS) return;

  let records;
  try {
    records = await fetchRecentOrders(userId, accountId, opts.deep ?? false);
  } catch (err) {
    if (err instanceof SnapTradeError) return;
    throw err;
  }

  const byId = new Map(records.map((r) => [r.brokerage_order_id, r]));
  for (const order of live) {
    const status = byId.get(order.brokerageOrderId!)?.status ?? order.status;
    const error = status === "FAILED" || status === "REJECTED" ? "The brokerage rejected or failed this order." : order.error;
    // Always touch updated_at: it doubles as the throttle clock.
    await db.update(rebalanceOrders).set({ status, error, updatedAt: sql`now()` }).where(eq(rebalanceOrders.id, order.id));
    order.status = status;
    order.error = error;
  }
}
