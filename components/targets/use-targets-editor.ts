"use client";

import { useMemo, useState } from "react";
import type { EtfData } from "@/lib/engine/exposure";
import { resolveTargets, targetedEtfs, type TargetMode } from "@/lib/engine/exposure-targets";
import { normalizeSymbol, parsePct, summarizeTargets, withCurrentWeights, type TargetRow } from "@/lib/target-rows";

export type Settings = { driftBandPct: number; cashBufferPct: number; targetMode: TargetMode };
export type SaveState = { kind: "idle" | "saving" | "saved" | "error"; message?: string };

type Inputs = {
  accountId: string;
  initialRows: TargetRow[];
  /** Direct weight of each holding, in percent of the account. */
  currentWeights: Record<string, number>;
  /** Total exposure of each symbol (direct + via ETFs), same basis. Shown as "Now" in total-exposure mode. */
  exposureWeights: Record<string, number>;
  /** ETF -> { symbol: weight (0-1) } for the ETFs we have data for. */
  etfWeights: Record<string, Record<string, number>>;
  /** Tickers that are ETFs (held, or known), so the editor can tell which targets are ETFs. */
  etfSymbols: string[];
  settings: Settings;
};

const inRange = (text: string) => {
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 && n <= 50;
};

/** State and persistence for the targets editor. The components using it are purely presentational. */
export function useTargetsEditor({ accountId, initialRows, currentWeights, exposureWeights, etfWeights, etfSymbols, settings }: Inputs) {
  const [rows, setRows] = useState(initialRows);
  const [band, setBand] = useState(String(settings.driftBandPct));
  const [buffer, setBuffer] = useState(String(settings.cashBufferPct));
  const [mode, setMode] = useState<TargetMode>(settings.targetMode);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });

  // In total-exposure mode a stock's target includes what the targeted ETFs already hold, so the cash remainder and the
  // "over 100%" check must use the resulting DIRECT targets, exactly as the rebalance will.
  const resolved = useMemo(() => {
    const typed = Object.fromEntries(rows.flatMap((r) => (parsePct(r.pct) !== null && Number.isFinite(Number(r.pct)) ? [[r.symbol, Number(r.pct)] as const] : [])));
    const etfData: Record<string, EtfData | undefined> = Object.fromEntries(Object.entries(etfWeights).map(([etf, constituents]) => [etf, { asOf: "", source: "", constituents }]));
    return resolveTargets(typed, mode, targetedEtfs(typed, [], etfSymbols), etfData);
  }, [rows, mode, etfWeights, etfSymbols]);
  const allocated = useMemo(() => Object.entries(resolved.targets).reduce((sum, [symbol, pct]) => (symbol === "CASH" ? sum : sum + pct), 0), [resolved]);
  const summary = useMemo(() => summarizeTargets(rows, mode === "exposure" ? allocated : undefined), [rows, mode, allocated]);
  const weights = mode === "exposure" ? exposureWeights : currentWeights;
  const existingSymbols = useMemo(() => new Set(rows.map((r) => r.symbol)), [rows]);
  const settingsOk = inRange(band) && inRange(buffer);
  const edited = () => setSave({ kind: "idle" });

  const setPct = (index: number, pct: string) => {
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, pct } : r)));
    edited();
  };
  const remove = (index: number) => {
    setRows((rs) => rs.filter((_, i) => i !== index));
    edited();
  };
  const addSymbol = (input: string) => {
    const symbol = normalizeSymbol(input);
    if (!symbol) return;
    setRows((rs) => (rs.some((r) => r.symbol === symbol) ? rs : [...rs, { symbol, pct: "", held: false }]));
    edited();
  };
  const useCurrentWeights = () => {
    setRows((rs) => withCurrentWeights(rs, weights));
    edited();
  };

  const changeBand = (value: string) => {
    setBand(value);
    edited();
  };
  const changeBuffer = (value: string) => {
    setBuffer(value);
    edited();
  };

  const submit = async () => {
    setSave({ kind: "saving" });
    const targets = rows.flatMap((r) => (parsePct(r.pct) === null ? [] : [{ symbol: r.symbol, pct: Number(r.pct) }]));
    try {
      const res = await fetch(`/api/accounts/${accountId}/targets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets, driftBandPct: Number(band), cashBufferPct: Number(buffer), targetMode: mode }),
      });
      const body = await res.json().catch(() => ({}));
      setSave(res.ok ? { kind: "saved" } : { kind: "error", message: body.message ?? "Couldn't save your targets." });
    } catch {
      setSave({ kind: "error", message: "Couldn't reach the server. Check your connection and try again." });
    }
  };

  const changeMode = (next: TargetMode) => {
    setMode(next);
    edited();
  };

  return {
    rows,
    summary,
    mode,
    weights,
    notes: resolved.notes,
    warnings: resolved.warnings,
    setMode: changeMode,
    band,
    buffer,
    save,
    canSubmit: summary.canSave && settingsOk && save.kind !== "saving",
    existingSymbols,
    setPct,
    remove,
    addSymbol,
    useCurrentWeights,
    setBand: changeBand,
    setBuffer: changeBuffer,
    submit,
  };
}
