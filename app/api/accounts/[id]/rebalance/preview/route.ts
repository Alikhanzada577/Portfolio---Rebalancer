import { NextResponse } from "next/server";
import { route, uuidParam } from "@/lib/api";
import { createPreview } from "@/lib/rebalance/preview";

export const maxDuration = 60; // one impact check per trade, spaced 1.1s apart

export const POST = route<RouteContext<"/api/accounts/[id]/rebalance/preview">>(async (_req, userId, ctx) => {
  const accountId = uuidParam.parse((await ctx.params).id);
  return NextResponse.json(await createPreview(userId, accountId));
});
