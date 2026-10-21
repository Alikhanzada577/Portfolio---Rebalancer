import { describe, expect, it } from "vitest";
import { parseProfile } from "@/lib/etf/holdings";

describe("parseProfile (Alpha Vantage ETF_PROFILE)", () => {
  it("parses string weights, canonicalizes symbols and takes the date", () => {
    const p = parseProfile({ last_updated: "2026-10-16 00:01 UTC", holdings: [{ symbol: "BRK-B", weight: "0.014" }, { symbol: "AAPL", weight: "0.07" }] });
    expect(p).toEqual({ asOf: "2026-10-16", constituents: { "BRK.B": 0.014, AAPL: 0.07 } });
  });

  it("skips n/a placeholders and sums duplicate symbols", () => {
    const p = parseProfile({ holdings: [{ symbol: "n/a", weight: "0.01" }, { symbol: "X", weight: "0.02" }, { symbol: "X", weight: "0.03" }] });
    expect(p!.constituents).toEqual({ X: 0.05 });
    expect(p!.asOf).toBeNull();
  });

  it("returns null for rate-limit / error replies and empty holdings", () => {
    expect(parseProfile({ Information: "25 requests per day" })).toBeNull();
    expect(parseProfile({ holdings: [] })).toBeNull();
    expect(parseProfile("nope")).toBeNull();
  });
});
