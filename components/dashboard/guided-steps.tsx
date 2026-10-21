import { StepItem, type StepState } from "@/components/ui/step-item";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { NextAction } from "@/lib/engine/next-action";

const STEPS = [
  { title: "Review your portfolio", description: "See what you own below." },
  { title: "Set your targets", description: "Choose how much of each account each symbol should be." },
  { title: "Rebalance", description: "Preview the trades, confirm, and watch them fill." },
] as const;

/** Which step is highlighted for each situation. 1-based; a step before it is done, after it is upcoming. */
const CURRENT_STEP: Record<NextAction["kind"], number> = { in_progress: 3, set_targets: 2, fix_targets: 2, rebalance: 3, all_good: 4 };

const stateOf = (index: number, current: number): StepState => (index + 1 < current ? "done" : index + 1 === current ? "current" : "upcoming");

function describe(action: NextAction): { message: string; cta?: { label: string; href: string } } {
  switch (action.kind) {
    case "in_progress":
      return { message: `A rebalance for ${action.account.name} is in progress. Your orders are placed in the background, and the buys follow once the sells fill. Nothing more is needed from you.`, cta: { label: "View progress", href: `/runs/${action.runId}` } };
    case "set_targets":
      return {
        message: `Set a target allocation for ${action.account.name}${action.others > 0 ? ` (and ${action.others} more account${action.others === 1 ? "" : "s"})` : ""}. Targets say how much of the account each symbol should be; the rest stays in cash.`,
        cta: { label: "Set targets", href: `/accounts/${action.account.accountId}/targets` },
      };
    case "fix_targets":
      return { message: `The saved targets for ${action.account.name} can't be used (they add up to more than 100%).`, cta: { label: "Fix targets", href: `/accounts/${action.account.accountId}/targets` } };
    case "rebalance":
      return {
        message: `${action.account.name} has drifted from its targets${action.others > 0 ? ` (and ${action.others} more account${action.others === 1 ? "" : "s"})` : ""}. Preview the trades that bring it back; nothing is placed until you confirm.`,
        cta: { label: "Review rebalance", href: `/accounts/${action.account.accountId}/rebalance` },
      };
    case "all_good":
      return { message: "You're on target. Nothing to do right now; check back when markets move." };
  }
}

/** "What to do next": the three-step path with the current step highlighted and one clear button. */
export function GuidedSteps({ action }: { readonly action: NextAction }) {
  const current = CURRENT_STEP[action.kind];
  const { message, cta } = describe(action);
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold tracking-tight">What to do next</h2>
      <ol className="mt-4 grid gap-4 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <StepItem key={step.title} number={i + 1} title={step.title} description={step.description} state={stateOf(i, current)} />
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-subtle px-4 py-3">
        <p className="max-w-2xl text-sm">{message}</p>
        {cta && <ButtonLink href={cta.href}>{cta.label}</ButtonLink>}
      </div>
    </Card>
  );
}
