import "server-only";
import { and, asc, desc, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rebalanceOrders, rebalanceRuns } from "@/lib/db/schema";
import { toRunView, type Order } from "@/lib/rebalance/runs";
import type { RunView } from "@/lib/rebalance/types";

/**
 * The user's rebalances that were actually placed (or are queued/in progress), newest first, each with its orders.
 * Previews that were never confirmed, and cancelled ones, never placed anything and are left out.
 */
export async function listHistory(userId: string, limit = 30): Promise<RunView[]> {
  const runs = await db
    .select()
    .from(rebalanceRuns)
    .where(and(eq(rebalanceRuns.userId, userId), notInArray(rebalanceRuns.status, ["previewed", "cancelled"])))
    .orderBy(desc(rebalanceRuns.createdAt))
    .limit(limit);
  if (runs.length === 0) return [];

  const orders = await db
    .select()
    .from(rebalanceOrders)
    .where(inArray(rebalanceOrders.runId, runs.map((r) => r.id)))
    .orderBy(asc(rebalanceOrders.updatedAt), asc(rebalanceOrders.id));
  const byRun = new Map<string, Order[]>();
  for (const order of orders) byRun.set(order.runId, [...(byRun.get(order.runId) ?? []), order]);

  return runs.map((run) => toRunView(run, byRun.get(run.id) ?? []));
}
