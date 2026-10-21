"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ErrorPage({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <div role="alert" className="mx-auto max-w-md py-12">
      <EmptyState title="Something went wrong">
        <p className="mb-4">We hit an unexpected problem. Nothing was traded unless you saw a confirmation.</p>
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
      </EmptyState>
    </div>
  );
}
