import { CashRemainderRow } from "@/components/targets/cash-remainder-row";
import { TargetRow } from "@/components/targets/target-row";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { cx } from "@/lib/cx";
import type { TargetRow as Row, TargetSummary } from "@/lib/target-rows";

type Props = {
  readonly rows: Row[];
  readonly summary: TargetSummary;
  readonly currentWeights: Record<string, number>;
  /** Column title for the target: "Target %", or "Target % (total)" when targets include what ETFs hold. */
  readonly targetLabel: string;
  readonly onChange: (index: number, pct: string) => void;
  readonly onRemove: (index: number) => void;
};

export function TargetsTable({ rows, summary, currentWeights, targetLabel, onChange, onRemove }: Props) {
  return (
    <Table minWidth="28rem">
      <thead>
        <tr>
          <Th>Symbol</Th>
          <Th align="right">Now</Th>
          <Th align="right">{targetLabel}</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <TargetRow key={row.symbol} row={row} currentPct={currentWeights[row.symbol]} onChange={(pct) => onChange(i, pct)} onRemove={() => onRemove(i)} />
        ))}
        <CashRemainderRow currentPct={currentWeights.CASH} remainderPct={summary.remainder} over={summary.over} />
      </tbody>
      <tfoot>
        <Tr>
          <Td className="font-medium" colSpan={2}>
            {summary.allocated === summary.total ? "Allocated to symbols" : "Held directly (after ETFs)"}
          </Td>
          <Td align="right" className={cx("font-medium", (summary.over || summary.invalid) && "text-negative")}>
            {summary.allocated.toFixed(2)}%
          </Td>
          <Td />
        </Tr>
      </tfoot>
    </Table>
  );
}
