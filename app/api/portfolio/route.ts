import { NextResponse } from "next/server";
import { loadPortfolio } from "@/lib/portfolio";
import { ReauthRequired } from "@/lib/oauth/tokens";
import { getSession } from "@/lib/session";

export async function GET() {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    return NextResponse.json(await loadPortfolio(userId));
  } catch (err) {
    if (err instanceof ReauthRequired) return NextResponse.json({ error: "reauth_required" }, { status: 401 });
    console.error("portfolio: load failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "portfolio_unavailable" }, { status: 502 });
  }
}
