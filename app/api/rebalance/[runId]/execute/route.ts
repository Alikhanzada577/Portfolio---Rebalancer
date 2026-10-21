import { after, NextResponse } from "next/server";
import { route, uuidParam } from "@/lib/api";
import { driveRun } from "@/lib/rebalance/drive-run";
import { startExecution } from "@/lib/rebalance/execute";

export const maxDuration = 300; // orders go out ~1.1s apart, then the background driver below keeps the run moving
const DRIVE_BUDGET_MS = 270_000; // stay inside maxDuration

export const POST = route<RouteContext<"/api/rebalance/[runId]/execute">>(async (_req, userId, ctx) => {
  const runId = uuidParam.parse((await ctx.params).runId);
  await startExecution(userId, runId);
  // The sells are placed. Keep going after the response so the buys follow as soon as the sells fill,
  // even if the user closes the page. (Longer waits are handled by the worker / cron.)
  after(() => driveRun(userId, runId, DRIVE_BUDGET_MS));
  return NextResponse.json({ ok: true, runId });
});
