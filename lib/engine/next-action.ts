import type { AccountStatus } from "@/lib/engine/account-status";
import { accountValue, combinable, type AccountSnapshot } from "@/lib/engine/portfolio";

/** The single most useful thing the user can do right now, shown as the highlighted step on the dashboard. */
export type NextAction =
  | { kind: "in_progress"; account: AccountSnapshot; runId: string }
  | { kind: "set_targets"; account: AccountSnapshot; /** other accounts also waiting on targets */ others: number }
  | { kind: "fix_targets"; account: AccountSnapshot }
  | { kind: "rebalance"; account: AccountSnapshot; others: number }
  | { kind: "all_good" };

/**
 * Priority: a rebalance already running comes first (don't start another), then set missing targets (nothing else can happen without them), then fix invalid ones,
 * then rebalance drifted accounts. Within a kind the largest account comes first.
 * Accounts we can't rebalance (mixed currency) are ignored.
 */
export function nextAction(accounts: AccountSnapshot[], statuses: Record<string, AccountStatus>, activeRuns: Record<string, string> = {}): NextAction {
  const byValueDesc = [...combinable(accounts)].sort((a, b) => accountValue(b) - accountValue(a));
  const withStatus = (status: AccountStatus) => byValueDesc.filter((a) => statuses[a.accountId] === status);

  const running = withStatus("rebalancing")[0];
  if (running && activeRuns[running.accountId]) return { kind: "in_progress", account: running, runId: activeRuns[running.accountId] };

  const missing = withStatus("no_targets");
  if (missing.length > 0) return { kind: "set_targets", account: missing[0], others: missing.length - 1 };
  const invalid = withStatus("invalid");
  if (invalid.length > 0) return { kind: "fix_targets", account: invalid[0] };
  const drifted = withStatus("drifted");
  if (drifted.length > 0) return { kind: "rebalance", account: drifted[0], others: drifted.length - 1 };
  return { kind: "all_good" };
}
