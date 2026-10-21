import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rebalanceRuns } from "@/lib/db/schema";
import { generatePlan, type Trade } from "@/lib/engine/trades";
import { snaptradeFetch, SnapTradeError } from "@/lib/snaptrade/client";
import { impactSchema, recentOrdersSchema } from "@/lib/snaptrade/schemas";
import { loadContext } from "@/lib/rebalance/context";
import { NoTargetsError, RunInProgressError } from "@/lib/rebalance/errors";
import { findActiveRun } from "@/lib/rebalance/runs";
import { isTerminal } from "@/lib/rebalance/status";
import { impactKey, type StoredPlan, type TradeImpact } from "@/lib/rebalance/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Brokerage-simulated impact for one order (POST /trade/impact; places nothing). null = unavailable. */
async function checkImpact(userId: string, accountId: string, trade: Trade, symbolId: string | undefined): Promise<TradeImpact | null> {
  if (!symbolId) return null;
  try {
    const res = await snaptradeFetch(userId, "/trade/impact", impactSchema, {
      method: "POST",
      body: { account_id: accountId, action: trade.side === "buy" ? "BUY" : "SELL", universal_symbol_id: symbolId, order_type: "Market", time_in_force: "Day", units: trade.units },
    });
    const i = res.trade_impacts?.[0];
    if (!i) return null;
    // Real responses say `estimated_commissions`; the published spec says `estimated_commission`. Accept both.
    return { remainingCash: i.remaining_cash ?? null, commission: i.estimated_commissions ?? i.estimated_commission ?? null, forexFees: i.forex_fees ?? null };
  } catch (err) {
    if (err instanceof SnapTradeError) return null; // impact is best-effort; the order itself can still be placed
    throw err;
  }
}

async function countOpenOrders(userId: string, accountId: string) {
  try {
    const { orders } = await snaptradeFetch(userId, `/accounts/${accountId}/recentOrders?only_executed=false`, recentOrdersSchema);
    return orders.filter((o) => !isTerminal(o.status ?? "NONE")).length;
  } catch (err) {
    if (err instanceof SnapTradeError) return 0;
    throw err;
  }
}

/**
 * Fresh snapshot -> plan -> brokerage impact per order -> saved as a `previewed` run.
 * Never trusts client data: everything is re-fetched. Manual-mode plans (no executable trades) are not saved.
 */
export async function createPreview(userId: string, accountId: string) {
  // Orders still open aren't in cash or positions yet, so a plan made now would trade on top of the running one.
  const active = await findActiveRun(userId, accountId);
  if (active) throw new RunInProgressError(active);

  const ctx = await loadContext(userId, accountId);
  if (Object.keys(ctx.targets).length === 0) throw new NoTargetsError();

  const plan = generatePlan({ account: ctx.account, targets: ctx.targets, instruments: ctx.instruments, driftBandPct: ctx.settings.driftBandPct, cashBufferPct: ctx.settings.cashBufferPct });

  plan.notes = ctx.targetNotes;
  plan.warnings.push(...ctx.targetWarnings);

  const executable = plan.trades.filter((t) => t.executable);
  if (plan.mode === "trade" && plan.status === "rebalance") {
    const open = await countOpenOrders(userId, accountId);
    if (open > 0) plan.warnings.push(`This account has ${open} open order${open === 1 ? " that isn't" : "s that aren't"} reflected in its cash or positions yet. Wait for ${open === 1 ? "it" : "them"} to fill, or this plan may over-trade.`);
  }

  const impact: StoredPlan["impact"] = {};
  for (const [i, t] of executable.entries()) {
    if (i > 0) await sleep(1100); // 1 trade-type request per second per account
    impact[impactKey(t.side, t.symbol)] = await checkImpact(userId, accountId, t, ctx.symbolIds[t.symbol]);
  }

  if (plan.mode !== "trade" || plan.status !== "rebalance" || executable.length === 0) return { runId: null, plan, impact };

  const stored: StoredPlan = { plan, impact, symbolIds: ctx.symbolIds, execution: { sellsSubmitted: false, buysSubmitted: false, buysSkipped: false, note: null } };
  const runId = await db.transaction(async (tx) => {
    // An older unexecuted preview is now stale.
    await tx.update(rebalanceRuns).set({ status: "cancelled" }).where(and(eq(rebalanceRuns.userId, userId), eq(rebalanceRuns.accountId, accountId), eq(rebalanceRuns.status, "previewed")));
    const [run] = await tx.insert(rebalanceRuns).values({ userId, accountId, status: "previewed", planJson: stored }).returning({ id: rebalanceRuns.id });
    return run.id;
  });
  return { runId, plan, impact };
}
