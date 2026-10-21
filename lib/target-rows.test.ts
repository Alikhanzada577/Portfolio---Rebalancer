import { describe, expect, it } from "vitest";
import { normalizeSymbol, summarizeTargets, withCurrentWeights, type TargetRow } from "@/lib/target-rows";

const row = (symbol: string, pct: string, held = true): TargetRow => ({ symbol, pct, held });

describe("summarizeTargets", () => {
  it("whatever isn't allocated is the cash remainder", () => {
    expect(summarizeTargets([row("AAPL", "10"), row("TSLA", "20")])).toMatchObject({ total: 30, remainder: 70, count: 2, over: false, canSave: true });
  });
  it("blank rows are not managed and don't count", () => {
    expect(summarizeTargets([row("AAPL", "10"), row("MSFT", "")])).toMatchObject({ count: 1, total: 10 });
  });
  it("over 100% cannot be saved and leaves no remainder", () => {
    expect(summarizeTargets([row("A", "80"), row("B", "30")])).toMatchObject({ over: true, remainder: 0, canSave: false });
  });
  it("exactly 100% is fine (fully invested)", () => {
    expect(summarizeTargets([row("A", "60"), row("B", "40")])).toMatchObject({ over: false, remainder: 0, canSave: true });
  });
  it("needs at least one target", () => {
    expect(summarizeTargets([row("A", ""), row("B", "")]).canSave).toBe(false);
    expect(summarizeTargets([]).canSave).toBe(false);
  });
  it("rejects non-numbers and out-of-range values", () => {
    for (const bad of ["abc", "-5", "101", "1e999"]) expect(summarizeTargets([row("A", bad)])).toMatchObject({ invalid: true, canSave: false });
  });
  it("0% is a valid explicit target (sell it all)", () => {
    expect(summarizeTargets([row("A", "0")])).toMatchObject({ count: 1, canSave: true });
  });
});

describe("summarizeTargets in total-exposure mode", () => {
  it("the cash remainder follows what is allocated DIRECTLY, not what was typed", () => {
    // typed 80% (AAPL 20 total, SPY 30, VOO 30) but only ~75.5% is held directly, so ~24.5% is cash
    const s = summarizeTargets([row("AAPL", "20"), row("SPY", "30"), row("VOO", "30")], 75.5);
    expect(s).toMatchObject({ total: 80, allocated: 75.5, over: false, canSave: true });
    expect(s.remainder).toBeCloseTo(24.5);
  });
  it("over 100% is judged on the direct allocation", () => {
    expect(summarizeTargets([row("A", "60"), row("B", "60")], 90).over).toBe(false); // typed 120 but only 90 direct
    expect(summarizeTargets([row("A", "60")], 101).over).toBe(true);
  });
});

describe("withCurrentWeights", () => {
  it("fills held symbols with their weight and clears the rest", () => {
    const out = withCurrentWeights([row("AAPL", "5"), row("VOO", "7"), row("NEW", "9", false)], { AAPL: 12.3456, VOO: 0 });
    expect(out.map((r) => r.pct)).toEqual(["12.35", "", ""]);
  });
});

describe("normalizeSymbol", () => {
  it("upper-cases, converts share-class dashes, and rejects junk", () => {
    expect(normalizeSymbol(" brk-b ")).toBe("BRK.B");
    expect(normalizeSymbol("voo")).toBe("VOO");
    for (const bad of ["", "<x>", "a b", "WAYTOOLONGSYMBOL1"]) expect(normalizeSymbol(bad)).toBeNull();
  });
});
