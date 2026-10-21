import { cx } from "@/lib/cx";

export type StepState = "done" | "current" | "upcoming";

type Props = { readonly number: number; readonly title: string; readonly description: string; readonly state: StepState };

/** One step of the guided path: a numbered (or ticked) marker with its title and a one-line explanation. */
export function StepItem({ number, title, description, state }: Props) {
  return (
    <li className="flex gap-3" aria-current={state === "current" ? "step" : undefined}>
      <span
        aria-hidden
        className={cx(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          state === "done" && "bg-positive-soft text-positive",
          state === "current" && "bg-brand text-brand-ink",
          state === "upcoming" && "bg-subtle text-muted",
        )}
      >
        {state === "done" ? "✓" : number}
      </span>
      <span>
        <span className={cx("block text-sm font-medium", state === "upcoming" && "text-muted")}>
          {title}
          <span className="sr-only"> ({state})</span>
        </span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
    </li>
  );
}
