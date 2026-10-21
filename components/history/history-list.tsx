import { RunCard } from "@/components/history/run-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { RunView } from "@/lib/rebalance/types";

type Props = { readonly runs: RunView[]; readonly accountNames: Record<string, string> };

export function HistoryList({ runs, accountNames }: Props) {
  if (runs.length === 0) {
    return (
      <EmptyState title="No rebalances yet">
        <p>Orders you place will be listed here, with their status, including any that are still waiting to be placed or filled.</p>
      </EmptyState>
    );
  }
  return (
    <div className="space-y-5">
      {runs.map((run) => (
        <RunCard key={run.id} run={run} accountName={accountNames[run.accountId] ?? `Account …${run.accountId.slice(-4)}`} />
      ))}
    </div>
  );
}
