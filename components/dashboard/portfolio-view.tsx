import { ReauthScreen } from "@/components/auth/reauth-screen";
import { AccountGrid } from "@/components/dashboard/account-grid";
import { AllocationPanel } from "@/components/dashboard/allocation-panel";
import { ExposurePanel } from "@/components/dashboard/exposure-panel";
import { FailedAccountsNotice } from "@/components/dashboard/failed-accounts-notice";
import { GuidedSteps } from "@/components/dashboard/guided-steps";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { nextAction } from "@/lib/engine/next-action";
import { loadErrorMessage } from "@/lib/errors";
import { ReauthRequired } from "@/lib/oauth/tokens";
import { loadPortfolio, type PortfolioData } from "@/lib/portfolio";
import { requireUserId } from "@/lib/session";

/** Loads the signed-in user's portfolio and lays out the dashboard. Render inside <Suspense>. */
export async function PortfolioView() {
  const userId = await requireUserId();

  let data: PortfolioData;
  try {
    data = await loadPortfolio(userId);
  } catch (err) {
    if (err instanceof ReauthRequired) return <ReauthScreen />;
    console.error("dashboard: failed to load portfolio", err instanceof Error ? err.name : "unknown");
    return <Notice tone="error">{loadErrorMessage(err, "your portfolio")}</Notice>;
  }

  const { accounts, failed, statuses, activeRuns, etfData, exposure } = data;
  // Nothing could be read: show only why. Zeros and "you're on target" would be false.
  if (accounts.length === 0 && failed.length > 0) return <FailedAccountsNotice failed={failed} />;
  if (accounts.length === 0) {
    return (
      <EmptyState title="No brokerage accounts shared yet">
        <p className="mb-4">Connect a brokerage in the SnapTrade Dashboard, then sign in again.</p>
        <ButtonLink href="https://dashboard.snaptrade.com" external variant="secondary">
          Open SnapTrade Dashboard
        </ButtonLink>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <FailedAccountsNotice failed={failed} />
      <PortfolioSummary accounts={accounts} />
      {/* Advice from partial data could mislead (an unread account may be the one that needs attention). */}
      {failed.length === 0 && <GuidedSteps action={nextAction(accounts, statuses, activeRuns)} />}
      <AccountGrid accounts={accounts} statuses={statuses} activeRuns={activeRuns} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <AllocationPanel accounts={accounts} />
        </div>
        <div className="min-w-0 lg:col-span-2">
          <ExposurePanel exposure={exposure} etfData={etfData} />
        </div>
      </div>
    </div>
  );
}
