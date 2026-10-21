import type { Metadata } from "next";
import { Suspense } from "react";
import { TargetsLoader } from "@/components/targets/targets-loader";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Targets" };

export default function TargetsPage({ params }: PageProps<"/accounts/[id]/targets">) {
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Target allocation" description="Choose how much of this account each symbol should be." back={{ href: "/dashboard", label: "Dashboard" }} />
      <Suspense fallback={<LoadingState label="Loading account…" />}>
        <TargetsLoader params={params} />
      </Suspense>
    </div>
  );
}
