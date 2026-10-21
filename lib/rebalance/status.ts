// Pure helpers over SnapTrade's order status vocabulary (see AccountOrderRecordStatus in the OpenAPI spec).

/** No further changes expected. PARTIAL / PENDING / ACCEPTED / QUEUED etc. are still live. */
export const TERMINAL_STATUSES = ["EXECUTED", "FAILED", "REJECTED", "CANCELED", "PARTIAL_CANCELED", "EXPIRED", "REPLACED", "STOPPED", "SUSPENDED"] as const;
const TERMINAL = new Set<string>(TERMINAL_STATUSES);
const FAILED = new Set(["FAILED", "REJECTED"]);

export const isTerminal = (status: string) => TERMINAL.has(status);
export const isFailure = (status: string) => FAILED.has(status);

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Submitted",
  ACCEPTED: "Accepted by brokerage",
  QUEUED: "Queued",
  NONE: "Submitted",
  PARTIAL: "Partly filled",
  EXECUTED: "Filled",
  FAILED: "Failed",
  REJECTED: "Rejected",
  CANCELED: "Canceled",
  PARTIAL_CANCELED: "Partly filled, rest canceled",
  EXPIRED: "Expired",
};

type RunResult = "completed" | "partial" | "failed";

/**
 * Overall result once the run is over.
 * - completed: every order filled and nothing was skipped
 * - failed: nothing filled at all
 * - partial: anything else (some filled, some failed/open, or buys were skipped)
 * No orders at all (e.g. sells filled and no buys were needed) counts as completed.
 * Only call this once every order is terminal: an order that is still open may yet fill, so a run
 * with open orders is `partial`, never `failed`.
 */
export function finalResult(orders: { status: string }[], buysSkipped: boolean): RunResult {
  if (orders.length === 0) return buysSkipped ? "failed" : "completed";
  const filled = orders.filter((o) => o.status === "EXECUTED").length;
  const some = orders.some((o) => o.status === "PARTIAL" || o.status === "PARTIAL_CANCELED");
  if (filled === orders.length && !buysSkipped) return "completed";
  if (filled === 0 && !some) return "failed";
  return "partial";
}
