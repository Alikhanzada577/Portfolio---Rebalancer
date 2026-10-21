import { describe, expect, it } from "vitest";
import { accountValue, positionRows, totalValue, type AccountSnapshot, type Holding } from "@/lib/engine/portfolio";

const hold = (symbol: string, value: number): Holding => ({
  accountId: "a", symbol, assetType: "equity", units: 1, price: value, value, currency: "USD",
});
const acct = (over: Partial<AccountSnapshot>): AccountSnapshot => ({
  accountId: "a", name: "A", brokerage: "B", cash: 0, holdings: [], supportsTrading: true, supportsFractional: true,
  currency: "USD", currencyOk: true, reportedTotal: null, asOf: null, warnings: [], ...over,
});

describe("portfolio", () => {
  it("values and weights for a simple 3-asset account", () => {
    const a = acct({ cash: 100, holdings: [hold("AAPL", 500), hold("VOO", 300), hold("BTC", 100)] });
    expect(accountValue(a)).toBe(1000);
    const w = Object.fromEntries(positionRows([a]).map((r) => [r.symbol, r.weight]));
    expect(w).toEqual({ AAPL: 0.5, VOO: 0.3, BTC: 0.1 }); // weights are of the TOTAL (cash included), so they sum to 0.9 here
  });

  it("lists only positions, never cash, largest first", () => {
    const rows = positionRows([acct({ cash: 10_000, holdings: [hold("A", 20), hold("B", 70)] })]);
    expect(rows.map((r) => r.symbol)).toEqual(["B", "A"]);
    expect(rows.some((r) => r.symbol.toLowerCase() === "cash")).toBe(false);
  });

  it("sums units and value for the same symbol across accounts, with a value-weighted price", () => {
    const rows = positionRows([
      acct({ accountId: "1", holdings: [{ ...hold("AAPL", 100), units: 1, price: 100 }] }),
      acct({ accountId: "2", holdings: [{ ...hold("AAPL", 300), units: 2, price: 150 }], cash: 100 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ symbol: "AAPL", units: 3, value: 400 });
    expect(rows[0].price).toBeCloseTo(400 / 3);
    expect(rows[0].weight).toBeCloseTo(400 / 500);
    expect(totalValue([acct({ holdings: [hold("A", 100)] }), acct({ cash: 50 })])).toBe(150);
  });

  it("leaves non-USD / mixed-currency accounts out", () => {
    const bad = acct({ accountId: "2", currencyOk: false, cash: 999, holdings: [hold("X", 999)] });
    const good = acct({ holdings: [hold("AAPL", 100)] });
    expect(totalValue([good, bad])).toBe(100);
    expect(positionRows([good, bad]).map((r) => r.symbol)).toEqual(["AAPL"]);
  });

  it("an empty portfolio has no rows and no NaN weights", () => {
    expect(positionRows([acct({})])).toEqual([]);
  });
});
