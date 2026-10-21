import { NextResponse } from "next/server";
import { AccountNotFoundError } from "@/lib/portfolio";
import { route, uuidParam } from "@/lib/api";
import { snaptradeFetch, SnapTradeError } from "@/lib/snaptrade/client";
import { symbolSearchSchema } from "@/lib/snaptrade/schemas";
import { rankSymbols, SEARCH_PATTERN } from "@/lib/symbols";
import { z } from "zod";

const query = z.string().trim().regex(SEARCH_PATTERN, "Search with a ticker or company name (up to 20 characters).");

/** Symbol search limited to what this account's brokerage supports. Ownership is enforced by SnapTrade itself (a foreign account id is a 404). */
export const GET = route<RouteContext<"/api/accounts/[id]/symbols">>(async (req, userId, ctx) => {
  const accountId = uuidParam.parse((await ctx.params).id);
  const q = query.parse(new URL(req.url).searchParams.get("q") ?? "");
  try {
    const results = await snaptradeFetch(userId, `/accounts/${accountId}/symbols`, symbolSearchSchema, { method: "POST", body: { substring: q } });
    return NextResponse.json({ results: rankSymbols(results, q) });
  } catch (err) {
    if (err instanceof SnapTradeError && err.status === 404) throw new AccountNotFoundError();
    throw err;
  }
});
