import "server-only";
import { advanceAllRuns } from "@/lib/rebalance/advance-runs";

const INTERVAL_MS = 60_000; // gentle: SnapTrade allows ~10 requests/minute/account, shared with the user's own page loads

declare global {
  var __rebalanceWorker: ReturnType<typeof setInterval> | undefined;
}

/**
 * Background loop for a long-lived server (local dev, `next start`, a container): once a minute, advance every run
 * that is waiting on fills, so the buys go out the moment the market opens and the sells fill, with nobody on
 * the page. Not used on serverless (Vercel), where the cron endpoint does this job instead.
 * The globalThis guard keeps dev-mode reloads from starting several loops.
 */
export function startRunWorker() {
  if (process.env.VERCEL || globalThis.__rebalanceWorker) return;
  let running = false;
  console.info(`rebalance worker started (every ${INTERVAL_MS / 1000}s)`);
  globalThis.__rebalanceWorker = setInterval(async () => {
    if (running) return; // never overlap a slow pass
    running = true;
    try {
      const n = await advanceAllRuns();
      if (n > 0) console.info(`rebalance worker: checked ${n} run${n === 1 ? "" : "s"}`);
    } catch (err) {
      console.warn(`run worker pass failed: ${err instanceof Error ? err.name : "unknown"}`);
    } finally {
      running = false;
    }
  }, INTERVAL_MS);
  globalThis.__rebalanceWorker.unref?.(); // never keep the process alive just for this
}
