import { describe, expect, it } from "vitest";
import { computeDrift, InvalidTargetsError, targetsProblem, withImplicitCash } from "@/lib/engine/drift";
import type { AccountSnapshot, Holding } from "@/lib/engine/portfolio";
import { floorUnits } from "@/lib/engine/trade-rules";
import { generatePlan, type PlanInput } from "@/lib/engine/trades";

const hold = (symbol: string, units: number, price: number, assetType: Holding["assetType"] = "etf"): Holding => ({
  accountId: "a", symbol, assetType, units, price, value: units * price, currency: "USD",
});
const acct = (over: Partial<AccountSnapshot> = {}): AccountSnapshot => ({
  accountId: "a", name: "A", brokerage: "B", cash: 0, holdings: [], supportsTrading: true, supportsFractional: false,
  currency: "USD", currencyOk: true, reportedTotal: null, asOf: null, warnings: [], ...over,
});
const plan = (over: Partial<PlanInput> & Pick<PlanInput, "account" | "targets">) =>
  generatePlan({ driftBandPct: 3, cashBufferPct: 0, ...over });

// 3-asset account: A $5000 (50%), B $3000 (30%), cash $2000 (20%). Total $10,000.
const three = () => acct({ cash: 2000, holdings: [hold("A", 50, 100), hold("B", 30, 100)] });

describe("targetsProblem", () => {
  it("rejects targets that add up to MORE than 100", () => {
    expect(targetsProblem({ A: 60, B: 50 })).toMatch(/more than 100%/);
    expect(targetsProblem({ A: 100.5 })).toMatch(/between 0% and 100%|more than 100%/);
  });
  it("allows targets that add up to LESS than 100: the rest is cash", () => {
    expect(targetsProblem({ A: 60, B: 30 })).toBeNull();
    expect(targetsProblem({ A: 10 })).toBeNull();
  });
  it("accepts 100 with float noise; rejects empty, negative and >100 per symbol", () => {
    expect(targetsProblem({ A: 33.33, B: 33.33, C: 33.34 })).toBeNull();
    expect(targetsProblem({ A: 0.1 + 0.2 + 99.7 })).toBeNull();
    expect(targetsProblem({})).toMatch(/at least one/);
    expect(targetsProblem({ A: -10, B: 110 })).toMatch(/between 0% and 100%/);
  });
  it("an explicit CASH target keeps the old rule: everything must add up to exactly 100", () => {
    expect(targetsProblem({ A: 60, CASH: 30 })).toMatch(/add up to 90\.00%/);
    expect(targetsProblem({ A: 60, CASH: 40 })).toBeNull();
  });
  it("the engine refuses to plan with targets over 100", () => {
    expect(() => plan({ account: three(), targets: { A: 60, B: 50 } })).toThrow(InvalidTargetsError);
  });
});

