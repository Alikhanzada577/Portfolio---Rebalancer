import { NextResponse } from "next/server";
import { route, uuidParam } from "@/lib/api";
import { advanceRun } from "@/lib/rebalance/execute";

export const maxDuration = 60; // may place the buys once the sells have filled

export const GET = route<RouteContext<"/api/rebalance/[runId]/status">>(async (_req, userId, ctx) => {
  const runId = uuidParam.parse((await ctx.params).runId);
  return NextResponse.json(await advanceRun(userId, runId));
});
