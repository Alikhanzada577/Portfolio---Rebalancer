import { combinable, type AccountSnapshot, type Holding } from "@/lib/engine/portfolio";

export type EtfData = {
  asOf: string;
  source: string;
  constituents: Record<string, number>; // fraction of the ETF, 0.07 = 7%
};

export type ExposureRow = {
  symbol: string;
  directPct: number;
  truePct: number;
  gapPct: number; // truePct - directPct, in percentage points
  /** The held ETFs that contain this symbol (empty when it's only held directly). */
  viaEtfs: string[];
};

export type Exposure = {
  rows: ExposureRow[]; // largest true exposure first
  /** Share of the portfolio sitting in ETF holdings we have no per-stock weights for (fund remainder). */
  unattributedPct: number;
  /** Held ETFs with no look-through data: counted as themselves. */
  opaque: string[];
};

/**
 * Look-through exposure to symbol S =
 *   direct value of S + sum over ETFs (ETF value * weight of S in that ETF),
 * as a share of total portfolio value (cash included).
 *
 * An ETF with data is replaced by its constituents; the part of the fund not covered by the
 * known constituents (weights rarely cover 100%) is reported as `unattributedPct`.
 * Negative or zero totals yield no rows.
 */
export function computeExposure(
  holdings: Holding[],
  cash: number,
  etfData: Record<string, EtfData | undefined>,
): Exposure {
  const total = holdings.reduce((s, h) => s + h.value, 0) + cash;
  if (total <= 0) return { rows: [], unattributedPct: 0, opaque: [] };

  const direct = new Map<string, number>();
  const exposure = new Map<string, number>();
  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  const opaque = new Set<string>();
  const sources = new Map<string, Set<string>>(); // symbol -> ETFs that hold it
  let unattributed = 0;

  for (const h of holdings) {
    add(direct, h.symbol, h.value);
    const data = h.assetType === "etf" ? etfData[h.symbol] : undefined;
    if (h.assetType === "etf" && !data) opaque.add(h.symbol);
    if (!data) {
      add(exposure, h.symbol, h.value);
      continue;
    }
    let covered = 0;
    for (const [sym, w] of Object.entries(data.constituents)) {
      add(exposure, sym, h.value * w);
      sources.set(sym, (sources.get(sym) ?? new Set()).add(h.symbol));
      covered += w;
    }
    unattributed += h.value * Math.max(0, 1 - covered);
  }

  // A look-through ETF's value lives in its constituents; list it as a direct-only row (true 0%).
  for (const h of holdings) {
    if (h.assetType === "etf" && etfData[h.symbol] && !exposure.has(h.symbol)) exposure.set(h.symbol, 0);
  }
  const rows = [...exposure]
    .map(([symbol, value]) => {
      const directPct = ((direct.get(symbol) ?? 0) / total) * 100;
      const truePct = (value / total) * 100;
      return { symbol, directPct, truePct, gapPct: truePct - directPct, viaEtfs: [...(sources.get(symbol) ?? [])].sort() };
    })
    .sort((a, b) => b.truePct - a.truePct);

  return { rows, unattributedPct: (unattributed / total) * 100, opaque: [...opaque].sort() };
}

/** Look-through exposure across every account that can be added up (single USD currency). */
export function combinedExposure(accounts: AccountSnapshot[], etfData: Record<string, EtfData | undefined>) {
  const ok = combinable(accounts);
  return computeExposure(
    ok.flatMap((a) => a.holdings),
    ok.reduce((s, a) => s + a.cash, 0),
    etfData,
  );
}
