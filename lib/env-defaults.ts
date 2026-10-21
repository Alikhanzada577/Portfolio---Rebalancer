type Env = Record<string, string | undefined>;

/**
 * Fills in APP_BASE_URL when it isn't set. On Vercel the project's stable production domain is known up front as
 * VERCEL_PROJECT_PRODUCTION_URL (host only, no protocol), so the first deploy doesn't need the address typed in
 * by hand. An explicit APP_BASE_URL always wins. Trailing slashes are removed: the OAuth redirect address
 * (APP_BASE_URL + OAUTH_REDIRECT_PATH) must match the one registered with SnapTrade exactly.
 */
export function withDefaultBaseUrl(env: Env): Env {
  const explicit = env.APP_BASE_URL?.trim();
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const base = explicit || (vercel ? `https://${vercel}` : undefined);
  return { ...env, APP_BASE_URL: base?.replace(/\/+$/, "") };
}
