import { Button } from "@/components/ui/button";

type Props = { readonly busy: boolean; readonly expired: boolean; readonly remainingMs: number; readonly onConfirm: () => void };

const clock = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0")}`;

/** The explicit confirmation step SnapTrade requires before any order is placed. */
export function ConfirmOrders({ busy, expired, remainingMs, onConfirm }: Props) {
  return (
    <div className="space-y-2">
      <Button onClick={onConfirm} disabled={busy || expired}>
        {busy ? "Placing orders…" : "Confirm and place orders"}
      </Button>
      <p className="text-xs text-muted" aria-live="polite">
        {expired ? "This preview has expired because prices move. Preview again." : `Valid for ${clock(remainingMs)}, because prices move.`}
      </p>
    </div>
  );
}
