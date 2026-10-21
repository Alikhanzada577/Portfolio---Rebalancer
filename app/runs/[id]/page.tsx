import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RunStatus } from "@/components/run/run-status";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { uuidParam } from "@/lib/api";
import { requireUserId } from "@/lib/session";

export const metadata: Metadata = { title: "Rebalance status" };

async function Run({ params }: { readonly params: PageProps<"/runs/[id]">["params"] }) {
  await requireUserId();
  const parsed = uuidParam.safeParse((await params).id);
  if (!parsed.success) notFound();
  return <RunStatus runId={parsed.data} />;
}

export default function RunPage({ params }: PageProps<"/runs/[id]">) {
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Rebalance status" description="Orders are tracked until they fill." back={{ href: "/dashboard", label: "Dashboard" }} />
      <Suspense fallback={<LoadingState />}>
        <Run params={params} />
      </Suspense>
    </div>
  );
}
