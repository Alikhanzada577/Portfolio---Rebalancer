import { Table, Td, Th, Tr } from "@/components/ui/table";
import { cx } from "@/lib/cx";
import { fmtUnits, fmtUsd } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/rebalance/status";
import type { QueuedOrder, RunOrder } from "@/lib/rebalance/types";

const FAILED = new Set(["FAILED", "REJECTED", "CANCELED", "EXPIRED"]);

const tone = (status: string) => (status === "EXECUTED" ? "text-positive" : FAILED.has(status) ? "text-negative" : "text-muted");

type Props = { readonly orders: RunOrder[]; readonly queued: QueuedOrder[]; readonly submitting: boolean };

export function OrdersTable({ orders, queued, submitting }: Props) {
  return (
    <Table minWidth="20rem">
      <thead>
        <tr>
          <Th>Order</Th>
          <Th align="right">Units</Th>
          <Th align="right" className="hidden sm:table-cell">
            Est. value
          </Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {orders.length === 0 && queued.length === 0 && (
          <Tr>
            <Td colSpan={4} className="text-muted">
              {submitting ? "Submitting orders…" : "No orders were placed."}
            </Td>
          </Tr>
        )}
        {orders.map((order) => (
          <Tr key={order.id} className="align-top">
            <Td className="font-medium">
              {order.side === "buy" ? "Buy" : "Sell"} {order.symbol}
            </Td>
            <Td align="right">{fmtUnits(order.units)}</Td>
            <Td align="right" className="hidden sm:table-cell">
              {fmtUsd(order.estValue)}
            </Td>
            <Td className={cx("font-medium", tone(order.status))}>
              {order.status === "pending" ? "Submitting…" : (STATUS_LABEL[order.status] ?? order.status)}
              {order.error && <span className="block text-xs font-normal">{order.error}</span>}
            </Td>
          </Tr>
        ))}
        {queued.map((order) => (
          <Tr key={`queued:${order.side}:${order.symbol}`} className="align-top">
            <Td className="font-medium text-muted">
              {order.side === "buy" ? "Buy" : "Sell"} {order.symbol}
            </Td>
            <Td align="right" className="text-muted">
              {fmtUnits(order.units)}
            </Td>
            <Td align="right" className="hidden text-muted sm:table-cell">
              {fmtUsd(order.estValue)}
            </Td>
            <Td className="text-muted">
              Queued
              <span className="block text-xs font-normal">Placed automatically once the sells fill</span>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
