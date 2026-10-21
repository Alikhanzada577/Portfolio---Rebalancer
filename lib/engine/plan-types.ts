import type { DriftRow, Instruments, Targets } from "@/lib/engine/drift";
import type { AccountSnapshot, AssetType } from "@/lib/engine/portfolio";

export type Trade = {
  symbol: string;
  side: "buy" | "sell";
  units: number;
  price: number;
  estValue: number;
  assetType: AssetType;
  /** Can this app place it? Needs a trade-enabled connection and an equity/ETF. Otherwise it's a manual trade. */
  executable: boolean;
};

export type PlanRow = DriftRow;

/** A targeted row we can actually trade: it has a price and a known asset type. */
export type PricedRow = PlanRow & { price: number; assetType: AssetType };

export type RebalancePlan = {
  status: "within_band" | "rebalance" | "excluded";
  /** "manual": show the trade list only, no execute button. */
  mode: "trade" | "manual";
  message: string | null;
  base: number;
  rows: PlanRow[];
  trades: Trade[];
  /** Estimated weights (% of base) after the trades, ignoring fees. */
  after: { symbol: string; pct: number }[];
  leftoverCash: number;
  unmanaged: { symbol: string; value: number }[];
  warnings: string[];
  /** Explains how "total exposure" targets became direct targets. Absent on plans saved before this existed. */
  notes?: string[];
};

export type PlanInput = {
  account: AccountSnapshot;
  targets: Targets;
  instruments?: Instruments;
  driftBandPct: number;
  cashBufferPct: number;
  minTradeValue?: number;
  now?: Date;
};
