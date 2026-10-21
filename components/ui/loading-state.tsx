/** Suspense fallback shared by every page: centred in the space under the page title, spinner above the label. */
export function LoadingState({ label = "Loading…" }: { readonly label?: string }) {
  return (
    <div role="status" className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-sm text-muted">
      <span aria-hidden className="size-8 animate-spin rounded-full border-[3px] border-line-strong border-t-brand" />
      {label}
    </div>
  );
}
