"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";

type Props = { readonly href: string; readonly label: string; /** Path prefixes that count as "inside" this section. */ readonly matches: string[] };

export function NavLink({ href, label, matches }: Props) {
  const pathname = usePathname();
  const active = matches.some((m) => pathname === m || pathname.startsWith(`${m}/`));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", active ? "bg-subtle text-ink" : "text-muted hover:text-ink")}
    >
      {label}
    </Link>
  );
}
