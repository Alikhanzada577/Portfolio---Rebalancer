import { describe, expect, it } from "vitest";
import real from "@/lib/snaptrade/fixtures/real.json";
import { canonicalSymbol, normalizeAccount } from "@/lib/snaptrade/normalize";
import { accountsSchema, balancesSchema, connectionsSchema, positionsSchema } from "@/lib/snaptrade/schemas";

const accounts = accountsSchema.parse(real.accounts);
const connections = connectionsSchema.parse(real.connections);
const binance = () =>
  normalizeAccount({
    account: accounts[0],
    connection: connections[0],
    balances: balancesSchema.parse(real.binanceBalances),
    positions: positionsSchema.parse(real.binancePositions).results,
    asOf: "t",
  });
const alpaca = () =>
  normalizeAccount({
    account: accounts[1],
    connection: connections[1],
    balances: balancesSchema.parse(real.alpacaBalances),
    positions: positionsSchema.parse(real.alpacaPositions).results,
    asOf: "t",
  });

describe("canonicalSymbol", () => {
  it("normalizes case, whitespace and share-class separators", () => {
    expect(canonicalSymbol(" brk-b ")).toBe("BRK.B");
    expect(canonicalSymbol("BRK.B")).toBe("BRK.B");
    expect(canonicalSymbol("btc")).toBe("BTC");
  });
});

describe("real Binance SPOT response (read-only connection, crypto)", () => {
  it("parses units and prices that arrive as strings", () => {
    const a = binance();
    expect(a.holdings).toHaveLength(31);
    expect(a.holdings.every((x) => x.assetType === "crypto" && Number.isFinite(x.value) && x.value > 0)).toBe(true);
    expect(a.holdings[0].value).toBeGreaterThanOrEqual(a.holdings[1].value);
  });

  it("is manual mode: the connection was granted read only, even though the brokerage allows trading", () => {
    const a = binance();
    expect(connections[0].brokerage.allows_trading).toBe(true);
    expect(a.supportsTrading).toBe(false);
    expect(a.supportsFractional).toBe(true);
  });

  it("warns when SnapTrade's total doesn't match the itemised positions", () => {
    expect(binance().warnings.join(" ")).toMatch(/reports a total of \$750\.32/);
  });
});

describe("real Alpaca Paper response (trade connection, all cash)", () => {
  it("is cash only and supports trading", () => {
    const a = alpaca();
    expect(a).toMatchObject({ cash: 100000, holdings: [], supportsTrading: true, currencyOk: true, warnings: [] });
  });
});

describe("edge cases", () => {
  const base = { account: accounts[1], connection: connections[1], balances: [], asOf: null };
  const pos = (over: object) => ({ instrument: { kind: "stock", symbol: "AAPL" }, units: "2", price: "10", currency: "USD", ...over });

  it("skips positions without a price or units, and says so", () => {
    const a = normalizeAccount({ ...base, positions: [pos({ price: null }), pos({ units: null, instrument: { kind: "stock", symbol: "MSFT" } })] });
    expect(a.holdings).toEqual([]);
    expect(a.warnings.filter((w) => /not counted/.test(w))).toHaveLength(2);
  });

  it("maps kinds to asset types and canonicalizes symbols", () => {
    const a = normalizeAccount({
      ...base,
      positions: [pos({ instrument: { kind: "etf", symbol: "voo" } }), pos({ instrument: { kind: "adr", symbol: "BRK-B" } }), pos({ instrument: { kind: "bond", symbol: "T1" } })],
    });
    expect(Object.fromEntries(a.holdings.map((h) => [h.symbol, h.assetType]))).toEqual({ VOO: "etf", "BRK.B": "equity", T1: "other" });
  });

  it("skips derivatives that have no symbol", () => {
    const a = normalizeAccount({ ...base, positions: [pos({ instrument: { kind: "option" } })] });
    expect(a.holdings).toEqual([]);
    expect(a.warnings[0]).toMatch(/no symbol/);
  });

  it("flags mixed currencies and excludes the account", () => {
    const a = normalizeAccount({ ...base, positions: [pos({}), pos({ currency: "CAD", instrument: { kind: "stock", symbol: "SHOP" } })] });
    expect(a.currencyOk).toBe(false);
    expect(a.warnings.join(" ")).toMatch(/USD, CAD|CAD, USD/);
  });

  it("flags a single non-USD currency too", () => {
    expect(normalizeAccount({ ...base, positions: [pos({ currency: "CAD" })] }).currencyOk).toBe(false);
  });

  it("trading is false when the connection is unknown, disabled or in maintenance", () => {
    const c = connections[1];
    const run = (connection: typeof c | undefined) => normalizeAccount({ ...base, connection, positions: [] }).supportsTrading;
    expect(run(undefined)).toBe(false);
    expect(run({ ...c, disabled: true })).toBe(false);
    expect(run({ ...c, brokerage: { ...c.brokerage, maintenance_mode: true } })).toBe(false);
    expect(run(c)).toBe(true);
  });
});
