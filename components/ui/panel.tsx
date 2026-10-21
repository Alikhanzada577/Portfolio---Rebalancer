import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cx } from "@/lib/cx";

type Props = {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  /** Remove body padding, for full-bleed tables. */
  readonly flush?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
};

/** A titled card: the building block of every dashboard section. */
export function Panel({ title, description, action, flush, children, className }: Props) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className={cx(!flush && "p-5")}>{children}</div>
    </Card>
  );
}
