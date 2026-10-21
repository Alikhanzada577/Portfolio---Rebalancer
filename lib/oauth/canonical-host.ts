import { env } from "@/lib/env";

/**
 * True when the request arrived on the host registered with SnapTrade as the OAuth redirect host (APP_BASE_URL).
 *
 * Cookies are per host. A sign-in started on http://localhost:3000 stores its pending state under `localhost`, but
 * SnapTrade returns the browser to http://127.0.0.1:3000, which never saw that cookie, so the callback fails every
 * time. Starting sign-in only on the canonical host keeps cookie and callback on one host.
 * A missing host header (non-browser caller) is treated as fine.
 */
export const isCanonicalHost = (host: string | null) => !host || host === new URL(env.APP_BASE_URL).host;
