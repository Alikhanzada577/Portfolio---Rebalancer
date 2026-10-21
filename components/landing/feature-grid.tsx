import { FeatureCard } from "@/components/landing/feature-card";

export function FeatureGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <FeatureCard step="1" title="See what you really own">
        Combine every account and look through ETFs to find your true exposure, like the Apple you hold directly and inside your index fund.
      </FeatureCard>
      <FeatureCard step="2" title="Set your targets">
        Pick the share each symbol should have per account. Whatever you don&apos;t allocate stays in cash.
      </FeatureCard>
      <FeatureCard step="3" title="Rebalance with confidence">
        Review every order with its estimated fees, confirm, and watch sells and buys fill. Nothing trades without your say-so.
      </FeatureCard>
    </div>
  );
}
