import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { RunView } from "@/lib/rebalance/types";

type Status = RunView["status"];

const RUN_TONES: Record<Status, BadgeTone> = {
  previewed: "neutral",
  executing_sells: "brand",
  executing_buys: "brand",
  completed: "positive",
  partial: "caution",
  failed: "negative",
  cancelled: "neutral",
};

const WORDS: Record<Status, string> = {
  previewed: "previewed",
  executing_sells: "in progress",
  executing_buys: "in progress",
  completed: "completed",
  partial: "partly done",
  failed: "failed",
  cancelled: "cancelled",
};

export function RunStatusBadge({ status }: { readonly status: Status }) {
  return <Badge tone={RUN_TONES[status]}>{WORDS[status]}</Badge>;
}
