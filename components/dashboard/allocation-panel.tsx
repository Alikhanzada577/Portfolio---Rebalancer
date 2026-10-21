import { AllocationTable } from "@/components/dashboard/allocation-table";
import { Panel } from "@/components/ui/panel";
import { positionRows, type AccountSnapshot } from "@/lib/engine/portfolio";
import { fmtUsd } from "@/lib/format";

const DUST_BELOW = 1; // positions worth less than this are folded away: they'd bury the table

/** What you own: every position across accounts with units, value and weight. Cash is not listed (see the Cash tile). */
export function AllocationPanel({ accounts }: { readonly accounts: AccountSnapshot[] }) {
  const rows = positionRows(accounts);
  const main = rows.filter((r) => r.value >= DUST_BELOW);
  const dust = rows.filter((r) => r.value < DUST_BELOW);

  return (
    <Panel title="Your allocation" description="What you own, as a share of your total portfolio. Cash is shown above." flush>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-muted">You don&apos;t hold any positions yet. Set targets for an account, then rebalance to invest your cash.</p>
      ) : (
        <>
          {main.length > 0 && <AllocationTable rows={main} />}
          {dust.length > 0 && (
            <details className="border-t border-line">
              <summary className="cursor-pointer px-5 py-3 text-sm text-muted hover:text-ink">
                {dust.length} small position{dust.length === 1 ? "" : "s"} under {fmtUsd(DUST_BELOW)} (total {fmtUsd(dust.reduce((s, r) => s + r.value, 0))})
              </summary>
              <AllocationTable rows={dust} />
            </details>
          )}
        </>
      )}
    </Panel>
  );
}
