import { WeightBar } from "@/components/dashboard/weight-bar";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import type { PositionRow } from "@/lib/engine/portfolio";
import { fmtPrice, fmtUnits, fmtUsd, fmtWeight } from "@/lib/format";

/** Positions with units, value and a weight bar. Weights are of total portfolio value, matching the targets screen. */
export function AllocationTable({ rows }: { readonly rows: PositionRow[] }) {
  const max = Math.max(...rows.map((r) => r.weight), 0.0001);
  return (
    <Table minWidth="30rem">
      <thead>
        <tr>
          <Th>Symbol</Th>
          <Th align="right">Units</Th>
          <Th align="right" className="hidden sm:table-cell">
            Price
          </Th>
          <Th align="right">Value</Th>
          <Th>Share of portfolio</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Tr key={row.symbol}>
            <Td>
              <span className="font-medium">{row.symbol}</span>
              <span className="ml-2 text-xs capitalize text-muted">{row.assetType}</span>
            </Td>
            <Td align="right">{fmtUnits(row.units)}</Td>
            <Td align="right" className="hidden sm:table-cell">
              {fmtPrice(row.price)}
            </Td>
            <Td align="right">{fmtUsd(row.value)}</Td>
            <Td className="min-w-40">
              <span className="flex items-center gap-3">
                <span className="flex-1">
                  <WeightBar fraction={row.weight / max} />
                </span>
                <span className="w-14 text-right text-sm tabular-nums">{fmtWeight(row.weight)}</span>
              </span>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
