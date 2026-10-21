import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { env, redirectUri } from "@/lib/env";
import { getOidc } from "@/lib/oauth/discovery";
import { takePending } from "@/lib/oauth/pending-logins";
import { exchangeCode, OAuthError, saveTokens } from "@/lib/oauth/tokens";
import { getSession } from "@/lib/session";

const claimsSchema = z.object({
  sub: z.string().min(1),
  nonce: z.string(),
  email: z.string().optional(),
  email_verified: z.boolean().optional(),
});

// Error reasons are shown on the landing page (components/landing/auth-error-notice.tsx).
// Only the reason code is logged, never a state, code or token.
const fail = (reason: string) => {
  console.warn(`auth callback rejected: ${reason}`);
  return NextResponse.redirect(new URL(`/?auth_error=${reason}`, env.APP_BASE_URL));
};

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const session = await getSession();
  // Find THIS attempt by its state and consume it up front (single use): whatever happens next, it can't be
  // replayed. Other pending attempts (a second tab, an earlier click) are left alone so they can still finish.
  const { login, rest } = takePending(session.logins, params.get("state"));
  session.logins = rest;
  await session.save();

  const error = params.get("error");
  if (error) return fail(error === "access_denied" ? "denied" : "provider_error");

  if (!login) {
    // A repeated callback (browser retry, double navigation) after a successful sign-in is harmless: no token
    // exchange happens here, so just continue to the app instead of showing an error.
    if (session.userId) return NextResponse.redirect(new URL("/dashboard", env.APP_BASE_URL));
    // No pending attempt at all: the cookie never arrived (different address or browser, blocked cookies, expiry).
    // Other attempts pending: this one was replaced or is unknown.
    return fail(rest.length === 0 ? "session_lost" : "state_mismatch");
  }
  const code = params.get("code");
  if (!code) return fail("provider_error");

  const { metadata, jwks } = await getOidc();
  // RFC 9207: SnapTrade sends `iss` on the callback; when present it must be our issuer.
  const iss = params.get("iss");
  if (iss && iss !== metadata.issuer) return fail("provider_error");

  let tokens;
  try {
    tokens = await exchangeCode(code, login.codeVerifier, redirectUri);
  } catch (err) {
    // invalid_grant here means the code expired or was already used.
    return fail(err instanceof OAuthError && err.code === "invalid_grant" ? "code_expired" : "exchange_failed");
  }
  if (!tokens.id_token) return fail("id_token_invalid");

  let claims;
  try {
    const { payload } = await jwtVerify(tokens.id_token, jwks, {
      issuer: metadata.issuer,
      audience: env.SNAPTRADE_OAUTH_CLIENT_ID,
      algorithms: ["RS256"],
      maxTokenAge: "10m", // rejects an implausibly old `iat`
      clockTolerance: "30s",
    });
    claims = claimsSchema.parse(payload);
  } catch {
    return fail("id_token_invalid");
  }
  if (claims.nonce !== login.nonce) return fail("id_token_invalid");

  // Keyed on `sub`. email_verified is stored so any future email-based linking can require it.
  const profile = { email: claims.email ?? null, emailVerified: claims.email_verified ?? false };
  await db.insert(users).values({ id: claims.sub, ...profile }).onConflictDoUpdate({ target: users.id, set: profile });
  await saveTokens(claims.sub, tokens);

  session.userId = claims.sub;
  await session.save();
  return NextResponse.redirect(new URL("/dashboard", env.APP_BASE_URL));
}
