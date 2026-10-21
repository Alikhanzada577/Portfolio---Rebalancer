"use client";

import { useEffect, useState } from "react";
import type { SymbolHit } from "@/lib/symbols";

const DEBOUNCE_MS = 350; // SnapTrade rate-limits per account, so don't search on every keystroke

type Status = "idle" | "loading" | "error";

/**
 * Debounced symbol search with a per-query cache. Status is derived from what has been fetched for the
 * current query, so state is only ever set from async callbacks, never synchronously inside the effect.
 */
export function useSymbolSearch(accountId: string, text: string) {
  const [results, setResults] = useState<Record<string, SymbolHit[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const key = text.trim().toUpperCase();
  const hits = results[key];
  const error = errors[key];
  const status: Status = key === "" ? "idle" : error ? "error" : hits ? "idle" : "loading";

  useEffect(() => {
    if (status !== "loading") return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/accounts/${accountId}/symbols?q=${encodeURIComponent(key)}`, { signal: controller.signal });
        const body = await res.json().catch(() => ({}));
        if (res.ok) setResults((r) => ({ ...r, [key]: body.results }));
        else setErrors((e) => ({ ...e, [key]: res.status === 401 ? "Please sign in again." : (body.message ?? "Search failed.") }));
      } catch (err) {
        if ((err as Error).name !== "AbortError") setErrors((e) => ({ ...e, [key]: "Couldn't reach the server. Check your connection." }));
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [status, key, accountId]);

  return { key, status, hits, error };
}
