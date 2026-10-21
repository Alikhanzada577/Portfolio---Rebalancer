import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

const VARIANTS = {
  primary: "bg-brand text-brand-ink hover:opacity-90",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-subtle",
  danger: "border border-negative/40 bg-surface text-negative hover:bg-negative-soft",
  ghost: "text-muted hover:bg-subtle hover:text-ink",
} as const;

const SIZES = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" } as const;

type StyleProps = { readonly variant?: keyof typeof VARIANTS; readonly size?: keyof typeof SIZES };

const buttonClass = ({ variant = "primary", size = "md" }: StyleProps = {}) =>
  cx("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40", VARIANTS[variant], SIZES[size]);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleProps;

export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={cx(buttonClass({ variant, size }), className)} {...rest} />;
}

type LinkProps = StyleProps & { readonly href: string; readonly children: ReactNode; readonly external?: boolean };

/** A link that looks like a button. Plain <a> for external or server-redirect targets. */
export function ButtonLink({ href, children, variant, size, external }: LinkProps) {
  const className = buttonClass({ variant, size });
  return external ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
