import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted sm:px-6">
        <p>Not financial advice. Review every trade before confirming.</p>
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
      </div>
    </footer>
  );
}
