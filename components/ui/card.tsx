import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type Props = { readonly children: ReactNode; readonly className?: string };

/** The standard surface: bordered, rounded, with a soft shadow in light mode. */
export function Card({ children, className }: Props) {
  return <div className={cx("rounded-xl border border-line bg-surface shadow-card", className)}>{children}</div>;
}
