import type { ReactNode } from "react";

type Props = { readonly label: string; readonly hint: string; readonly children: ReactNode };

/** A labelled input with a one-line explanation underneath. */
export function Field({ label, hint, children }: Props) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <span className="block">{children}</span>
      <span className="block text-xs text-muted">{hint}</span>
    </label>
  );
}
