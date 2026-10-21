import type { InputHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

type Props = InputHTMLAttributes<HTMLInputElement> & { readonly numeric?: boolean };

export function Input({ numeric, className, ...rest }: Props) {
  return (
    <input
      inputMode={numeric ? "decimal" : undefined}
      className={cx(
        "rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm placeholder:text-muted/70 focus:border-brand",
        numeric && "w-24 text-right tabular-nums",
        className,
      )}
      {...rest}
    />
  );
}
