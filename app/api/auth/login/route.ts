import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env, redirectUri } from "@/lib/env";
import { isCanonicalHost } from "@/lib/oauth/canonical-host";
import { addPending } from "@/lib/oauth/pending-logins";
import { getOidc } from "@/lib/oauth/discovery";
import { getSession } from "@/lib/session";

const SCOPES = "openid email read trade";

export async function GET(req: NextRequest) {
  // Wrong address (e.g. localhost): hop to the registered one BEFORE any cookie is set, or the callback can't find it.
  // (A route handler, unlike a proxy, can send an absolute redirect to the server's own configured host.)
  if (!isCanonicalHost(req.headers.get("x-forwarded-host") ?? req.headers.get("host"))) {
    return NextResponse.redirect(new URL("/api/auth/login", env.APP_BASE_URL));
  }

  const { metadata } = await getOidc();
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(64).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  const session = await getSession();
  session.logins = addPending(session.logins, { state, nonce, codeVerifier, at: Date.now() });
  await session.save();

  const url = new URL(metadata.authorization_endpoint);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: env.SNAPTRADE_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return NextResponse.redirect(url);
}
