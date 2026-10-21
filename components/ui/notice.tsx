import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

const TONES = {
  info: "border-line bg-subtle text-ink",
  warning: "border-caution/30 bg-caution-soft text-caution",
  error: "border-negative/30 bg-negative-soft text-negative",
} as const;

type Props = { readonly tone?: keyof typeof TONES; readonly children: ReactNode; readonly className?: string };

/** An inline message. Errors are announced to screen readers. */
export function Notice({ tone = "info", children, className }: Props) {
  return (
    <div role={tone === "error" ? "alert" : undefined} className={cx("rounded-lg border px-4 py-3 text-sm", TONES[tone], className)}>
      {children}
    </div>
  );
}
