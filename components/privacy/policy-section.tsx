import type { ReactNode } from "react";

export function PolicySection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-6 text-muted [&_strong]:font-medium [&_strong]:text-ink">{children}</div>
    </section>
  );
}
