import type { RebalancePlan } from "@/lib/engine/trades";

/** Brokerage-supplied estimate for one order. Any field can be null = "not available" (never shown as $0). */
export type TradeImpact = { remainingCash: number | null; commission: number | null; forexFees: number | null };

export type StoredPlan = {
  plan: RebalancePlan;
  /** Keyed `${side}:${symbol}`. null = the brokerage gave no estimate. */
  impact: Record<string, TradeImpact | null>;
  symbolIds: Record<string, string>;
  execution: {
    /** Set once every sell order has been submitted. Pollers wait for it, so they never see a half-inserted batch. */
    sellsSubmitted: boolean;
    buysSubmitted: boolean;
    /** True when buys were never placed because the sells didn't fill. */
    buysSkipped: boolean;
    note: string | null;
  };
};

export type RunOrder = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  units: number;
  estValue: number;
  status: string;
  error: string | null;
};

/** A confirmed order that hasn't been submitted yet (the buys wait for the sells to fill). */
export type QueuedOrder = { symbol: string; side: "buy" | "sell"; units: number; estValue: number };

export type RunView = {
  id: string;
  accountId: string;
  status: "previewed" | "executing_sells" | "executing_buys" | "completed" | "partial" | "failed" | "cancelled";
  createdAt: string;
  note: string | null;
  plan: RebalancePlan;
  impact: StoredPlan["impact"];
  orders: RunOrder[];
  /** Confirmed trades still waiting to be placed. Shown so the user sees the whole plan, not just the sells. */
  queued: QueuedOrder[];
};

export const impactKey = (side: string, symbol: string) => `${side}:${symbol}`;
