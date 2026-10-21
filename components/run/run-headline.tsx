import { RunStatusBadge } from "@/components/run/run-status-badge";
import { isTerminal } from "@/lib/rebalance/status";
import type { RunView } from "@/lib/rebalance/types";

const HEADLINE: Record<RunView["status"], { text: string; hint?: string }> = {
  previewed: { text: "Waiting for confirmation" },
  executing_sells: { text: "Sells placed: waiting for them to fill", hint: "Your buys are queued below and will be placed automatically once the sells fill." },
  executing_buys: { text: "Buys placed: waiting for them to fill" },
  completed: { text: "Complete: all orders filled" },
  partial: { text: "Partly done" },
  failed: { text: "Failed: no orders filled" },
  cancelled: { text: "Cancelled" },
};

const WAITING = new Set<RunView["status"]>(["executing_sells", "executing_buys"]);

/** Overall result of the run, with the explanation and any still-open orders. */
export function RunHeadline({ run, warning }: { readonly run: RunView; readonly warning?: string }) {
  const { text, hint } = HEADLINE[run.status];
  const open = run.orders.filter((o) => !isTerminal(o.status)).length;
  return (
    <div aria-live="polite" className="space-y-2">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{text}</h2>
        <RunStatusBadge status={run.status} />
      </div>
      {hint && <p className="text-sm">{hint}</p>}
      {run.note && <p className="text-sm">{run.note}</p>}
      {WAITING.has(run.status) && <p className="text-sm text-muted">You can leave this page. If the market is closed, orders wait for it to open, and the rest happens automatically.</p>}
      {run.status === "partial" && open > 0 && (
        <p className="text-sm text-muted">
          {open} order{open === 1 ? " is" : "s are"} still open at your brokerage. This page keeps updating.
        </p>
      )}
      {warning && <p className="text-sm text-caution">{warning}</p>}
    </div>
  );
}
