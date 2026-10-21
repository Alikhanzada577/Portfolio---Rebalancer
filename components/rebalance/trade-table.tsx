import { Table, Td, Th, Tr } from "@/components/ui/table";
import { cx } from "@/lib/cx";
import type { Trade } from "@/lib/engine/trades";
import { fmtUnits, fmtUsd } from "@/lib/format";
import { feeOf } from "@/lib/rebalance/fees";
import { impactKey, type StoredPlan } from "@/lib/rebalance/types";

type Props = { readonly trades: Trade[]; readonly impact: StoredPlan["impact"] };

export function TradeTable({ trades, impact }: Props) {
  return (
    <Table minWidth="34rem">
      <thead>
        <tr>
          <Th>Side</Th>
          <Th>Symbol</Th>
          <Th align="right">Units</Th>
          <Th align="right">Est. price</Th>
          <Th align="right">Est. value</Th>
          <Th align="right">Est. fees</Th>
        </tr>
      </thead>
      <tbody>
        {trades.map((trade) => {
          const fee = trade.executable ? feeOf(impact[impactKey(trade.side, trade.symbol)]) : null;
          return (
            <Tr key={`${trade.side}:${trade.symbol}`}>
              <Td className={cx("font-medium", trade.side === "buy" ? "text-positive" : "text-negative")}>{trade.side === "buy" ? "Buy" : "Sell"}</Td>
              <Td className="font-medium">
                {trade.symbol}
                {!trade.executable && <span className="ml-2 text-xs font-normal text-muted">manual</span>}
              </Td>
              <Td align="right">{fmtUnits(trade.units)}</Td>
              <Td align="right">{fmtUsd(trade.price)}</Td>
              <Td align="right">{fmtUsd(trade.estValue)}</Td>
              <Td align="right">{!trade.executable ? "—" : fee === null ? <span className="text-muted">Not available</span> : fmtUsd(fee)}</Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
