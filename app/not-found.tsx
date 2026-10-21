import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-12">
      <EmptyState title="Page not found">
        <p className="mb-4">That page doesn&apos;t exist, or it isn&apos;t one of your accounts.</p>
        <ButtonLink href="/dashboard" variant="secondary">
          Go to dashboard
        </ButtonLink>
      </EmptyState>
    </div>
  );
}
