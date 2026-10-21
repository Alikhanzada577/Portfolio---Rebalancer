import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoryLoader } from "@/components/history/history-loader";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Order history" description="Every rebalance you've placed, with the status of each order. Queued and in-progress ones update on their own." />
      <Suspense fallback={<LoadingState label="Loading your history…" />}>
        <HistoryLoader />
      </Suspense>
    </div>
  );
}
