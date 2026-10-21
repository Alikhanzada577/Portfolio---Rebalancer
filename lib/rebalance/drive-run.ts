import "server-only";
import { advanceRun } from "@/lib/rebalance/execute";

const POLL_MS = 8000; // matches the order-refresh throttle: SnapTrade allows ~10 requests/minute/account
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const ACTIVE = new Set(["executing_sells", "executing_buys"]);

/**
 * Keeps one run moving after the user has confirmed and left the page: place the buys as soon as the sells fill,
 * without anyone watching. Runs inside `after()` so it continues after the HTTP response, for up to `budgetMs`
 * (a serverless function's time limit). Anything longer is picked up by the worker / cron (see advance-runs.ts).
 */
export async function driveRun(userId: string, runId: string, budgetMs: number, pollMs = POLL_MS) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() + pollMs < deadline) {
    await sleep(pollMs);
    try {
      const run = await advanceRun(userId, runId);
      if (!ACTIVE.has(run.status)) return;
    } catch (err) {
      console.warn(`drive run failed: ${err instanceof Error ? err.name : "unknown"}`);
      return;
    }
  }
}
