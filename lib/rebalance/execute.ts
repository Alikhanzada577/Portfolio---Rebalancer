import "server-only";
import { generatePlan } from "@/lib/engine/trades";
import { loadContext } from "@/lib/rebalance/context";
import { ExecutionConflictError, PreviewExpiredError } from "@/lib/rebalance/errors";
import { refreshOrders } from "@/lib/rebalance/refresh-orders";
import { finishRun, loadOrders, loadRun, markSubmitted, storedPlan, toRunView, transition, type Run } from "@/lib/rebalance/runs";
import { finalResult, isTerminal } from "@/lib/rebalance/status";
import { submitOrders } from "@/lib/rebalance/submit-orders";
import type { RunView } from "@/lib/rebalance/types";

const PREVIEW_TTL_MS = 5 * 60 * 1000; // prices move
// Market orders placed while the market is closed simply wait for the next open (often 16+ hours), so a short timeout
// would abandon a healthy run and drop its buys. A Day order that is still unfilled after a full day means something
// is wrong, and only then is the run closed out.
const ORDER_WAIT_MS = 24 * 60 * 60 * 1000;
const SUBMIT_TIMEOUT_MS = 90 * 1000;
const LATE_SELLS_NOTE = "The sells filled after this run had been closed out, so its buys were never placed. Run a new preview to finish rebalancing.";
const RECENT_WINDOW_MS = 20 * 60 * 60 * 1000; // a little under the 24h recentOrders covers

/**
 * Confirm-and-place. Atomically claims the run (`previewed` -> `executing_sells`) so a double click, a
 * second tab or a retry can never submit twice, then submits the sells. Returns quickly: the status
 * endpoint drives everything after this (see advanceRun).
 */
export async function startExecution(userId: string, runId: string) {
  const run = await loadRun(userId, runId);
  if (run.status !== "previewed") throw new ExecutionConflictError(run.status);
  if (Date.now() - run.createdAt.getTime() > PREVIEW_TTL_MS) {
    await transition(run.id, "previewed", "cancelled");
    throw new PreviewExpiredError();
  }
  if (!(await transition(run.id, "previewed", "executing_sells"))) throw new ExecutionConflictError("executing");

  const trades = storedPlan(run).plan.trades.filter((t) => t.executable);
  const sells = trades.filter((t) => t.side === "sell");
  if (sells.length > 0) {
    await submitOrders(userId, run.id, run.accountId, sells);
    await markSubmitted(run.id, "sellsSubmitted");
    return;
  }
  // Nothing to sell (e.g. an all-cash account): the previewed buys are what the user confirmed.
  if (await transition(run.id, "executing_sells", "executing_buys")) {
    await submitOrders(userId, run.id, run.accountId, trades.filter((t) => t.side === "buy"));
    await markSubmitted(run.id, "buysSubmitted");
  }
}

/**
 * Sells all filled -> re-plan the buys from the account's ACTUAL cash (partial fills, price moves), capped at
 * what the user confirmed, then place them. Exactly one caller gets to do this.
 */
async function beginBuys(userId: string, run: Run) {
  if (!(await transition(run.id, "executing_sells", "executing_buys"))) return;
  const confirmed = new Map(storedPlan(run).plan.trades.filter((t) => t.side === "buy" && t.executable).map((t) => [t.symbol, t]));
  try {
    const ctx = await loadContext(userId, run.accountId);
    const fresh = generatePlan({ account: ctx.account, targets: ctx.targets, instruments: ctx.instruments, driftBandPct: ctx.settings.driftBandPct, cashBufferPct: ctx.settings.cashBufferPct });
    const buys = fresh.trades
      .filter((t) => t.side === "buy" && t.executable && confirmed.has(t.symbol))
      .map((t) => {
        const units = Math.min(t.units, confirmed.get(t.symbol)!.units);
        return { ...t, units, estValue: units * t.price };
      })
      .filter((t) => t.units > 0);
    if (buys.length === 0) {
      await finishRun(run, "completed", "Sells filled and no further buys were needed.", { buysSubmitted: true });
      return;
    }
    await submitOrders(userId, run.id, run.accountId, buys);
    await markSubmitted(run.id, "buysSubmitted");
  } catch (err) {
    console.error("rebalance: could not place buys", err instanceof Error ? err.name : "unknown");
    await finishRun(run, "partial", "Your sells filled, but we couldn't place the buys. Run a new preview to finish rebalancing.", { buysSkipped: true });
  }
}

/**
 * Moves one run forward. Called by the status page, the background driver and the worker, in any combination:
 * every transition is an atomic compare-and-set, so concurrent callers can never place anything twice.
 * Refreshes order statuses (throttled), then: sells all filled -> place the buys; everything terminal -> final
 * result. Open orders just keep the run waiting (the market may be closed); we never cancel at the brokerage.
 */
export async function advanceRun(userId: string, runId: string): Promise<RunView> {
  let run = await loadRun(userId, runId);
  if (run.status === "previewed" || run.status === "cancelled") return toRunView(run, []);

  let orders = await loadOrders(run.id);
  // recentOrders only sees the last 24h: a run that has waited longer (or old history) is looked up in the 7-day list.
  await refreshOrders(userId, run.accountId, orders, { deep: Date.now() - run.createdAt.getTime() > RECENT_WINDOW_MS });
  const sells = orders.filter((o) => o.side === "sell");
  const buys = orders.filter((o) => o.side === "buy");
  const waited = Date.now() - run.updatedAt.getTime();
  const exec = storedPlan(run).execution;
  // A phase that never reports "submitted" means the server died mid-submission. Say so instead of hanging.
  const interrupted = waited > SUBMIT_TIMEOUT_MS;

  if (run.status === "executing_sells") {
    if (!exec.sellsSubmitted) {
      if (interrupted) await finishRun(run, finalResult(orders, true), "Submitting your sells was interrupted. Check your brokerage for open orders before running a new preview.", { buysSkipped: true });
    } else if (sells.every((o) => isTerminal(o.status))) {
      if (sells.length > 0 && sells.every((o) => o.status === "EXECUTED")) await beginBuys(userId, run);
      else await finishRun(run, finalResult(orders, true), "Some sells didn't fill, so no buys were placed.", { buysSkipped: true });
    } else if (waited > ORDER_WAIT_MS) {
      await finishRun(run, "partial", "The sells didn't fill within a day, so no buys were placed. Check your brokerage, then run a new preview.", { buysSkipped: true });
    }
  } else if (run.status === "executing_buys") {
    if (!exec.buysSubmitted) {
      if (interrupted) await finishRun(run, "partial", "Submitting your buys was interrupted. Check your brokerage for open orders before running a new preview.");
    } else if (buys.every((o) => isTerminal(o.status))) await finishRun(run, finalResult(orders, exec.buysSkipped), null);
    else if (waited > ORDER_WAIT_MS) await finishRun(run, "partial", "The buys didn't fill within a day. They may still be open at your brokerage; check there before running a new preview.");
  } else if (run.status === "partial" && orders.length > 0 && orders.every((o) => o.status === "EXECUTED")) {
    if (!exec.buysSkipped) await finishRun(run, "completed", null); // late fills completed everything that was placed
    // The run was closed out before the sells filled, so its buys were never placed. The old note ("sells haven't
    // filled") is now false; say what actually happened instead of contradicting the order list.
    else if (exec.note !== LATE_SELLS_NOTE) await finishRun(run, "partial", LATE_SELLS_NOTE, { buysSkipped: true });
  }

  run = await loadRun(userId, runId);
  orders = await loadOrders(run.id);
  return toRunView(run, orders);
}
