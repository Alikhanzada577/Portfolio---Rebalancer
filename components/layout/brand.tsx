import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span aria-hidden className="inline-flex size-7 items-center justify-center rounded-lg bg-brand text-brand-ink">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 20V10M12 20V4M19 20v-7" />
        </svg>
      </span>
      Rebalancer
    </Link>
  );
}
