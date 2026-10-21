import { Table, Td, Th, Tr } from "@/components/ui/table";
import { cx } from "@/lib/cx";
import { CASH, type DriftRow } from "@/lib/engine/drift";
import { fmtPct, fmtUsd } from "@/lib/format";

type Props = { readonly rows: DriftRow[]; readonly bandPct: number; /** "Target", or "Target (direct)" when targets were adjusted for what ETFs hold. */ readonly targetLabel?: string };

/** Current vs target for every targeted row, with rows outside the drift band flagged. */
export function DriftTable({ rows, bandPct, targetLabel = "Target" }: Props) {
  return (
    <Table minWidth="34rem">
      <thead>
        <tr>
          <Th>Symbol</Th>
          <Th align="right">Current</Th>
          <Th align="right">{targetLabel}</Th>
          <Th align="right">Drift</Th>
          <Th align="right">Value</Th>
          <Th align="right">To reach target</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const breach = Math.abs(row.driftPct) > bandPct;
          return (
            <Tr key={row.symbol}>
              <Td className="font-medium">{row.symbol === CASH ? "Cash" : row.symbol}</Td>
              <Td align="right">{fmtPct(row.currentPct)}</Td>
              <Td align="right">{fmtPct(row.targetPct)}</Td>
              <Td align="right" className={cx(breach && "font-medium text-negative")}>
                {row.driftPct > 0 ? "+" : ""}
                {row.driftPct.toFixed(1)} pp{breach ? " ⚠" : ""}
              </Td>
              <Td align="right">{fmtUsd(row.currentValue)}</Td>
              <Td align="right">
                {row.diff >= 0 ? "+" : "−"}
                {fmtUsd(Math.abs(row.diff))}
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
