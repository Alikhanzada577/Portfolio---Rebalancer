import { cx } from "@/lib/cx";
import type { SymbolHit } from "@/lib/symbols";

type Props = { readonly hit: SymbolHit; readonly active: boolean; readonly added: boolean; readonly onPick: () => void; readonly onHover: () => void };

export function SymbolOption({ hit, active, added, onPick, onHover }: Props) {
  return (
    <li
      role="option"
      aria-selected={active}
      aria-disabled={added}
      onMouseDown={(e) => e.preventDefault()} // keep focus in the input so the click registers
      onClick={onPick}
      onMouseEnter={onHover}
      className={cx("flex cursor-pointer items-baseline gap-3 px-3 py-2", active && "bg-subtle", added && "cursor-default opacity-50")}
    >
      <span className="w-16 shrink-0 font-medium">{hit.symbol}</span>
      <span className="min-w-0 flex-1 truncate">{hit.name}</span>
      <span className="shrink-0 text-xs text-muted">
        {added ? "added" : hit.type}
        {!added && !hit.tradable && " · manual only"}
      </span>
    </li>
  );
}
