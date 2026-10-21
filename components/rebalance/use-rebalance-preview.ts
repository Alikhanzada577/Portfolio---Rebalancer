"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCountdown } from "@/components/rebalance/use-countdown";
import type { RebalancePlan } from "@/lib/engine/trades";
import type { StoredPlan } from "@/lib/rebalance/types";

export type Preview = { runId: string | null; plan: RebalancePlan; impact: StoredPlan["impact"]; at: number };
type Failure = { message: string; reauth: boolean; /** The rebalance already running on this account, when that is the reason. */ runId?: string };

const PREVIEW_TTL_MS = 5 * 60 * 1000; // must match the server: prices move

async function post(url: string) {
  try {
    const res = await fetch(url, { method: "POST" });
    return { ok: res.ok, status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, status: 0, body: { message: "Couldn't reach the server. Check your connection and try again." } };
  }
}

/** Preview + confirm flow for one account. Components using it only render. */
export function useRebalancePreview(accountId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState<"preview" | "execute" | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  const remainingMs = useCountdown(preview?.runId ? preview.at + PREVIEW_TTL_MS : null);
  const expired = !!preview?.runId && remainingMs === 0;

  const fail = (r: { status: number; body: Record<string, unknown> }) =>
    setFailure({ message: String(r.body.message ?? "Something went wrong."), reauth: r.status === 401, runId: typeof r.body.runId === "string" ? r.body.runId : undefined });

  const runPreview = async () => {
    setBusy("preview");
    setFailure(null);
    setPreview(null);
    const r = await post(`/api/accounts/${accountId}/rebalance/preview`);
    if (r.ok) setPreview({ ...(r.body as Omit<Preview, "at">), at: Date.now() });
    else fail(r);
    setBusy(null);
  };

  const confirm = async () => {
    if (!preview?.runId || busy) return; // `busy` also blocks a double click before React re-renders
    setBusy("execute");
    setFailure(null);
    const r = await post(`/api/rebalance/${preview.runId}/execute`);
    // "conflict" = THIS run was already started (another click or tab): the run page is the right place either way.
    // "run_in_progress" = a DIFFERENT rebalance is running on this account: show why instead.
    if (r.ok || (r.status === 409 && r.body.error === "conflict")) return router.push(`/runs/${preview.runId}`);
    if (r.status === 410) setPreview(null);
    fail(r);
    setBusy(null);
  };

  return { busy, preview, failure, remainingMs, expired, runPreview, confirm };
}
