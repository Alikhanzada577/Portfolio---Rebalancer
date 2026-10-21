// Pure helpers for the symbol search box (no server-only imports: used by the API route and tested directly).

export type SymbolHit = {
  symbol: string; // canonical, e.g. BRK.B
  name: string;
  type: string; // human label, e.g. "ETF"
  exchange: string | null;
  /** Can this app place orders for it? Anything else is manual-only. */
  tradable: boolean;
};

type Raw = {
  symbol: string;
  description?: string | null;
  currency?: { code: string } | null;
  exchange?: { code: string } | null;
  type?: { code: string; description?: string | null; is_supported?: boolean } | null;
};

const TRADABLE_TYPES = new Set(["cs", "ad", "ps", "et"]); // stock, ADR, preferred, ETF: what execution supports

/** USD, supported instruments only; one entry per ticker; best matches first (exact ticker, ticker prefix, name prefix, name word). */
export function rankSymbols(results: Raw[], query: string, limit = 10): SymbolHit[] {
  const q = query.trim().toUpperCase().replace(/-/g, ".");
  const seen = new Set<string>();
  const scored: [number, SymbolHit][] = [];
  for (const r of results) {
    if (r.currency && r.currency.code !== "USD") continue; // v1 is USD-only
    if (r.type?.is_supported === false) continue;
    const symbol = r.symbol.trim().toUpperCase().replace(/-/g, ".");
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    const name = (r.description ?? "").toUpperCase();
    // exact ticker > ticker prefix > name starts with query > a word in the name starts with it > anything else
    const score = symbol === q ? 0 : symbol.startsWith(q) ? 1 : name.startsWith(q) ? 2 : name.split(/[\s,.]+/).some((w) => w.startsWith(q)) ? 3 : 4;
    scored.push([
      score,
      {
        symbol,
        name: r.description?.trim() || symbol,
        type: r.type?.description?.trim() || "Security",
        exchange: r.exchange?.code ?? null,
        tradable: TRADABLE_TYPES.has(r.type?.code ?? ""),
      },
    ]);
  }
  // Array.sort is stable, so equal scores keep SnapTrade's order.
  return scored.sort((a, b) => a[0] - b[0] || a[1].symbol.length - b[1].symbol.length).slice(0, limit).map(([, hit]) => hit);
}

/** Search text we're willing to send upstream: letters, digits and a few separators, 1-20 chars. */
export const SEARCH_PATTERN = /^[\w .&'-]{1,20}$/;
