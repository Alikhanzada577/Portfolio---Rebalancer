import { SnapTradeError } from "@/lib/snaptrade/client";

/** Plain-language reason for a failed order submission, safe to show to the user. */
export function describeOrderError(err: unknown): string {
  if (!(err instanceof SnapTradeError)) return "Something went wrong submitting this order. Check your brokerage before retrying.";
  if (err.status === 403) return "Your SnapTrade connection doesn't allow trading. Enable trading for this connection in SnapTrade and sign in again.";
  if (err.status === 429) return "SnapTrade's rate limit was reached. Wait a minute and try again.";
  if (err.status === 400) return err.detail ? `The brokerage rejected this order: ${err.detail}` : "The brokerage rejected this order.";
  return "SnapTrade couldn't submit this order right now.";
}
