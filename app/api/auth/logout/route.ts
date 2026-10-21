import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { revokeAndDelete } from "@/lib/oauth/tokens";
import { getSession } from "@/lib/session";

// Sign out and Disconnect are the same action: revoke at SnapTrade, drop tokens, end the session.
export async function POST() {
  const session = await getSession();
  if (session.userId) await revokeAndDelete(session.userId);
  session.destroy();
  return NextResponse.redirect(new URL("/", env.APP_BASE_URL), 303);
}
