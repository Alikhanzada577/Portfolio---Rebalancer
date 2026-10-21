import { Suspense } from "react";
import { AuthErrorNotice } from "@/components/landing/auth-error-notice";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { Hero } from "@/components/landing/hero";
import { PermissionsPanel } from "@/components/landing/permissions-panel";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="mx-auto max-w-5xl space-y-12 py-8 sm:py-12">
      <Suspense>
        <AuthErrorNotice searchParams={searchParams} />
      </Suspense>
      <Hero />
      <FeatureGrid />
      <div className="mx-auto max-w-2xl">
        <PermissionsPanel />
      </div>
    </div>
  );
}
