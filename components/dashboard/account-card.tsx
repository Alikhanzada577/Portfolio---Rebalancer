import { AccountActions } from "@/components/dashboard/account-actions";
import { AccountStatusBadge } from "@/components/dashboard/account-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AccountStatus } from "@/lib/engine/account-status";
import { accountValue, type AccountSnapshot } from "@/lib/engine/portfolio";
import { fmtUsd } from "@/lib/format";

type Props = { readonly account: AccountSnapshot; readonly status: AccountStatus | undefined; readonly activeRunId?: string };

/** One brokerage account: value, cash, whether we can trade it, where it stands against its targets, and what to do next. */
export function AccountCard({ account, status, activeRunId }: Props) {
  const count = account.holdings.length;
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
            {account.brokerage.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="font-medium leading-tight">{account.name}</p>
            <p className="text-xs text-muted">{account.brokerage}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {status && <AccountStatusBadge status={status} />}
          <Badge tone={account.supportsTrading ? "brand" : "neutral"}>{account.supportsTrading ? "Trading enabled" : "Read-only"}</Badge>
        </div>
      </div>

      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{account.currencyOk ? fmtUsd(accountValue(account)) : "n/a"}</p>
        <p className="mt-1 text-xs text-muted">
          Cash {fmtUsd(account.cash)} · {count} position{count === 1 ? "" : "s"}
        </p>
      </div>

      {account.warnings.map((warning) => (
        <p key={warning} className="rounded-md bg-caution-soft px-3 py-2 text-xs text-caution">
          {warning}
        </p>
      ))}

      {account.currencyOk && status && (
        <div className="mt-auto">
          <AccountActions accountId={account.accountId} status={status} activeRunId={activeRunId} />
        </div>
      )}
    </Card>
  );
}
