import { breachesBand, computeDrift, InvalidTargetsError, type Targets } from "@/lib/engine/drift";
import type { AccountSnapshot } from "@/lib/engine/portfolio";

/**
 * Where an account stands, which decides what the dashboard tells the user to do next:
 * - no_targets: nothing to rebalance toward yet -> set targets
 * - drifted:    some holding is outside the drift band -> rebalance
 * - on_target:  everything is within the band -> nothing to do
 * - invalid:    saved targets can't be used (e.g. add up to more than 100%) -> fix them
 * - rebalancing: orders are in flight right now (set by the loader from the run table, not computed here)
 */
export type AccountStatus = "no_targets" | "drifted" | "on_target" | "invalid" | "rebalancing";

export function accountStatus(account: AccountSnapshot, targets: Targets, driftBandPct: number): AccountStatus {
  if (Object.keys(targets).length === 0) return "no_targets";
  try {
    // Prices for symbols not held yet aren't needed to measure drift (percentages only).
    return breachesBand(computeDrift(account, targets).rows, driftBandPct) ? "drifted" : "on_target";
  } catch (err) {
    if (err instanceof InvalidTargetsError) return "invalid";
    throw err;
  }
}
