import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  readonly title: string;
  readonly description?: string;
  readonly back?: { readonly href: string; readonly label: string };
  readonly action?: ReactNode;
};

export function PageHeader({ title, description, back, action }: Props) {
  return (
    <header className="space-y-3">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
