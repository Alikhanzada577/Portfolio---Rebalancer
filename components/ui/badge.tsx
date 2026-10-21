import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

const TONES = {
  neutral: "bg-subtle text-muted",
  positive: "bg-positive-soft text-positive",
  caution: "bg-caution-soft text-caution",
  negative: "bg-negative-soft text-negative",
  brand: "bg-brand-soft text-brand",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({ tone = "neutral", children }: { readonly tone?: BadgeTone; readonly children: ReactNode }) {
  return <span className={cx("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone])}>{children}</span>;
}
