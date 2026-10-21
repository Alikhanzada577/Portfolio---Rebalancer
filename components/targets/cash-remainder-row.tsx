import { Td, Tr } from "@/components/ui/table";

type Props = { readonly currentPct: number | undefined; readonly remainderPct: number; readonly over: boolean };

/** Cash is never typed: it's whatever the symbol targets leave over. */
export function CashRemainderRow({ currentPct, remainderPct, over }: Props) {
  return (
    <Tr className="bg-subtle">
      <Td className="font-medium">
        Cash <span className="font-normal text-muted">(the rest)</span>
      </Td>
      <Td align="right" className="text-muted">
        {(currentPct ?? 0).toFixed(1)}%
      </Td>
      <Td align="right" className={over ? "text-muted" : "font-medium"}>
        {over ? "—" : `${remainderPct.toFixed(2)}%`}
      </Td>
      <Td />
    </Tr>
  );
}
