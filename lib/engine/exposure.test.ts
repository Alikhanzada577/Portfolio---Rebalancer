import { describe, expect, it } from "vitest";
import { computeExposure, type EtfData } from "@/lib/engine/exposure";
import type { Holding } from "@/lib/engine/portfolio";

const h = (symbol: string, value: number, assetType: Holding["assetType"] = "equity"): Holding => ({
  accountId: "a",
  symbol,
  assetType,
  units: 1,
  price: value,
  value,
  currency: "USD",
});
const etf = (constituents: Record<string, number>): EtfData => ({ asOf: "2026-01-01", source: "test", constituents });
const row = (e: ReturnType<typeof computeExposure>, s: string) => e.rows.find((r) => r.symbol === s)!;

describe("computeExposure", () => {
  it("the spec example: AAPL 50%, ETF 30% (10% AAPL), BTC 20% -> true AAPL 53%", () => {
    const e = computeExposure([h("AAPL", 50), h("ETF", 30, "etf"), h("BTC", 20, "crypto")], 0, { ETF: etf({ AAPL: 0.1 }) });
    expect(row(e, "AAPL").directPct).toBeCloseTo(50);
    expect(row(e, "AAPL").truePct).toBeCloseTo(53);
    expect(row(e, "AAPL").gapPct).toBeCloseTo(3);
    expect(row(e, "BTC").truePct).toBeCloseTo(20);
  });

  it("an ETF's remainder (weights not listed) is reported as unattributed, and all shares add to 100%", () => {
    const e = computeExposure([h("AAPL", 50), h("ETF", 30, "etf"), h("BTC", 20, "crypto")], 0, { ETF: etf({ AAPL: 0.1 }) });
    expect(e.unattributedPct).toBeCloseTo(27); // 30% * (1 - 0.1)
    expect(e.rows.reduce((s, r) => s + r.truePct, 0) + e.unattributedPct).toBeCloseTo(100);
  });

  it("an ETF with data is listed as direct-only (0% true)", () => {
    const e = computeExposure([h("ETF", 100, "etf")], 0, { ETF: etf({ AAPL: 0.5 }) });
    expect(row(e, "ETF")).toMatchObject({ directPct: 100, truePct: 0 });
  });

  it("an ETF without data counts as itself and is flagged opaque", () => {
    const e = computeExposure([h("XYZ", 40, "etf"), h("AAPL", 60)], 0, {});
    expect(e.opaque).toEqual(["XYZ"]);
    expect(row(e, "XYZ").truePct).toBeCloseTo(40);
    expect(e.unattributedPct).toBe(0);
  });

  it("sums exposure across several ETFs and direct holdings", () => {
    const e = computeExposure([h("A", 10), h("E1", 40, "etf"), h("E2", 50, "etf")], 0, {
      E1: etf({ A: 0.25 }),
      E2: etf({ A: 0.1 }),
    });
    expect(row(e, "A").truePct).toBeCloseTo(10 + 10 + 5);
  });

  it("cash counts in the denominator", () => {
    const e = computeExposure([h("AAPL", 50)], 50, {});
    expect(row(e, "AAPL").truePct).toBeCloseTo(50);
  });

  it("only non-ETF holdings are never looked through, even if an ETF table has the symbol", () => {
    const e = computeExposure([h("SPY", 100, "equity")], 0, { SPY: etf({ AAPL: 0.5 }) });
    expect(e.rows).toHaveLength(1);
    expect(e.opaque).toEqual([]);
  });

  it("says which ETFs bring each company, and nothing for direct-only holdings", () => {
    const e = computeExposure([h("AAPL", 40), h("E1", 30, "etf"), h("E2", 30, "etf")], 0, { E1: etf({ AAPL: 0.1, MSFT: 0.2 }), E2: etf({ AAPL: 0.05 }) });
    expect(row(e, "AAPL").viaEtfs).toEqual(["E1", "E2"]);
    expect(row(e, "MSFT").viaEtfs).toEqual(["E1"]);
    const direct = computeExposure([h("BTC", 100, "crypto")], 0, {});
    expect(row(direct, "BTC").viaEtfs).toEqual([]);
  });

  it("empty or zero-value portfolios give no rows", () => {
    expect(computeExposure([], 0, {}).rows).toEqual([]);
    expect(computeExposure([], 0, {}).unattributedPct).toBe(0);
  });
});
