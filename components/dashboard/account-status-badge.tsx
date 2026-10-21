import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { AccountStatus } from "@/lib/engine/account-status";

const BADGES: Record<AccountStatus, { label: string; tone: BadgeTone }> = {
  no_targets: { label: "No targets yet", tone: "caution" },
  drifted: { label: "Drifted", tone: "caution" },
  on_target: { label: "On target", tone: "positive" },
  invalid: { label: "Fix targets", tone: "negative" },
  rebalancing: { label: "Rebalancing…", tone: "brand" },
};

export function AccountStatusBadge({ status }: { readonly status: AccountStatus }) {
  const { label, tone } = BADGES[status];
  return <Badge tone={tone}>{label}</Badge>;
}
