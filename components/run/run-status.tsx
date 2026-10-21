"use client";

import { OrdersTable } from "@/components/run/orders-table";
import { RunHeadline } from "@/components/run/run-headline";
import { useRunPolling } from "@/components/run/use-run-polling";
import { TradeTable } from "@/components/rebalance/trade-table";
import { ButtonLink } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";

/** Live progress of one rebalance: headline, per-order status, and what the user confirmed. */
export function RunStatus({ runId }: { readonly runId: string }) {
  const { run, error } = useRunPolling(runId);

  if (error?.reauth) {
    return (
      <Notice tone="error">
        Please sign in again.{" "}
        <a className="font-medium underline" href="/api/auth/login">
          Sign in with SnapTrade
        </a>
      </Notice>
    );
  }
  if (!run) return error ? <Notice tone="error">{error.message}</Notice> : <LoadingState />;

  const submitting = run.status === "executing_sells" || run.status === "executing_buys";
  return (
    <div className="space-y-6">
      <RunHeadline run={run} warning={error?.message} />
      <Panel title="Orders" flush>
        <OrdersTable orders={run.orders} queued={run.queued} submitting={submitting} />
      </Panel>
      <details className="rounded-xl border border-line bg-surface">
        <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-muted hover:text-ink">What you confirmed</summary>
        <div className="border-t border-line">
          <TradeTable trades={run.plan.trades} impact={run.impact} />
        </div>
      </details>
      <ButtonLink href="/dashboard" variant="secondary">
        Back to dashboard
      </ButtonLink>
    </div>
  );
}
