import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Props = { readonly band: string; readonly buffer: string; readonly onBand: (v: string) => void; readonly onBuffer: (v: string) => void };

export function RiskSettings({ band, buffer, onBand, onBuffer }: Props) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Drift band (%)" hint="Trades are only suggested once a holding is more than this many percentage points from its target. Then every targeted holding is brought back to target.">
        <Input numeric value={band} onChange={(e) => onBand(e.target.value)} />
      </Field>
      <Field label="Cash buffer (%)" hint="Share of the account kept in cash and not spent on buys, to cover price moves and fees.">
        <Input numeric value={buffer} onChange={(e) => onBuffer(e.target.value)} />
      </Field>
    </div>
  );
}
