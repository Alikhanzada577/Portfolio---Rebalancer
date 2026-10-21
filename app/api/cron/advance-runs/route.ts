import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { env } from "@/lib/env";
import { advanceAllRuns } from "@/lib/rebalance/advance-runs";

export const maxDuration = 60;

/**
 * Advances every rebalance run that is waiting on fills (placing buys once their sells filled), with no user
 * present. Called by a scheduler: Vercel Cron (see vercel.json) or any external pinger. Protected by CRON_SECRET.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req.headers.get("authorization"), env.CRON_SECRET)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ advanced: await advanceAllRuns() });
}
