import type { Metadata } from "next";
import { Suspense } from "react";
import { RebalanceLoader } from "@/components/rebalance/rebalance-loader";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Rebalance" };

export default function RebalancePage({ params }: PageProps<"/accounts/[id]/rebalance">) {
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Rebalance" description="See how far you've drifted, preview the trades, then confirm." back={{ href: "/dashboard", label: "Dashboard" }} />
      <Suspense fallback={<LoadingState label="Loading account and prices…" />}>
        <RebalanceLoader params={params} />
      </Suspense>
    </div>
  );
}
