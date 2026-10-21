import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rebalanceOrders, rebalanceRuns } from "@/lib/db/schema";
import { RunInProgressError, RunNotFoundError } from "@/lib/rebalance/errors";
import type { QueuedOrder, RunOrder, RunView, StoredPlan } from "@/lib/rebalance/types";

export type Run = typeof rebalanceRuns.$inferSelect;
export type Order = typeof rebalanceOrders.$inferSelect;

export const storedPlan = (run: Run) => run.planJson as StoredPlan;

/** The user's own run, or RunNotFoundError (also for someone else's run id). */
export async function loadRun(userId: string, runId: string): Promise<Run> {
  const [run] = await db.select().from(rebalanceRuns).where(and(eq(rebalanceRuns.id, runId), eq(rebalanceRuns.userId, userId)));
  if (!run) throw new RunNotFoundError();
  return run;
}

export const loadOrders = (runId: string): Promise<Order[]> =>
  db.select().from(rebalanceOrders).where(eq(rebalanceOrders.runId, runId)).orderBy(asc(rebalanceOrders.updatedAt), asc(rebalanceOrders.id));

const ACTIVE: Run["status"][] = ["executing_sells", "executing_buys"];

/** The user's run that is currently placing or waiting on orders for this account, if any. */
export async function findActiveRun(userId: string, accountId: string): Promise<string | null> {
  const [run] = await db
    .select({ id: rebalanceRuns.id })
    .from(rebalanceRuns)
    .where(and(eq(rebalanceRuns.userId, userId), eq(rebalanceRuns.accountId, accountId), inArray(rebalanceRuns.status, ACTIVE)));
  return run?.id ?? null;
}

// Postgres unique_violation. The driver may wrap the original error, so look at `cause` too.
const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === "23505" || (err as { cause?: { code?: string } })?.cause?.code === "23505";

/**
 * Atomic status change: `UPDATE ... WHERE status = from`, so only one caller can ever move a run out of `from`.
 * Starting a run while another is active on the same account violates the one-active-run index: surfaced as
 * RunInProgressError.
 */
export async function transition(runId: string, from: Run["status"], to: Run["status"]): Promise<boolean> {
  try {
    const rows = await db.update(rebalanceRuns).set({ status: to }).where(and(eq(rebalanceRuns.id, runId), eq(rebalanceRuns.status, from))).returning({ id: rebalanceRuns.id });
    return rows.length === 1;
  } catch (err) {
    if (isUniqueViolation(err)) throw new RunInProgressError(null);
    throw err;
  }
}

/** Flags a phase as fully submitted without rewriting the whole plan (avoids clobbering concurrent updates). */
export async function markSubmitted(runId: string, phase: "sellsSubmitted" | "buysSubmitted") {
  await db
    .update(rebalanceRuns)
    .set({ planJson: sql`jsonb_set(${rebalanceRuns.planJson}, ${`{execution,${phase}}`}::text[], 'true'::jsonb)` })
    .where(eq(rebalanceRuns.id, runId));
}

/** Sets the final status and an explanatory note (null = nothing to add). */
export async function finishRun(run: Run, status: "completed" | "partial" | "failed", note: string | null, patch: Partial<StoredPlan["execution"]> = {}) {
  const plan = storedPlan(run);
  await db
    .update(rebalanceRuns)
    .set({ status, planJson: { ...plan, execution: { ...plan.execution, ...patch, note } } })
    .where(eq(rebalanceRuns.id, run.id));
}

/** The shape the status endpoint returns and the run page renders. */
export function toRunView(run: Run, orders: Order[]): RunView {
  const plan = storedPlan(run);
  // While the sells are outstanding, the confirmed buys haven't been submitted: show them as queued.
  const placed = new Set(orders.map((o) => `${o.side}:${o.symbol}`));
  const queued: QueuedOrder[] =
    run.status === "executing_sells"
      ? plan.plan.trades.filter((t) => t.executable && !placed.has(`${t.side}:${t.symbol}`)).map((t) => ({ symbol: t.symbol, side: t.side, units: t.units, estValue: t.estValue }))
      : [];
  return {
    id: run.id,
    accountId: run.accountId,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    note: plan.execution.note,
    plan: plan.plan,
    impact: plan.impact,
    orders: orders.map<RunOrder>((o) => ({ id: o.id, symbol: o.symbol, side: o.side, units: o.units, estValue: o.estValue, status: o.status, error: o.error })),
    queued,
  };
}
