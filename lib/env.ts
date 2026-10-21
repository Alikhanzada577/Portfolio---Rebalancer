import "server-only";
import { z } from "zod";

const schema = z.object({
  SNAPTRADE_OAUTH_CLIENT_ID: z.string().min(1),
  SNAPTRADE_OAUTH_CLIENT_SECRET: z.string().min(1),
  SNAPTRADE_ISSUER: z.url(),
  APP_BASE_URL: z.url(),
  OAUTH_REDIRECT_PATH: z.string().startsWith("/"),
  SESSION_PASSWORD: z.string().min(32),
  TOKEN_ENCRYPTION_KEY: z
    .base64()
    .refine((k) => Buffer.from(k, "base64").length === 32, "must decode to 32 bytes"),
  DATABASE_URL: z.url(),
  // Optional: authorizes the scheduler that advances rebalance runs in the background (/api/cron/advance-runs).
  // Without it that endpoint is disabled. Generate with: openssl rand -base64 24
  CRON_SECRET: z
    .string()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => v === undefined || v.length >= 16, "must be at least 16 characters"),
  // Optional: without it, ETF look-through falls back to the static approximate table.
  ALPHAVANTAGE_API_KEY: z
    .string()
    .optional()
    .transform((v) => v || undefined),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Only key names and rule messages, never values.
  const problems = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${problems}`);
}

export const env = parsed.data;
export const redirectUri = env.APP_BASE_URL + env.OAUTH_REDIRECT_PATH;
