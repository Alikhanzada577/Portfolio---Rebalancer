import { describe, expect, it } from "vitest";
import { computeExposure, type EtfData } from "@/lib/engine/exposure";
import { exposureWeights, resolveTargets, targetedEtfs } from "@/lib/engine/exposure-targets";
import { computeDrift } from "@/lib/engine/drift";
import type { AccountSnapshot, Holding } from "@/lib/engine/portfolio";
import { generatePlan } from "@/lib/engine/trades";

const etf = (constituents: Record<string, number>): EtfData => ({ asOf: "t", source: "t", constituents });
const DATA = { SPY: etf({ AAPL: 0.0729, NVDA: 0.0853 }), VOO: etf({ AAPL: 0.0765, NVDA: 0.08 }) };
const ETFS = new Set(["SPY", "VOO"]);

describe("resolveTargets", () => {
  it("direct mode changes nothing", () => {
    const t = { AAPL: 20, SPY: 30, VOO: 30 };
    expect(resolveTargets(t, "direct", ETFS, DATA)).toEqual({ targets: t, notes: [], warnings: [] });
  });

  it("the reported case: Apple 20% total with SPY 30% and VOO 30% means ~15.5% held directly", () => {
    const r = resolveTargets({ AAPL: 20, SPY: 30, VOO: 30 }, "exposure", ETFS, DATA);
    const via = 30 * 0.0729 + 30 * 0.0765; // 4.482
    expect(r.targets.AAPL).toBeCloseTo(20 - via, 3);
    expect(r.targets.AAPL).toBeGreaterThan(15);
    expect(r.targets.AAPL).toBeLessThan(16);
    expect(r.targets.SPY).toBe(30); // ETFs keep their own target
    expect(r.targets.VOO).toBe(30);
    expect(r.notes[0]).toMatch(/AAPL: 20% total = 15\.5\d?% held directly \+ 4\.48% via SPY, VOO/);
    expect(r.warnings).toEqual([]);
  });

  it("a stock that is in no targeted ETF is left as it is", () => {
    expect(resolveTargets({ TSLA: 10, SPY: 30 }, "exposure", ETFS, DATA).targets.TSLA).toBe(10);
  });

  it("clamps to 0 with a warning when the ETFs alone already exceed the target", () => {
    const r = resolveTargets({ NVDA: 5, SPY: 50, VOO: 40 }, "exposure", ETFS, DATA); // ETFs give ~7.5%
    expect(r.targets.NVDA).toBe(0);
    expect(r.warnings[0]).toMatch(/NVDA: SPY, VOO alone already give about 7\.\d+% exposure, above your 5% target/);
  });

  it("only ETFs that are TARGETED count: an ETF with no target contributes nothing", () => {
    const r = resolveTargets({ AAPL: 20, SPY: 30 }, "exposure", new Set(["SPY"]), DATA);
    expect(r.targets.AAPL).toBeCloseTo(20 - 30 * 0.0729, 3);
  });

  it("an ETF without weight data adds nothing (counted as itself)", () => {
    expect(resolveTargets({ AAPL: 20, SPY: 30 }, "exposure", new Set(["SPY"]), {}).targets.AAPL).toBe(20);
  });

  it("drops an explicit CASH target when targets were reduced: the rest simply stays in cash", () => {
    const r = resolveTargets({ AAPL: 20, SPY: 30, CASH: 50 }, "exposure", new Set(["SPY"]), DATA);
    expect("CASH" in r.targets).toBe(false);
    // 17.81 + 30 = 47.81% allocated: valid, the remainder is cash
    expect(Object.values(r.targets).reduce((s, p) => s + p, 0)).toBeLessThan(100);
  });
});

describe("targetedEtfs", () => {
  it("held ETFs and known ETFs that are in the targets", () => {
    const s = targetedEtfs({ AAPL: 20, SPY: 30, QQQ: 10, VOO: 10 }, ["VOO"], ["SPY", "QQQ", "IVV"]);
    expect([...s].sort()).toEqual(["QQQ", "SPY", "VOO"]);
  });
});

describe("exposureWeights + a full plan in exposure mode", () => {
  const hold = (symbol: string, value: number, assetType: Holding["assetType"]): Holding => ({ accountId: "a", symbol, assetType, units: value / 100, price: 100, value, currency: "USD" });
  const account = (over: Partial<AccountSnapshot> = {}): AccountSnapshot => ({
    accountId: "a", name: "A", brokerage: "B", cash: 20_000, holdings: [hold("SPY", 30_000, "etf"), hold("VOO", 30_000, "etf"), hold("AAPL", 20_000, "equity")],
    supportsTrading: true, supportsFractional: true, currency: "USD", currencyOk: true, reportedTotal: null, asOf: null, warnings: [], ...over,
  });

  it("'now' for a stock is its TOTAL exposure (the 24.4% the dashboard shows), and ETFs stay at their direct weight", () => {
    const w = exposureWeights(computeExposure(account().holdings, 20_000, DATA));
    expect(w.AAPL).toBeCloseTo(20 + 30 * 0.0729 + 30 * 0.0765, 2); // 24.48
    expect(w.SPY).toBeCloseTo(30, 5);
  });

  it("with Apple 20% TOTAL, the engine SELLS some Apple (it's over target once the ETFs are counted), not buy", () => {
    const resolved = resolveTargets({ AAPL: 20, SPY: 30, VOO: 30 }, "exposure", ETFS, DATA);
    const drift = computeDrift(account(), resolved.targets);
    const aapl = drift.rows.find((r) => r.symbol === "AAPL")!;
    expect(aapl.targetPct).toBeCloseTo(15.5, 0);
    expect(aapl.driftPct).toBeGreaterThan(3); // 20% direct vs 15.5% target
    const plan = generatePlan({ account: account(), targets: resolved.targets, driftBandPct: 3, cashBufferPct: 0 });
    expect(plan.status).toBe("rebalance");
    const sell = plan.trades.find((t) => t.symbol === "AAPL");
    expect(sell).toMatchObject({ side: "sell" });
    expect(sell!.estValue).toBeCloseTo(account().holdings[2].value * (4.5 / 20), -2); // about $4.5k, i.e. the ETFs' share
  });

  it("the same targets in DIRECT mode see no drift for Apple (the behaviour that confused the user)", () => {
    const plan = generatePlan({ account: account(), targets: { AAPL: 20, SPY: 30, VOO: 30 }, driftBandPct: 3, cashBufferPct: 0 });
    expect(plan.status).toBe("within_band");
  });
});
