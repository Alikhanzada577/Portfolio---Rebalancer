import type { Metadata } from "next";
import { Suspense } from "react";
import { PortfolioView } from "@/components/dashboard/portfolio-view";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Portfolio" description="Your accounts, allocation and true exposure in one place." />
      <Suspense fallback={<LoadingState label="Loading your portfolio…" />}>
        <PortfolioView />
      </Suspense>
    </div>
  );
}
