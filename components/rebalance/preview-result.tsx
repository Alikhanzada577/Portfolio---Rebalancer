import { BeforeAfterTable } from "@/components/rebalance/before-after-table";
import { ConfirmOrders } from "@/components/rebalance/confirm-orders";
import { ExecutionPlan } from "@/components/rebalance/execution-plan";
import { FeeSummary } from "@/components/rebalance/fee-summary";
import { ImpactDisclaimer } from "@/components/rebalance/impact-disclaimer";
import { PlanNotes } from "@/components/rebalance/plan-notes";
import { PlanWarnings } from "@/components/rebalance/plan-warnings";
import { TradeTable } from "@/components/rebalance/trade-table";
import type { Preview } from "@/components/rebalance/use-rebalance-preview";
import { Panel } from "@/components/ui/panel";
import { feeOf, summarizeFees } from "@/lib/rebalance/fees";
import { impactKey } from "@/lib/rebalance/types";

type Props = {
  readonly preview: Preview;
  readonly busy: boolean;
  readonly expired: boolean;
  readonly remainingMs: number;
  readonly onConfirm: () => void;
};

/** Everything the user must see before confirming: warnings, orders with fees, before/after, and the confirm step. */
export function PreviewResult({ preview, busy, expired, remainingMs, onConfirm }: Props) {
  const { plan, impact, runId } = preview;
  const fees = summarizeFees(plan.trades, impact);
  const hasEstimates = plan.trades.some((t) => t.executable && feeOf(impact[impactKey(t.side, t.symbol)]) !== null);

  return (
    <section aria-label="Rebalance preview" className="space-y-5">
      {plan.message && <p className="rounded-lg bg-positive-soft px-4 py-3 text-sm text-positive">{plan.message}</p>}
      <PlanNotes notes={plan.notes ?? []} />
      <PlanWarnings warnings={plan.warnings} />

      {plan.trades.length > 0 && (
        <>
          <Panel title={plan.mode === "manual" ? "Manual trade list" : "Orders"} flush>
            <TradeTable trades={plan.trades} impact={impact} />
            <div className="border-t border-line px-5 py-4">
              <FeeSummary fees={fees} />
            </div>
          </Panel>
          <Panel title="Allocation before and after" flush>
            <BeforeAfterTable plan={plan} />
          </Panel>
          {plan.unmanaged.length > 0 && <p className="text-sm text-muted">Not managed (left untouched): {plan.unmanaged.map((u) => u.symbol).join(", ")}.</p>}
        </>
      )}

      {runId ? (
        <div className="space-y-4">
          <ExecutionPlan trades={plan.trades} />
          <ImpactDisclaimer hasEstimates={hasEstimates} />
          <ConfirmOrders busy={busy} expired={expired} remainingMs={remainingMs} onConfirm={onConfirm} />
        </div>
      ) : (
        plan.mode === "manual" && plan.trades.length > 0 && <p className="text-sm text-muted">This app can&apos;t place these trades. Place them yourself at your brokerage.</p>
      )}
    </section>
  );
}
