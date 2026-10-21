"use client";

import { useEffect, useState } from "react";
import { isTerminal } from "@/lib/rebalance/status";
import type { RunView } from "@/lib/rebalance/types";

const POLL_MS = 6000; // SnapTrade allows ~10 requests/minute/account for Personal users
const SLOW_POLL_MS = 15000;

type PollError = { message: string; reauth: boolean };

const isExecuting = (run: RunView) => run.status === "executing_sells" || run.status === "executing_buys";

/**
 * Polls the run's status endpoint (which also advances the run server-side). Polls steadily while executing, slowly
 * once settled (late fills can still arrive), and stops when everything is final or sign-in is needed.
 */
export function useRunPolling(runId: string) {
  const [run, setRun] = useState<RunView | null>(null);
  const [error, setError] = useState<PollError | null>(null);

  const finished = !!run && ["completed", "failed", "cancelled"].includes(run.status) && run.orders.every((o) => isTerminal(o.status));
  const stopped = finished || !!error?.reauth;
  const intervalMs = run && !isExecuting(run) ? SLOW_POLL_MS : POLL_MS;

  useEffect(() => {
    if (stopped) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/rebalance/${runId}/status`, { cache: "no-store" });
        const body = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setRun(body);
          setError(null);
        } else setError({ message: body.message ?? "Couldn't load this run.", reauth: res.status === 401 });
      } catch {
        if (!cancelled) setError({ message: "Couldn't reach the server. Retrying…", reauth: false });
      }
    };
    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [runId, stopped, intervalMs]);

  return { run, error };
}
