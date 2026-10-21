import { Card } from "@/components/ui/card";
import { StepItem } from "@/components/ui/step-item";
import type { Trade } from "@/lib/engine/trades";

const list = (trades: Trade[]) => trades.map((t) => t.symbol).join(", ");

/**
 * "How this will run": the order of events the user is agreeing to, including the part that happens later
 * without them (the buys follow the sells automatically). Only trades this app will actually place are listed.
 */
export function ExecutionPlan({ trades }: { readonly trades: Trade[] }) {
  const placed = trades.filter((t) => t.executable);
  const sells = placed.filter((t) => t.side === "sell");
  const buys = placed.filter((t) => t.side === "buy");
  if (placed.length === 0) return null;

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold tracking-tight">How this will run</h3>
      <ol className="mt-4 space-y-4">
        {sells.length > 0 && <StepItem number={1} state="current" title={`Sell ${list(sells)}`} description="Placed as soon as you confirm." />}
        {buys.length > 0 && (
          <StepItem
            number={sells.length > 0 ? 2 : 1}
            state={sells.length > 0 ? "upcoming" : "current"}
            title={`Buy ${list(buys)}`}
            description={sells.length > 0 ? "Placed automatically once the sells have filled, using your actual cash. Never more than shown above." : "Placed as soon as you confirm."}
          />
        )}
      </ol>
      <p className="mt-4 text-xs text-muted">You don&apos;t need to stay on this page. If the market is closed, orders wait for it to open.</p>
    </Card>
  );
}
