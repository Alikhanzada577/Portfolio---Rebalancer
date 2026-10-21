import { ButtonLink } from "@/components/ui/button";
import type { AccountStatus } from "@/lib/engine/account-status";

/** The buttons on an account card. The one matching the account's status is the highlighted (primary) one. */
type Props = { readonly accountId: string; readonly status: AccountStatus; /** The running rebalance, when status is "rebalancing". */ readonly activeRunId?: string };

export function AccountActions({ accountId, status, activeRunId }: Props) {
  const targets = `/accounts/${accountId}/targets`;
  const rebalance = `/accounts/${accountId}/rebalance`;

  if (status === "rebalancing") {
    return (
      <ButtonLink href={activeRunId ? `/runs/${activeRunId}` : rebalance} size="sm">
        View progress
      </ButtonLink>
    );
  }
  if (status === "no_targets" || status === "invalid") {
    return (
      <ButtonLink href={targets} size="sm">
        {status === "invalid" ? "Fix targets" : "Set targets"}
      </ButtonLink>
    );
  }
  return (
    <div className="flex gap-2">
      <ButtonLink href={targets} variant="secondary" size="sm">
        Edit targets
      </ButtonLink>
      <ButtonLink href={rebalance} variant={status === "drifted" ? "primary" : "secondary"} size="sm">
        Rebalance
      </ButtonLink>
    </div>
  );
}
