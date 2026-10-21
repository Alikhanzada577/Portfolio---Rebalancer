import { describe, expect, it } from "vitest";
import { rankSymbols, SEARCH_PATTERN } from "@/lib/symbols";

const r = (symbol: string, description: string, code = "et", over: object = {}) => ({
  symbol, description, currency: { code: "USD" }, exchange: { code: "ARCA" }, type: { code, description: code === "et" ? "ETF" : "Common Stock", is_supported: true }, ...over,
});

describe("rankSymbols", () => {
  it("puts the exact ticker first, then ticker prefixes, then name matches", () => {
    // Real SnapTrade order for "vo": VO, VOT, VOO...: VOO must beat VOT for the query "voo".
    const out = rankSymbols([r("VOT", "Vanguard Mid-Cap Growth ETF"), r("VOOG", "Vanguard S&P 500 Growth"), r("VOO", "Vanguard S&P 500 ETF"), r("PINE", "Pineapple Inc", "cs")], "voo");
    expect(out.map((h) => h.symbol)).toEqual(["VOO", "VOOG", "VOT", "PINE"]);
  });

  it("finds a company by name and still ranks the ticker match first", () => {
    const out = rankSymbols([r("DPS", "Dr Pepper Snapple", "cs"), r("AAPL", "Apple Inc.", "cs"), r("APLE", "Apple Hospitality REIT", "cs")], "aapl");
    expect(out[0].symbol).toBe("AAPL");
  });

  it("for a company name, 'Apple Inc.' beats 'Pineapple' (name prefix beats substring)", () => {
    const out = rankSymbols([r("MLP", "Maui Land & Pineapple Company", "cs"), r("DPS", "Dr Pepper Snapple Group", "cs"), r("APLE", "Apple Hospitality REIT", "cs"), r("AAPL", "Apple Inc.", "cs")], "apple");
    expect(out.map((h) => h.symbol).slice(0, 2).sort()).toEqual(["AAPL", "APLE"]);
    expect(out.at(-1)!.symbol).not.toBe("AAPL");
  });

  it("drops non-USD and unsupported instruments", () => {
    const out = rankSymbols([r("SHOP.TO", "Shopify", "cs", { currency: { code: "CAD" } }), r("WEIRD", "Weird", "cs", { type: { code: "cs", is_supported: false } }), r("VOO", "Vanguard")], "s");
    expect(out.map((h) => h.symbol)).toEqual(["VOO"]);
  });

  it("canonicalizes share classes and removes duplicate tickers (listings on several exchanges)", () => {
    const out = rankSymbols([r("BRK-B", "Berkshire B", "cs"), r("BRKY", "Direxion A"), r("BRKY", "Direxion B", "et", { exchange: { code: "NYSEAM" } })], "brk");
    expect(out.map((h) => h.symbol).sort()).toEqual(["BRK.B", "BRKY"]);
    expect(out.filter((h) => h.symbol === "BRKY")).toHaveLength(1);
    expect(out.some((h) => h.symbol === "BRK.B")).toBe(true);
  });

  it("flags only stocks, ADRs, preferreds and ETFs as tradable", () => {
    const out = rankSymbols([r("VOO", "x", "et"), r("TRUST", "y", "ut"), r("SEI", "z", "crypto")], "s");
    expect(Object.fromEntries(out.map((h) => [h.symbol, h.tradable]))).toEqual({ VOO: true, TRUST: false, SEI: false });
  });

  it("limits results", () => {
    expect(rankSymbols(Array.from({ length: 30 }, (_, i) => r(`S${i}`, "x")), "s", 10)).toHaveLength(10);
  });
});

describe("SEARCH_PATTERN", () => {
  it("accepts tickers and company names, rejects empty, long or odd input", () => {
    for (const ok of ["voo", "BRK.B", "brk-b", "apple inc", "S&P"]) expect(SEARCH_PATTERN.test(ok)).toBe(true);
    for (const bad of ["", "<script>", "a".repeat(21), "x;y", "a/b"]) expect(SEARCH_PATTERN.test(bad)).toBe(false);
  });
});
