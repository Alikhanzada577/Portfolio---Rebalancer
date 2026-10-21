import { timingSafeEqual } from "node:crypto";

/**
 * Checks `Authorization: Bearer <secret>` (what Vercel Cron sends when CRON_SECRET is set) in constant time.
 * No secret configured means the endpoint is disabled, never open.
 */
export function isAuthorizedCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
