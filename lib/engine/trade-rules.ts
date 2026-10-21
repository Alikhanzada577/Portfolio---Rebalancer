import type { AccountSnapshot, AssetType } from "@/lib/engine/portfolio";

const CRYPTO_DECIMALS = 6;
const FRACTIONAL_DECIMALS = 4;

/** Smallest unit a trade may use: crypto 6 dp, fractional-capable brokers 4 dp, otherwise whole shares. */
export const decimalsFor = (assetType: AssetType, fractional: boolean) => (assetType === "crypto" ? CRYPTO_DECIMALS : fractional ? FRACTIONAL_DECIMALS : 0);

/** Round DOWN so we never spend or sell more than intended. The epsilon absorbs 0.3/0.1 = 2.9999999999999996. */
export function floorUnits(units: number, decimals: number) {
  const f = 10 ** decimals;
  return Math.floor(units * f + 1e-9) / f;
}

/** This app places orders only for stocks and ETFs on a connection that was granted trading. Everything else is a manual trade. */
export const isExecutable = (account: AccountSnapshot, assetType: AssetType) => account.supportsTrading && (assetType === "equity" || assetType === "etf");
