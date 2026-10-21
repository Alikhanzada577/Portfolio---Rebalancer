export type AssetType = "equity" | "etf" | "crypto" | "other";

export type Holding = {
  accountId: string;
  symbol: string; // canonical: upper-case, share classes use ".", e.g. "BRK.B"
  assetType: AssetType;
  units: number;
  price: number;
  value: number; // units * price
  currency: string;
};

export type AccountSnapshot = {
  accountId: string;
  name: string;
  brokerage: string;
  cash: number;
  holdings: Holding[];
  supportsTrading: boolean; // false when unknown
  supportsFractional: boolean; // false when unknown
  currency: string;
  /** False when the account mixes currencies or isn't USD: excluded from totals and rebalancing (v1). */
  currencyOk: boolean;
  /** SnapTrade's own account total, for cross-checking against holdings + cash. */
  reportedTotal: number | null;
  asOf: string | null;
  warnings: string[];
};

export const accountValue = (a: AccountSnapshot) => a.cash + a.holdings.reduce((s, h) => s + h.value, 0);

/** Accounts that can be summed together (single USD currency). */
export const combinable = (accounts: AccountSnapshot[]) => accounts.filter((a) => a.currencyOk);

export const totalValue = (accounts: AccountSnapshot[]) => combinable(accounts).reduce((s, a) => s + accountValue(a), 0);

export type PositionRow = {
  symbol: string;
  assetType: AssetType;
  units: number;
  /** Value-weighted average across accounts that hold it. */
  price: number;
  value: number;
  /** Share of TOTAL portfolio value (cash included), so it matches the "Now" column when setting targets. */
  weight: number;
};

/** Every position summed by symbol across accounts, largest first. Cash is not a position and is excluded. */
export function positionRows(accounts: AccountSnapshot[]): PositionRow[] {
  const usable = combinable(accounts);
  const total = totalValue(usable);
  const bySymbol = new Map<string, { assetType: AssetType; units: number; value: number }>();
  for (const account of usable) {
    for (const h of account.holdings) {
      const row = bySymbol.get(h.symbol) ?? { assetType: h.assetType, units: 0, value: 0 };
      row.units += h.units;
      row.value += h.value;
      bySymbol.set(h.symbol, row);
    }
  }
  return [...bySymbol]
    .filter(([, r]) => r.value > 0)
    .map(([symbol, r]) => ({ symbol, assetType: r.assetType, units: r.units, price: r.units > 0 ? r.value / r.units : 0, value: r.value, weight: total > 0 ? r.value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}
