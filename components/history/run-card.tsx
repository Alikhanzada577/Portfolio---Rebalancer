import Link from "next/link";
import { OrdersTable } from "@/components/run/orders-table";
import { RunStatusBadge } from "@/components/run/run-status-badge";
import { Card } from "@/components/ui/card";
import { fmtDateTime } from "@/lib/format";
import type { RunView } from "@/lib/rebalance/types";

type Props = { readonly run: RunView; readonly accountName: string };

/** One past or running rebalance: when, which account, how it ended, and every order with its status. */
export function RunCard({ run, accountName }: Props) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{fmtDateTime(run.createdAt)}</h2>
          <p className="text-xs text-muted">{accountName}</p>
        </div>
        <div className="flex items-center gap-3">
          <RunStatusBadge status={run.status} />
          <Link href={`/runs/${run.id}`} className="text-xs font-medium text-brand hover:underline">
            Details
          </Link>
        </div>
      </div>
      {run.note && <p className="border-b border-line px-5 py-3 text-xs text-muted">{run.note}</p>}
      <OrdersTable orders={run.orders} queued={run.queued} submitting={false} />
    </Card>
  );
}
