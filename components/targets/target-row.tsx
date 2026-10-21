import { Td, Tr } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { TargetRow as Row } from "@/lib/target-rows";

type Props = {
  readonly row: Row;
  /** Current share of the account in percent, undefined when not held. */
  readonly currentPct: number | undefined;
  readonly onChange: (pct: string) => void;
  readonly onRemove: () => void;
};

export function TargetRow({ row, currentPct, onChange, onRemove }: Props) {
  return (
    <Tr>
      <Td className="font-medium">{row.symbol}</Td>
      <Td align="right" className="text-muted">
        {currentPct === undefined ? (row.held ? "0.0%" : "not held") : `${currentPct.toFixed(1)}%`}
      </Td>
      <Td align="right">
        <Input numeric aria-label={`Target percent for ${row.symbol}`} value={row.pct} placeholder="—" onChange={(e) => onChange(e.target.value)} />
      </Td>
      <Td align="right" className="w-12 px-2">
        {!row.held && (
          <button type="button" aria-label={`Remove ${row.symbol}`} onClick={onRemove} className="rounded p-1 text-muted hover:bg-subtle hover:text-ink">
            ✕
          </button>
        )}
      </Td>
    </Tr>
  );
}
