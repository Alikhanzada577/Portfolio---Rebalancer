import { describe, expect, it } from "vitest";
import type { Trade } from "@/lib/engine/trades";
import { feeOf, summarizeFees } from "@/lib/rebalance/fees";

const trade = (symbol: string, executable = true): Trade => ({ symbol, side: "buy", units: 1, price: 10, estValue: 10, assetType: "etf", executable });

describe("feeOf", () => {
  it("adds commission and FX fees", () => expect(feeOf({ remainingCash: 1, commission: 1.5, forexFees: 0.25 })).toBe(1.75));
  it("one known part is enough", () => expect(feeOf({ remainingCash: null, commission: null, forexFees: 2 })).toBe(2));
  it("a reported zero is a real zero", () => expect(feeOf({ remainingCash: null, commission: 0, forexFees: 0 })).toBe(0));
  it("no estimate is null, never 0", () => {
    expect(feeOf(null)).toBeNull();
    expect(feeOf(undefined)).toBeNull();
    expect(feeOf({ remainingCash: 5, commission: null, forexFees: null })).toBeNull();
  });
});

describe("summarizeFees", () => {
  it("sums the known fees and counts the orders with none", () => {
    const impact = { "buy:A": { remainingCash: null, commission: 1, forexFees: 0 }, "buy:B": null };
    expect(summarizeFees([trade("A"), trade("B")], impact)).toEqual({ known: 1, unknown: 1, placed: 2 });
  });
  it("is unknown (null) when no order has an estimate", () => {
    expect(summarizeFees([trade("A")], {})).toEqual({ known: null, unknown: 1, placed: 1 });
  });
  it("ignores manual trades: this app doesn't place them", () => {
    expect(summarizeFees([trade("A", false)], {})).toEqual({ known: null, unknown: 0, placed: 0 });
  });
});
