import Link from "next/link";
import { notFound } from "next/navigation";
import { ReauthScreen } from "@/components/auth/reauth-screen";
import { DriftTable } from "@/components/rebalance/drift-table";
import { PlanNotes } from "@/components/rebalance/plan-notes";
import { PlanWarnings } from "@/components/rebalance/plan-warnings";
import { RebalancePanel } from "@/components/rebalance/rebalance-panel";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { uuidParam } from "@/lib/api";
import { computeDrift, InvalidTargetsError } from "@/lib/engine/drift";
import { fmtUsd } from "@/lib/format";
import { loadErrorMessage } from "@/lib/errors";
import { ReauthRequired } from "@/lib/oauth/tokens";
import { AccountNotFoundError } from "@/lib/portfolio";
import { loadContext } from "@/lib/rebalance/context";
import { findActiveRun } from "@/lib/rebalance/runs";
import { requireUserId } from "@/lib/session";

/** Loads the account, targets and quotes, shows current drift, and mounts the interactive preview. Render inside <Suspense>. */
export async function RebalanceLoader({ params }: { readonly params: PageProps<"/accounts/[id]/rebalance">["params"] }) {
  const userId = await requireUserId();
  const parsed = uuidParam.safeParse((await params).id);
  if (!parsed.success) notFound();
  const accountId = parsed.data;

  let ctx;
  try {
    ctx = await loadContext(userId, accountId);
  } catch (err) {
    if (err instanceof ReauthRequired) return <ReauthScreen />;
    if (err instanceof AccountNotFoundError) notFound();
    console.error("rebalance page: load failed", err instanceof Error ? err.name : "unknown");
    return <Notice tone="error">{loadErrorMessage(err, "this account")}</Notice>;
  }
  const { account, targets, savedTargets, targetNotes, targetWarnings, settings, instruments } = ctx;
  const activeRunId = await findActiveRun(userId, accountId);

  if (!account.currencyOk) return <Notice>This account isn&apos;t in a single USD currency, so it can&apos;t be rebalanced in this version.</Notice>;
  if (Object.keys(savedTargets).length === 0) {
    return (
      <Notice>
        No targets are set for {account.name} yet.{" "}
        <Link className="font-medium underline" href={`/accounts/${accountId}/targets`}>
          Set your target allocation
        </Link>{" "}
        to see how far you&apos;ve drifted.
      </Notice>
    );
  }

  let drift;
  try {
    drift = computeDrift(account, targets, instruments);
  } catch (err) {
    if (err instanceof InvalidTargetsError) {
      return (
        <Notice tone="error">
          Your saved targets are invalid: {err.message}{" "}
          <Link className="font-medium underline" href={`/accounts/${accountId}/targets`}>
            Fix them
          </Link>
          .
        </Notice>
      );
    }
    throw err;
  }

  return (
    <div className="space-y-6">
      <PlanNotes notes={targetNotes} />
      <PlanWarnings warnings={targetWarnings} />
      {activeRunId && (
        <Notice tone="warning">
          A rebalance for this account is still in progress, so a new one can&apos;t be started yet (it would trade on top of the first).{" "}
          <Link className="font-medium underline" href={`/runs/${activeRunId}`}>
            View its progress
          </Link>
          .
        </Notice>
      )}
      {!account.supportsTrading && <Notice>This is a read-only connection, so you&apos;ll get a trade list to place manually. Orders can&apos;t be placed from this app.</Notice>}
      <Panel
        title={account.name}
        description={`${account.brokerage} · drift band ±${settings.driftBandPct}% · cash buffer ${settings.cashBufferPct}%`}
        action={
          <Link className="text-xs font-medium text-brand hover:underline" href={`/accounts/${accountId}/targets`}>
            Edit targets
          </Link>
        }
        flush
      >
        <DriftTable rows={drift.rows} bandPct={settings.driftBandPct} targetLabel={settings.targetMode === "exposure" ? "Target (direct)" : "Target"} />
      </Panel>
      {drift.unmanaged.length > 0 && (
        <p className="text-sm text-muted">
          <strong className="font-medium text-ink">Not managed</strong> (no target, never traded): {drift.unmanaged.map((h) => `${h.symbol} (${fmtUsd(h.value)})`).join(", ")}.
        </p>
      )}
      <RebalancePanel accountId={accountId} blocked={!!activeRunId} />
    </div>
  );
}
