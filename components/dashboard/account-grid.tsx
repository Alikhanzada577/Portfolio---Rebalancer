import { AccountCard } from "@/components/dashboard/account-card";
import type { AccountStatus } from "@/lib/engine/account-status";
import type { AccountSnapshot } from "@/lib/engine/portfolio";

type Props = { readonly accounts: AccountSnapshot[]; readonly statuses: Record<string, AccountStatus>; readonly activeRuns: Record<string, string> };

export function AccountGrid({ accounts, statuses, activeRuns }: Props) {
  return (
    <section aria-label="Accounts" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {accounts.map((account) => (
        <AccountCard key={account.accountId} account={account} status={statuses[account.accountId]} activeRunId={activeRuns[account.accountId]} />
      ))}
    </section>
  );
}
