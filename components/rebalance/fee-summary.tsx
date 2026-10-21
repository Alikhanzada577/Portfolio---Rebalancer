import { fmtUsd } from "@/lib/format";
import type { FeeSummary as Summary } from "@/lib/rebalance/fees";

/** Total fees with an honest label for where the number comes from (see SnapTrade's confirmation guidance). */
export function FeeSummary({ fees }: { readonly fees: Summary }) {
  if (fees.placed === 0) return null;
  const source = fees.known === null ? "Impact source: not available." : fees.unknown > 0 ? "Impact source: brokerage preview (some orders have none)." : "Impact source: brokerage preview.";
  return (
    <p className="text-sm">
      <span className="font-medium">Total fees: </span>
      {fees.known === null ? "Not available" : `${fmtUsd(fees.known)}${fees.unknown ? ` + ${fees.unknown} order${fees.unknown === 1 ? "" : "s"} not available` : ""}`}
      <span className="block text-xs text-muted">{source}</span>
    </p>
  );
}
