import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { decrypt, encrypt } from "@/lib/crypto";
import { db } from "@/lib/db/client";
import { oauthTokens } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getOidc } from "@/lib/oauth/discovery";

/** The user must go through SnapTrade sign-in again. The UI turns this into the reauth screen. */
export class ReauthRequired extends Error {
  constructor() {
    super("SnapTrade reauthorization required");
    this.name = "ReauthRequired";
  }
}

/** Token endpoint rejected a request. `code` is the OAuth error code (e.g. invalid_grant), never a token. */
export class OAuthError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(`OAuth error ${status}: ${code}`);
    this.name = "OAuthError";
  }
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().positive(),
  token_type: z.string(),
  scope: z.string(),
  id_token: z.string().optional(),
});

type TokenResponse = z.infer<typeof tokenResponseSchema>;

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

const basicAuth = () =>
  `Basic ${Buffer.from(`${env.SNAPTRADE_OAUTH_CLIENT_ID}:${env.SNAPTRADE_OAUTH_CLIENT_SECRET}`).toString("base64")}`;

async function postForm(url: string, body: Record<string, string>) {
  return fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const { metadata } = await getOidc();
  const res = await postForm(metadata.token_endpoint, body);
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code = z.object({ error: z.string() }).safeParse(json);
    console.warn(`oauth token ${body.grant_type} failed: ${res.status}`);
    throw new OAuthError(code.success ? code.data.error : "unknown_error", res.status);
  }
  return tokenResponseSchema.parse(json);
}

export function exchangeCode(code: string, codeVerifier: string, redirectUri: string) {
  return tokenRequest({ grant_type: "authorization_code", code, code_verifier: codeVerifier, redirect_uri: redirectUri });
}

const tokenRow = (userId: string, t: TokenResponse) => ({
  userId,
  accessTokenEnc: encrypt(t.access_token),
  refreshTokenEnc: encrypt(t.refresh_token),
  expiresAt: new Date(Date.now() + t.expires_in * 1000),
  scope: t.scope,
});

export async function saveTokens(userId: string, t: TokenResponse) {
  const row = tokenRow(userId, t);
  await db.insert(oauthTokens).values(row).onConflictDoUpdate({ target: oauthTokens.userId, set: row });
}

export async function deleteTokens(userId: string) {
  await db.delete(oauthTokens).where(eq(oauthTokens.userId, userId));
}

const isFresh = (expiresAt: Date) => expiresAt.getTime() - Date.now() > REFRESH_MARGIN_MS;

/**
 * A valid access token for the user, refreshing it if it expires within 5 minutes.
 * Pass `rejected` (the token that just got a 401) to force a refresh.
 */
export async function getAccessToken(userId: string, opts: { rejected?: string } = {}): Promise<string> {
  const [row] = await db.select().from(oauthTokens).where(eq(oauthTokens.userId, userId));
  if (!row) throw new ReauthRequired();
  if (!opts.rejected && isFresh(row.expiresAt)) return decrypt(row.accessTokenEnc);

  // Refresh tokens rotate: two concurrent refreshes would invalidate each other.
  // The row lock serializes them; whoever waits re-reads and reuses the winner's token.
  try {
    return await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(oauthTokens).where(eq(oauthTokens.userId, userId)).for("update");
      if (!locked) throw new ReauthRequired();
      const current = decrypt(locked.accessTokenEnc);
      if (isFresh(locked.expiresAt) && current !== opts.rejected) return current;

      const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: decrypt(locked.refreshTokenEnc) });
      await tx.update(oauthTokens).set(tokenRow(userId, t)).where(eq(oauthTokens.userId, userId));
      return t.access_token;
    });
  } catch (err) {
    if (err instanceof OAuthError && err.code === "invalid_grant") {
      await deleteTokens(userId);
      throw new ReauthRequired();
    }
    throw err;
  }
}

/** Revoke at SnapTrade (best effort), then always delete local tokens. */
export async function revokeAndDelete(userId: string) {
  const [row] = await db.select().from(oauthTokens).where(eq(oauthTokens.userId, userId));
  if (row) {
    try {
      const { metadata } = await getOidc();
      const res = await postForm(metadata.revocation_endpoint, {
        token: decrypt(row.refreshTokenEnc),
        token_type_hint: "refresh_token",
      });
      if (!res.ok) console.warn(`oauth revoke failed: ${res.status}`);
    } catch {
      console.warn("oauth revoke failed: network error");
    }
  }
  await deleteTokens(userId);
}
