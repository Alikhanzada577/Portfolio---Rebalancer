"use client";

import { useId, useState } from "react";
import { SymbolOption } from "@/components/targets/symbol-option";
import { useSymbolSearch } from "@/components/targets/use-symbol-search";
import { Input } from "@/components/ui/input";
import type { SymbolHit } from "@/lib/symbols";

type Props = {
  readonly accountId: string;
  /** Tickers already in the list: shown as "added" and not selectable. */
  readonly existing: Set<string>;
  readonly onPick: (symbol: string) => void;
};

/** Combobox that only lets you add symbols the brokerage actually supports. */
export function SymbolSearch({ accountId, existing, onPick }: Props) {
  const listId = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState({ key: "", index: 0 });
  const { key, status, hits, error } = useSymbolSearch(accountId, text);

  const active = cursor.key === key ? cursor.index : 0;
  const showPanel = open && key !== "";

  const pick = (hit: SymbolHit) => {
    if (existing.has(hit.symbol)) return;
    onPick(hit.symbol);
    setText("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && hits?.length) {
      e.preventDefault();
      setCursor({ key, index: Math.min(active + 1, hits.length - 1) });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor({ key, index: Math.max(active - 1, 0) });
    } else if (e.key === "Enter" && hits?.[active]) {
      e.preventDefault();
      pick(hits[active]);
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="relative w-full max-w-sm">
      <Input
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Search for a symbol to add"
        className="w-full"
        placeholder="Search ticker or company, e.g. VOO or Apple"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} // let a click on a result register first
        onKeyDown={onKeyDown}
      />
      {showPanel && (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-surface text-sm shadow-lg">
          {status === "loading" && <p className="px-3 py-2 text-muted">Searching…</p>}
          {status === "error" && (
            <p role="alert" className="px-3 py-2 text-negative">
              {error}
            </p>
          )}
          {status === "idle" && hits?.length === 0 && <p className="px-3 py-2 text-muted">No symbols found for &ldquo;{text.trim()}&rdquo; at this brokerage.</p>}
          {status === "idle" && hits && hits.length > 0 && (
            <ul id={listId} role="listbox">
              {hits.map((hit, i) => (
                <SymbolOption key={hit.symbol} hit={hit} active={i === active} added={existing.has(hit.symbol)} onPick={() => pick(hit)} onHover={() => setCursor({ key, index: i })} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
