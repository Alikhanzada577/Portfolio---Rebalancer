"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_MS = 15_000; // SnapTrade allows ~10 requests/minute/account: keep this page gentle

/**
 * While any rebalance on this page is still running, nudge each one forward (the status endpoint refreshes and
 * advances it) and re-render the list, so rows flip to "completed" without the user touching anything.
 * Renders nothing.
 */
export function ActiveRunsPoller({ runIds }: { readonly runIds: string[] }) {
  const router = useRouter();
  const key = runIds.join(",");

  useEffect(() => {
    if (!key) return;
    const ids = key.split(",");
    let cancelled = false;
    const tick = async () => {
      for (const id of ids) await fetch(`/api/rebalance/${id}/status`, { cache: "no-store" }).catch(() => undefined);
      if (!cancelled) router.refresh();
    };
    const timer = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [key, router]);

  return null;
}
