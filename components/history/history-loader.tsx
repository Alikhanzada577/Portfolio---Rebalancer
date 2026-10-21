import { SignInButton } from "@/components/auth/sign-in-button";
import { ActiveRunsPoller } from "@/components/history/active-runs-poller";
import { HistoryList } from "@/components/history/history-list";
import { Notice } from "@/components/ui/notice";
import { loadErrorMessage } from "@/lib/errors";
import { ReauthRequired } from "@/lib/oauth/tokens";
import { listHistory } from "@/lib/rebalance/history";
import { requireUserId } from "@/lib/session";
import { snaptradeFetch, SnapTradeError } from "@/lib/snaptrade/client";
import { accountsSchema } from "@/lib/snaptrade/schemas";

const RUNNING = new Set(["executing_sells", "executing_buys"]);

/** Loads the user's order history and account names. Render inside <Suspense>. */
export async function HistoryLoader() {
  const userId = await requireUserId();

  let runs;
  try {
    runs = await listHistory(userId);
  } catch (err) {
    console.error("history: failed to load", err instanceof Error ? err.name : "unknown");
    return <Notice tone="error">We couldn&apos;t load your history. Please refresh to try again.</Notice>;
  }

  // The history itself lives in our database and is always shown. Account names need SnapTrade: if it is slow, rate
  // limiting or the connection needs re-authorizing, fall back to a short id and say so instead of hiding the history.
  const accountNames: Record<string, string> = {};
  let needsSignIn = false;
  try {
    for (const account of await snaptradeFetch(userId, "/accounts", accountsSchema)) accountNames[account.id] = account.name ?? account.institution_name;
  } catch (err) {
    if (err instanceof ReauthRequired) needsSignIn = true;
    else if (err instanceof SnapTradeError) console.warn(loadErrorMessage(err, "account names"));
    else throw err;
  }

  return (
    <>
      {needsSignIn && (
        <Notice tone="warning" className="mb-5">
          <span className="flex flex-wrap items-center justify-between gap-3">
            <span>Your SnapTrade connection needs to be re-authorized. Orders still waiting to be placed or filled will continue as soon as you sign in again.</span>
            <SignInButton />
          </span>
        </Notice>
      )}
      <ActiveRunsPoller runIds={runs.filter((r) => RUNNING.has(r.status)).map((r) => r.id)} />
      <HistoryList runs={runs} accountNames={accountNames} />
    </>
  );
}
