import { StatTile } from "@/components/ui/stat-tile";
import { combinable, totalValue, type AccountSnapshot } from "@/lib/engine/portfolio";
import { fmtTime, fmtUsd, fmtWeight } from "@/lib/format";

/** Headline numbers across every account we can add up (USD, single currency). */
export function PortfolioSummary({ accounts }: { readonly accounts: AccountSnapshot[] }) {
  const usable = combinable(accounts);
  const total = totalValue(accounts);
  const cash = usable.reduce((sum, a) => sum + a.cash, 0);
  const invested = total - cash;
  const oldest = accounts.map((a) => a.asOf).filter((t): t is string => !!t).sort()[0];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatTile label="Total value" value={fmtUsd(total)} hint={oldest ? `Data as of ${fmtTime(oldest)}` : undefined} />
      <StatTile label="Invested" value={fmtUsd(invested)} hint={total > 0 ? `${fmtWeight(invested / total)} of portfolio` : undefined} />
      <StatTile label="Cash" value={fmtUsd(cash)} hint={total > 0 ? `${fmtWeight(cash / total)} of portfolio` : undefined} />
      <StatTile label="Accounts" value={accounts.length} hint={`${accounts.filter((a) => a.supportsTrading).length} can trade`} />
    </div>
  );
}

