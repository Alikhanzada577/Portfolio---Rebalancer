/** Suspense fallback shared by every page. */
export function LoadingState({ label = "Loading…" }: { readonly label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-sm text-muted">
      <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-brand" />
      {label}
    </div>
  );
}
