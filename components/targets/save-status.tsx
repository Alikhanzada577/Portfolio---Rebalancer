import Link from "next/link";
import type { SaveState } from "@/components/targets/use-targets-editor";
import type { TargetSummary } from "@/lib/target-rows";

type Props = { readonly state: SaveState; readonly summary: TargetSummary; readonly accountId: string };

/** The one-line message beside the Save button: success, server error, or why saving is disabled. */
export function SaveStatus({ state, summary, accountId }: Props) {
  if (state.kind === "saved") {
    return (
      <span role="status" className="text-sm text-positive">
        Saved.{" "}
        <Link className="font-medium underline" href={`/accounts/${accountId}/rebalance`}>
          Go to rebalance →
        </Link>
      </span>
    );
  }
  if (state.kind === "error") {
    return (
      <span role="alert" className="text-sm text-negative">
        {state.message}
      </span>
    );
  }
  if (summary.canSave) return null;
  const reason = summary.invalid
    ? "Each target must be a number from 0 to 100."
    : summary.over
      ? `Your targets add up to ${summary.allocated.toFixed(2)}%, which is more than 100%. Lower one of them.`
      : "Enter a target for at least one symbol.";
  return <span className="text-sm text-muted">{reason}</span>;
}
