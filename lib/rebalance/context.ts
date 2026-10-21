import "server-only";
import { ETF_HOLDINGS } from "@/data/etf-holdings";
import { CASH, type Instruments, type Targets } from "@/lib/engine/drift";
import { resolveTargets, targetedEtfs } from "@/lib/engine/exposure-targets";
import { getEtfData } from "@/lib/etf/holdings";
import type { AccountSnapshot, AssetType } from "@/lib/engine/portfolio";
import { loadAccount } from "@/lib/portfolio";
import { snaptradeFetch, SnapTradeError } from "@/lib/snaptrade/client";
import { quotesSchema } from "@/lib/snaptrade/schemas";
import { getTargets, type Settings } from "@/lib/targets";

const QUOTE_BATCH = 10; // SnapTrade's maximum per request

// SnapTrade instrument type codes -> our asset types. Anything unknown is "other" (never auto-traded).
const TYPE_CODES: Record<string, AssetType> = { cs: "equity", ad: "equity", ps: "equity", et: "etf", crypto: "crypto" };

type Quote = { id: string; price: number | null; assetType: AssetType };

/** Brokerage quotes for tickers. Failures just mean "no quote"; the plan then warns instead of guessing. */
async function fetchQuotes(userId: string, accountId: string, symbols: string[]): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  for (let i = 0; i < symbols.length; i += QUOTE_BATCH) {
    const batch = symbols.slice(i, i + QUOTE_BATCH);
    try {
      const quotes = await snaptradeFetch(userId, `/accounts/${accountId}/quotes?symbols=${encodeURIComponent(batch.join(","))}&use_ticker=true`, quotesSchema);
      for (const q of quotes) {
        const price = q.last_trade_price ?? q.ask_price ?? q.bid_price ?? null;
        out[q.symbol.symbol.toUpperCase()] = { id: q.symbol.id, price: price && price > 0 ? price : null, assetType: TYPE_CODES[q.symbol.type?.code ?? ""] ?? "other" };
      }
    } catch (err) {
      if (!(err instanceof SnapTradeError)) throw err;
    }
  }
  return out;
}

type RebalanceContext = {
  account: AccountSnapshot;
  /** Direct-holding targets the engine trades toward (already adjusted when the account is in "total exposure" mode). */
  targets: Targets;
  /** What the user saved, before any exposure adjustment. */
  savedTargets: Targets;
  /** Plain-language explanations of any adjustment, e.g. "AAPL: 20% total = 15.5% held directly + 4.5% via SPY, VOO." */
  targetNotes: string[];
  targetWarnings: string[];
  settings: Settings;
  /** Price + type for targeted symbols the account doesn't hold yet. */
  instruments: Instruments;
  /** universal_symbol_id per targeted ticker (needed for the impact check). */
  symbolIds: Record<string, string>;
};

/** Everything the engine needs, fetched fresh: snapshot, saved targets, and quotes for the targeted symbols. */
export async function loadContext(userId: string, accountId: string): Promise<RebalanceContext> {
  const [account, { targets: savedTargets, settings }] = await Promise.all([loadAccount(userId, accountId), getTargets(userId, accountId)]);
  const symbols = Object.keys(savedTargets).filter((s) => s !== CASH);
  const quotes = symbols.length ? await fetchQuotes(userId, accountId, symbols) : {};
  const held = new Set(account.holdings.map((h) => h.symbol));
  const instruments: Instruments = {};
  const symbolIds: Record<string, string> = {};
  for (const s of symbols) {
    const q = quotes[s];
    if (!q) continue;
    symbolIds[s] = q.id;
    if (!held.has(s) && q.price !== null) instruments[s] = { price: q.price, assetType: q.assetType };
  }

  // "Total exposure" mode: a stock's target counts what the targeted ETFs already hold of it, so only the rest is
  // bought directly. ETF weights are looked up only for the targeted ETFs (cached for 24h).
  let resolved = { targets: savedTargets, notes: [] as string[], warnings: [] as string[] };
  if (settings.targetMode === "exposure") {
    const heldEtfs = account.holdings.filter((h) => h.assetType === "etf").map((h) => h.symbol);
    const quotedEtfs = Object.entries(instruments).filter(([, i]) => i.assetType === "etf").map(([s]) => s);
    const etfs = targetedEtfs(savedTargets, [...heldEtfs, ...quotedEtfs], Object.keys(ETF_HOLDINGS));
    resolved = resolveTargets(savedTargets, "exposure", etfs, await getEtfData([...etfs]));
  }
  return { account, targets: resolved.targets, savedTargets, targetNotes: resolved.notes, targetWarnings: resolved.warnings, settings, instruments, symbolIds };
}
