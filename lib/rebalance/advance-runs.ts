import "server-only";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rebalanceOrders, rebalanceRuns } from "@/lib/db/schema";
import { advanceRun } from "@/lib/rebalance/execute";
import { TERMINAL_STATUSES } from "@/lib/rebalance/status";

type ActiveRun = { id: string; userId: string };

/**
 * Runs that still have something to do: sells or buys in flight, plus closed-out `partial` runs that still have an
 * open order at the brokerage (a late fill should complete them, and history should show the true final status).
 */
const listActiveRuns = (): Promise<ActiveRun[]> =>
  db
    .select({ id: rebalanceRuns.id, userId: rebalanceRuns.userId })
    .from(rebalanceRuns)
    .where(
      or(
        inArray(rebalanceRuns.status, ["executing_sells", "executing_buys"]),
        and(
          eq(rebalanceRuns.status, "partial"),
          sql`exists (select 1 from ${rebalanceOrders} where ${rebalanceOrders.runId} = ${rebalanceRuns.id} and ${rebalanceOrders.brokerageOrderId} is not null and ${rebalanceOrders.status} not in (${sql.join(TERMINAL_STATUSES.map((s) => sql`${s}`), sql`, `)}))`,
        ),
      ),
    );

/**
 * Advances each run once. One run failing (a SnapTrade hiccup, an expired login) never stops the others.
 * Safe to call from several places at once: advanceRun's transitions are atomic.
 */
export async function advanceRuns(runs: ActiveRun[]): Promise<number> {
  let advanced = 0;
  for (const run of runs) {
    try {
      await advanceRun(run.userId, run.id);
      advanced++;
    } catch (err) {
      console.warn(`advance run failed: ${err instanceof Error ? err.name : "unknown"}`);
    }
  }
  return advanced;
}

export const advanceAllRuns = async () => advanceRuns(await listActiveRuns());