describe("unallocated percent stays in cash", () => {
  it("withImplicitCash adds the remainder as cash, and nothing when fully allocated or explicit", () => {
    expect(withImplicitCash({ AAPL: 10, TSLA: 20 })).toEqual({ AAPL: 10, TSLA: 20, CASH: 70 });
    expect(withImplicitCash({ A: 60, B: 40 })).toEqual({ A: 60, B: 40 });
    expect(withImplicitCash({ A: 33.33, B: 33.33, C: 33.34 })).not.toHaveProperty("CASH");
    expect(withImplicitCash({ A: 50, CASH: 50 })).toEqual({ A: 50, CASH: 50 });
  });

  it("the spec example: Apple 10% and Tesla 20% -> 70% cash, with no cash target typed in", () => {
    const a = acct({ cash: 100000, supportsFractional: true });
    const p = plan({ account: a, targets: { AAPL: 10, TSLA: 20 }, instruments: { AAPL: { price: 200, assetType: "equity" }, TSLA: { price: 400, assetType: "equity" } } });
    const cashRow = p.rows.find((r) => r.symbol === "CASH")!;
    expect(cashRow).toMatchObject({ targetPct: 70, currentPct: 100 });
    expect(p.trades.map((t) => `${t.side} ${t.symbol}`).sort()).toEqual(["buy AAPL", "buy TSLA"]);
    const value = (s: string) => p.trades.find((t) => t.symbol === s)!.estValue;
    expect(value("AAPL")).toBeCloseTo(10000, -2);
    expect(value("TSLA")).toBeCloseTo(20000, -2);
    expect(p.leftoverCash / p.base).toBeGreaterThan(0.69); // about 70% stays in cash
    expect(p.leftoverCash / p.base).toBeLessThan(0.71);
  });

  it("holds at the target: once invested, 70% cash is on target and nothing more is bought", () => {
    // 100,000 total: AAPL 10,000 (10%), TSLA 20,000 (20%), cash 70,000.
    const a = acct({ cash: 70000, holdings: [hold("AAPL", 50, 200, "equity"), hold("TSLA", 50, 400, "equity")], supportsFractional: true });
    const p = plan({ account: a, targets: { AAPL: 10, TSLA: 20 } });
    expect(p).toMatchObject({ status: "within_band", trades: [] });
  });

  it("a symbol going up shifts weight out of cash's share and triggers a rebalance past the band", () => {
    // TSLA doubled: 50 * 800 = 40,000. Total 110,000 -> TSLA 36%, AAPL 9%, cash 55%.
    const a = acct({ cash: 70000, holdings: [hold("AAPL", 50, 200, "equity"), hold("TSLA", 50, 800, "equity")], supportsFractional: true });
    const p = plan({ account: a, targets: { AAPL: 10, TSLA: 20 } });
    expect(p.status).toBe("rebalance");
    expect(p.trades.find((t) => t.symbol === "TSLA")).toMatchObject({ side: "sell" });
  });

  it("targets that fill 100% leave no cash row (fully invested, only the buffer stays)", () => {
    const d = computeDrift(three(), { A: 50, B: 50 });
    expect(d.rows.some((r) => r.symbol === "CASH")).toBe(false);
  });
});

describe("drift for a simple 3-asset account", () => {
  it("computes value, weight and drift against targets (cash included as a target)", () => {
    const d = computeDrift(three(), { A: 40, B: 40, CASH: 20 });
    expect(d.base).toBe(10000);
    const row = Object.fromEntries(d.rows.map((r) => [r.symbol, r]));
    expect(row.A).toMatchObject({ currentPct: 50, targetPct: 40, driftPct: 10, targetValue: 4000, diff: -1000 });
    expect(row.B).toMatchObject({ currentPct: 30, driftPct: -10, diff: 1000 });
    expect(row.CASH).toMatchObject({ currentPct: 20, driftPct: 0, diff: 0 });
  });
  it("holdings without a target are excluded from the base and listed as unmanaged", () => {
    const a = acct({ cash: 1000, holdings: [hold("A", 10, 100), hold("X", 5, 1000)] });
    const d = computeDrift(a, { A: 50, CASH: 50 });
    expect(d.base).toBe(2000);
    expect(d.unmanaged.map((h) => h.symbol)).toEqual(["X"]);
  });
});

describe("band", () => {
  it("within the band -> no trades", () => {
    const p = plan({ account: three(), targets: { A: 52, B: 28, CASH: 20 } }); // drift 2pp each
    expect(p).toMatchObject({ status: "within_band", message: "Within band, no trades needed.", trades: [] });
  });
  it("exactly at the band is not a breach", () => {
    expect(plan({ account: three(), targets: { A: 53, B: 27, CASH: 20 } }).status).toBe("within_band");
  });
  it("one symbol outside the band rebalances ALL targeted symbols, not just that one", () => {
    // A is 10pp over; B is only 1pp off (inside the band) but is still traded back to target.
    const a = acct({ cash: 2000, holdings: [hold("A", 50, 100), hold("B", 31, 100)], supportsFractional: true }); // base 10,100
    const p = plan({ account: a, targets: { A: 40, B: 30, CASH: 30 } });
    expect(p.status).toBe("rebalance");
    expect(p.trades.map((t) => t.symbol)).toContain("A");
    expect(p.trades.some((t) => t.symbol === "B")).toBe(true);
  });
});

