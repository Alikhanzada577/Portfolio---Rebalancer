import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

type Props = { readonly label: string; readonly value: ReactNode; readonly hint?: ReactNode };

/** One headline number with its label. */
export function StatTile({ label, value, hint }: Props) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
