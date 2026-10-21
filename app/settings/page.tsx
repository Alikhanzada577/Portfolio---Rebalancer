import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountPanel } from "@/components/settings/account-panel";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Your SnapTrade connection." />
      <Suspense fallback={<LoadingState />}>
        <AccountPanel />
      </Suspense>
    </div>
  );
}
