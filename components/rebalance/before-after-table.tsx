import { Table, Td, Th, Tr } from "@/components/ui/table";
import { CASH } from "@/lib/engine/drift";
import type { RebalancePlan } from "@/lib/engine/trades";
import { fmtPct, fmtUsd } from "@/lib/format";

export function BeforeAfterTable({ plan }: { readonly plan: RebalancePlan }) {
  const after = new Map(plan.after.map((a) => [a.symbol, a.pct]));
  const hasCashRow = plan.rows.some((r) => r.symbol === CASH);
  return (
    <Table minWidth="26rem">
      <thead>
        <tr>
          <Th>Symbol</Th>
          <Th align="right">Before</Th>
          <Th align="right">After (est.)</Th>
          <Th align="right">Target</Th>
        </tr>
      </thead>
      <tbody>
        {plan.rows.map((row) => (
          <Tr key={row.symbol}>
            <Td className="font-medium">{row.symbol === CASH ? "Cash" : row.symbol}</Td>
            <Td align="right">{fmtPct(row.currentPct)}</Td>
            <Td align="right">{fmtPct(after.get(row.symbol) ?? row.currentPct)}</Td>
            <Td align="right">{fmtPct(row.targetPct)}</Td>
          </Tr>
        ))}
        {!hasCashRow && (
          <Tr>
            <Td className="font-medium">Cash left over</Td>
            <Td />
            <Td align="right">{fmtUsd(plan.leftoverCash)}</Td>
            <Td />
          </Tr>
        )}
      </tbody>
    </Table>
  );
}
