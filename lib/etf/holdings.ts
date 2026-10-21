import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ETF_HOLDINGS } from "@/data/etf-holdings";
import { db } from "@/lib/db/client";
import { etfHoldings } from "@/lib/db/schema";
import { env } from "@/lib/env";
import type { EtfData } from "@/lib/engine/exposure";
import { canonicalSymbol } from "@/lib/snaptrade/normalize";

const OK_TTL_MS = 24 * 60 * 60 * 1000;
const FAILED_TTL_MS = 60 * 60 * 1000; // don't burn the 25/day quota retrying a failing symbol
const SOURCE = "Alpha Vantage (ETF_PROFILE)";

const profileSchema = z.looseObject({
  last_updated: z.string().optional(),
  holdings: z.array(z.looseObject({ symbol: z.string(), weight: z.union([z.string(), z.number()]) })),
});

/** Placeholders like "n/a" are skipped; duplicate symbols (multiple listings) are summed. */
export function parseProfile(json: unknown): { asOf: string | null; constituents: Record<string, number> } | null {
  const parsed = profileSchema.safeParse(json);
  if (!parsed.success) return null; // rate-limit and error replies have no `holdings`
  const constituents: Record<string, number> = {};
  for (const h of parsed.data.holdings) {
    const weight = Number(h.weight);
    if (!Number.isFinite(weight) || weight <= 0 || /^n\/a$/i.test(h.symbol.trim())) continue;
    const sym = canonicalSymbol(h.symbol);
    constituents[sym] = (constituents[sym] ?? 0) + weight;
  }
  if (Object.keys(constituents).length === 0) return null;
  return { asOf: parsed.data.last_updated?.slice(0, 10) ?? null, constituents };
}

// The free tier rejects bursts (observed: parallel requests got a 200 with no holdings), so space calls out.
const MIN_GAP_MS = 1200;
let nextSlot = 0;
async function waitForSlot() {
  const wait = nextSlot - Date.now();
  nextSlot = Math.max(nextSlot, Date.now()) + MIN_GAP_MS;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

async function fetchProfile(symbol: string) {
  if (!env.ALPHAVANTAGE_API_KEY) return null;
  await waitForSlot();
  try {
    const url = `https://www.alphavantage.co/query?function=ETF_PROFILE&symbol=${encodeURIComponent(symbol)}&apikey=${env.ALPHAVANTAGE_API_KEY}`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    console.info(`alphavantage ETF_PROFILE ${symbol} ${res.status}`); // never log the URL: it holds the key
    if (!res.ok) return null;
    const json: unknown = await res.json();
    const profile = parseProfile(json);
    if (!profile) {
      // Log which kind of refusal it was, never the body (it may echo the key).
      const keys = typeof json === "object" && json ? Object.keys(json).join(",") : typeof json;
      console.warn(`alphavantage ETF_PROFILE ${symbol} no holdings (reply keys: ${keys})`);
    }
    return profile;
  } catch {
    console.warn(`alphavantage ETF_PROFILE ${symbol} failed`);
    return null;
  }
}

const staticFallback = (symbol: string): EtfData | undefined => {
  const s = ETF_HOLDINGS[symbol];
  return s && { asOf: "approximate", source: `${s.source}, static demo data`, constituents: s.constituents };
};

async function load(symbol: string): Promise<EtfData | undefined> {
  const [row] = await db.select().from(etfHoldings).where(eq(etfHoldings.symbol, symbol));
  const age = row ? Date.now() - row.fetchedAt.getTime() : Infinity;
  const fresh = row && age < (row.status === "ok" ? OK_TTL_MS : FAILED_TTL_MS);

  if (!fresh) {
    const profile = await fetchProfile(symbol);
    const next = profile
      ? { asOf: profile.asOf, source: SOURCE, constituents: profile.constituents, status: "ok" as const }
      : { asOf: row?.asOf ?? null, source: row?.source ?? SOURCE, constituents: row?.constituents ?? null, status: "failed" as const };
    // Only the key-less case skips the write: nothing was attempted, so nothing to back off from.
    if (env.ALPHAVANTAGE_API_KEY) {
      await db
        .insert(etfHoldings)
        .values({ symbol, ...next, fetchedAt: new Date() })
        .onConflictDoUpdate({ target: etfHoldings.symbol, set: { ...next, fetchedAt: new Date() } });
    }
    if (next.constituents) return { asOf: next.asOf ?? "unknown", source: next.source, constituents: next.constituents };
    return staticFallback(symbol);
  }
  if (row.constituents) return { asOf: row.asOf ?? "unknown", source: row.source, constituents: row.constituents };
  return staticFallback(symbol);
}

/** Look-through data per ETF symbol. Missing keys = no data anywhere (treated as opaque). */
export async function getEtfData(symbols: string[]): Promise<Record<string, EtfData | undefined>> {
  const out: Record<string, EtfData | undefined> = {};
  for (const s of new Set(symbols)) out[s] = await load(s); // sequential: see waitForSlot
  return out;
}
