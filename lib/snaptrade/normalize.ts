import type { AccountSnapshot, AssetType, Holding } from "@/lib/engine/portfolio";
import type { SnapAccount, SnapBalance, SnapConnection, SnapPosition } from "@/lib/snaptrade/schemas";

/** "brk-b" / "BRK.B" -> "BRK.B". Share classes use "." everywhere internally. */
export const canonicalSymbol = (s: string) => s.trim().toUpperCase().replace(/-/g, ".");

const KIND_TO_TYPE: Record<string, AssetType> = {
  stock: "equity",
  adr: "equity",
  etf: "etf",
  crypto: "crypto",
};

const toNumber = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Prices differ from the reported total by more than this -> warn (see DECISIONS.md).
const TOTAL_MISMATCH_TOLERANCE = 0.05;

export function normalizeAccount(input: {
  account: SnapAccount;
  connection: SnapConnection | undefined;
  balances: SnapBalance[];
  positions: SnapPosition[];
  asOf: string | null;
}): AccountSnapshot {
  const { account, connection, balances, positions, asOf } = input;
  const warnings: string[] = [];
  const holdings: Holding[] = [];
  const currencies = new Set<string>();

  for (const p of positions) {
    const symbol = p.instrument.symbol && canonicalSymbol(p.instrument.symbol);
    const units = toNumber(p.units);
    const price = toNumber(p.price);
    if (!symbol) {
      warnings.push(`Skipped a ${p.instrument.kind} position with no symbol.`);
      continue;
    }
    if (units === null || price === null) {
      warnings.push(`${symbol} has no ${units === null ? "unit count" : "price"} from the brokerage, so it is not counted.`);
      continue;
    }
    if (units === 0) continue;
    const currency = (p.currency ?? "USD").toUpperCase();
    currencies.add(currency);
    holdings.push({
      accountId: account.id,
      symbol,
      assetType: KIND_TO_TYPE[p.instrument.kind] ?? "other",
      units,
      price,
      value: units * price,
      currency,
    });
  }

  // Cash: one entry per currency. Anything non-zero counts toward the account's currencies.
  let cash = 0;
  for (const b of balances) {
    const code = b.currency.code.toUpperCase();
    if (b.cash && b.cash !== 0) currencies.add(code);
    if (code === "USD") cash += b.cash ?? 0;
  }

  const currency = currencies.size === 1 ? [...currencies][0] : "USD";
  const currencyOk = currencies.size === 0 || (currencies.size === 1 && currencies.has("USD"));
  if (!currencyOk) {
    warnings.push(
      `This account holds ${[...currencies].join(", ")}. Only single-currency USD accounts are supported, so it is excluded from totals and rebalancing.`,
    );
  }

  const reportedTotal = account.balance?.total?.amount ?? null;
  const computed = cash + holdings.reduce((s, h) => s + h.value, 0);
  if (currencyOk && reportedTotal !== null && reportedTotal > 0) {
    if (Math.abs(computed - reportedTotal) / reportedTotal > TOTAL_MISMATCH_TOLERANCE) {
      warnings.push(
        `SnapTrade reports a total of $${reportedTotal.toFixed(2)}, but the itemised positions and cash add up to $${computed.toFixed(2)}. The difference isn't broken down by the brokerage and is not included.`,
      );
    }
  }

  // Trading needs both: the connection was granted `trade`, and the brokerage supports it. Unknown -> false.
  const supportsTrading =
    !!connection && connection.type === "trade" && !connection.disabled && connection.brokerage.allows_trading === true && connection.brokerage.maintenance_mode !== true;
  if (connection?.disabled) warnings.push("This connection is disabled. Repair it in the SnapTrade Dashboard.");

  return {
    accountId: account.id,
    name: account.name ?? account.institution_name,
    brokerage: account.institution_name,
    cash,
    holdings: holdings.sort((a, b) => b.value - a.value),
    supportsTrading,
    supportsFractional: connection?.brokerage.allows_fractional_units === true,
    currency,
    currencyOk,
    reportedTotal,
    asOf,
    warnings,
  };
}
