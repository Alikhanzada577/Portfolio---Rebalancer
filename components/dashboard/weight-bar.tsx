/** A thin proportional bar. `fraction` is 0-1 relative to the largest row in the list. */
export function WeightBar({ fraction }: { readonly fraction: number }) {
  return (
    <span aria-hidden className="block h-1.5 w-full rounded-full bg-subtle">
      <span className="block h-1.5 rounded-full bg-brand" style={{ width: `${Math.max(2, Math.min(1, fraction) * 100)}%` }} />
    </span>
  );
}
