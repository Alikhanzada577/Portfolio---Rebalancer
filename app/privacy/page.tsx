import type { Metadata } from "next";
import { PolicySection } from "@/components/privacy/policy-section";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Privacy" };

const list = "list-disc space-y-1.5 pl-5";

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl space-y-8">
      <PageHeader title="Privacy" description="What we read, what we store, and how to remove it." />

      <PolicySection title="What we read from SnapTrade, and why">
        <ul className={list}>
          <li>
            <strong>Your SnapTrade user ID and email</strong> (sign-in and email permissions): to recognise you when you return. We have no passwords of our own.
          </li>
          <li>
            <strong>Accounts, balances and positions</strong> (read permission): to show your holdings, allocation and drift, and to calculate the trades needed to reach your targets.
          </li>
          <li>
            <strong>Prices and order impact</strong> for the symbols you target: to size trades and show estimated fees.
          </li>
          <li>
            <strong>Order status</strong>: to show whether orders you confirmed have filled.
          </li>
        </ul>
        <p>Orders are placed (trade permission) only after you review a preview and press confirm. We never trade without that explicit step.</p>
      </PolicySection>

      <PolicySection title="What we store">
        <ul className={list}>
          <li>Your SnapTrade user ID, email and whether it is verified.</li>
          <li>
            Your SnapTrade access and refresh tokens, <strong>encrypted at rest</strong> (AES-256-GCM). They are only ever used on our server and never sent to your browser.
          </li>
          <li>Your target allocations and settings, and a record of each rebalance preview and its orders.</li>
          <li>A temporary, encrypted session cookie that keeps you signed in, and your light/dark choice in your browser.</li>
        </ul>
        <p>We keep a short-lived cache of public ETF holdings weights. It contains no data about you.</p>
      </PolicySection>

      <PolicySection title="What we don't do">
        <p>We don&apos;t sell or share your data, show ads, or use it for anything other than the features above. The only third parties involved are SnapTrade (your brokerage data and orders) and Alpha Vantage (public ETF holdings, no personal data sent).</p>
      </PolicySection>

      <PolicySection title="Disconnecting">
        <p>
          Open{" "}
          <a className="font-medium text-brand underline" href="/settings">
            Settings
          </a>{" "}
          and choose <em>Disconnect</em>. That revokes this app&apos;s access at SnapTrade and deletes our stored tokens immediately. You can also manage or revoke app access from your{" "}
          <a className="font-medium text-brand underline" href="https://dashboard.snaptrade.com">
            SnapTrade Dashboard
          </a>
          . Your brokerage connections themselves are not affected.
        </p>
      </PolicySection>

      <p className="text-xs text-muted">Rebalancer is a demo project. Not financial advice. Review every trade before confirming.</p>
    </article>
  );
}