describe("trade generation", () => {
  it("sells overweight and buys underweight, in whole shares", () => {
    const p = plan({ account: three(), targets: { A: 40, B: 40, CASH: 20 } });
    expect(p.trades).toEqual([
      expect.objectContaining({ symbol: "A", side: "sell", units: 10, estValue: 1000 }),
      expect.objectContaining({ symbol: "B", side: "buy", units: 10, estValue: 1000 }),
    ]);
    expect(p.leftoverCash).toBeCloseTo(2000);
    expect(p.after.find((x) => x.symbol === "A")!.pct).toBeCloseTo(40);
  });

  it("whole-share rounding never overspends cash", () => {
    const a = acct({ cash: 1000, holdings: [] });
    const p = plan({ account: a, targets: { X: 50, Y: 50 }, instruments: { X: { price: 33.33, assetType: "etf" }, Y: { price: 41.7, assetType: "equity" } } });
    const spent = p.trades.filter((t) => t.side === "buy").reduce((s, t) => s + t.estValue, 0);
    expect(spent).toBeLessThanOrEqual(1000);
    expect(p.leftoverCash).toBeGreaterThanOrEqual(0);
    expect(p.trades.every((t) => Number.isInteger(t.units))).toBe(true);
  });

  it("handles the float trap 0.3 / 0.1 (no lost share)", () => {
    expect(floorUnits(0.3 / 0.1, 0)).toBe(3);
    expect(floorUnits(10.9999, 2)).toBe(10.99);
  });

  it("insufficient cash scales all buys proportionally", () => {
    // Targets want $3,000 of buys, but a 5% cash buffer ($500) leaves only $2,500 to spend.
    const a = acct({ cash: 3000, holdings: [hold("A", 30, 100), hold("B", 40, 100)], supportsFractional: true }); // base 10,000
    const p = plan({ account: a, targets: { A: 40, B: 60 }, cashBufferPct: 5 });
    const buyA = p.trades.find((t) => t.symbol === "A" && t.side === "buy")!;
    const buyB = p.trades.find((t) => t.symbol === "B" && t.side === "buy")!;
    expect(buyA.estValue + buyB.estValue).toBeLessThanOrEqual(2500 + 1e-6);
    expect(buyA.estValue + buyB.estValue).toBeGreaterThan(2499);
    expect(buyB.estValue / buyA.estValue).toBeCloseTo(2000 / 1000, 1); // same ratio as the wanted $1000 : $2000
    expect(p.warnings.join(" ")).toMatch(/scaled to 83\.3%/);
  });

  it("keeps the cash buffer out of buys", () => {
    const a = acct({ cash: 1000, holdings: [], supportsFractional: true });
    const p = plan({ account: a, targets: { X: 100 }, cashBufferPct: 10, instruments: { X: { price: 10, assetType: "etf" } } });
    expect(p.trades[0].estValue).toBeCloseTo(900);
    expect(p.leftoverCash).toBeCloseTo(100);
  });

  it("untargeted holdings are never touched", () => {
    const a = acct({ cash: 1000, holdings: [hold("A", 10, 100), hold("KEEP", 99, 10)] });
    const p = plan({ account: a, targets: { A: 100 } });
    expect(p.trades.some((t) => t.symbol === "KEEP")).toBe(false);
    expect(p.unmanaged).toEqual([{ symbol: "KEEP", value: 990 }]);
  });

  it("drops trades below the minimum trade value", () => {
    const a = acct({ cash: 1000, holdings: [hold("A", 10, 100)], supportsFractional: true }); // base 2000
    const p = plan({ account: a, targets: { A: 50.01, CASH: 49.99 }, driftBandPct: 0, minTradeValue: 5 });
    expect(p.trades).toEqual([]);
    expect(p.warnings.join(" ")).toMatch(/smaller than the minimum/);
  });

  it("sells the whole position when its target is 0%, ignoring rounding", () => {
    const a = acct({ cash: 0, holdings: [hold("OLD", 3, 33.33), hold("NEW", 10, 10)] });
    const p = plan({ account: a, targets: { OLD: 0, NEW: 100 } });
    expect(p.trades.find((t) => t.symbol === "OLD")).toMatchObject({ side: "sell", units: 3 });
  });

  it("never sells more than is held", () => {
    const a = acct({ holdings: [hold("A", 1, 100)], cash: 0, supportsFractional: true });
    const p = plan({ account: a, targets: { A: 0.01, CASH: 99.99 } });
    expect(p.trades.find((t) => t.symbol === "A")!.units).toBeLessThanOrEqual(1);
  });

  it("first rebalance of an all-cash account is buy-only, with a warning per unheld symbol", () => {
    const a = acct({ cash: 100000, supportsFractional: true });
    const p = plan({ account: a, targets: { VOO: 60, SPY: 40 }, instruments: { VOO: { price: 700, assetType: "etf" }, SPY: { price: 760, assetType: "etf" } } });
    expect(p.trades.every((t) => t.side === "buy" && t.executable)).toBe(true);
    expect(p.warnings.filter((w) => /isn't held yet/.test(w))).toHaveLength(2);
    expect(p.after.find((x) => x.symbol === "VOO")!.pct).toBeCloseTo(60, 1);
  });

  it("a targeted symbol with no price is skipped and reported", () => {
    const a = acct({ cash: 1000 });
    const p = plan({ account: a, targets: { MYSTERY: 100 } });
    expect(p.trades).toEqual([]);
    expect(p.warnings.join(" ")).toMatch(/No price available for MYSTERY/);
  });
});

describe("modes and warnings", () => {
  it("read-only account: manual mode, trades listed but none executable", () => {
    const a = acct({ cash: 1000, holdings: [hold("A", 10, 100)], supportsTrading: false });
    const p = plan({ account: a, targets: { A: 100 } });
    expect(p.mode).toBe("manual");
    expect(p.trades.length).toBeGreaterThan(0);
    expect(p.trades.every((t) => !t.executable)).toBe(true);
    expect(p.warnings.join(" ")).toMatch(/read-only/);
  });

  it("crypto trades are listed but not executable even on a trading account", () => {
    const a = acct({ cash: 1000, holdings: [hold("BTC", 1, 1000, "crypto")], supportsFractional: true });
    const p = plan({ account: a, targets: { BTC: 25, CASH: 75 } });
    const t = p.trades[0];
    expect(t).toMatchObject({ symbol: "BTC", side: "sell", executable: false });
    expect(p.warnings.join(" ")).toMatch(/manual trades/);
  });

  it("warns on stale positions", () => {
    const a = acct({ cash: 1000, holdings: [hold("A", 1, 100)], asOf: "2026-01-01T00:00:00Z" });
    expect(plan({ account: a, targets: { A: 50, CASH: 50 }, now: new Date("2026-01-01T01:00:00Z") }).warnings.join(" ")).toMatch(/out of date/);
  });

  it("warns about residual drift without fractional shares", () => {
    const a = acct({ cash: 1000, holdings: [], supportsFractional: false });
    const p = plan({ account: a, targets: { BIG: 100 }, instruments: { BIG: { price: 600, assetType: "equity" } } });
    expect(p.warnings.join(" ")).toMatch(/fractional/);
  });

  it("mixed-currency accounts are excluded", () => {
    const p = plan({ account: acct({ currencyOk: false }), targets: { A: 100 } });
    expect(p).toMatchObject({ status: "excluded", mode: "manual", trades: [] });
  });
});
