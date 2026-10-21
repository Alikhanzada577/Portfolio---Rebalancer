"use client";

import { toggleTheme } from "@/lib/theme";

/**
 * One button that flips light/dark. Both icons are always rendered and CSS shows the right one
 * (`dark:` variants), so there is no state to hydrate and no wrong-icon flash.
 */
export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-subtle hover:text-ink"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-[18px] dark:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
      </svg>
      <svg aria-hidden viewBox="0 0 24 24" className="hidden size-[18px] dark:block" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
