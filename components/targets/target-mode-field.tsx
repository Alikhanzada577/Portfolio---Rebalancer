import type { TargetMode } from "@/lib/engine/exposure-targets";

const OPTIONS: { value: TargetMode; title: string; description: string }[] = [
  { value: "direct", title: "Direct holdings", description: "A target is the share of the account you hold in that symbol itself." },
  {
    value: "exposure",
    title: "Total exposure",
    description: "For a stock, a target is its total share of the account, counting what your ETFs already hold of it. Apple 20% then means 20% Apple overall, so less is bought directly.",
  },
];

type Props = { readonly value: TargetMode; readonly onChange: (mode: TargetMode) => void };

/** The one setting that changes what every number on this page means, so it gets its own clearly worded control. */
export function TargetModeField({ value, onChange }: Props) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">What a target percentage means</legend>
      {OPTIONS.map((option) => (
        <label
          key={option.value}
          className={`flex cursor-pointer gap-3 rounded-lg border p-4 text-sm transition-colors ${value === option.value ? "border-brand bg-brand-soft" : "border-line hover:bg-subtle"}`}
        >
          <input type="radio" name="target-mode" className="mt-1 accent-[var(--brand)]" checked={value === option.value} onChange={() => onChange(option.value)} />
          <span>
            <span className="block font-medium">{option.title}</span>
            <span className="mt-1 block text-xs text-muted">{option.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
