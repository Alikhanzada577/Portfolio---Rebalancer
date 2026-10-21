import { Suspense } from "react";
import { Brand } from "@/components/layout/brand";
import { SessionLink } from "@/components/layout/session-link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Brand />
        <div className="ml-4 flex items-center gap-1">
          <Suspense fallback={null}>
            <SessionLink href="/dashboard" label="Dashboard" matches={["/dashboard", "/accounts"]} />
          </Suspense>
          <Suspense fallback={null}>
            <SessionLink href="/history" label="History" matches={["/history", "/runs"]} />
          </Suspense>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Suspense fallback={null}>
            <SessionLink href="/settings" label="Settings" matches={["/settings"]} />
          </Suspense>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
