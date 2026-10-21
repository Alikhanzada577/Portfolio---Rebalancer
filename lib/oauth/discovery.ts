import "server-only";
import { createRemoteJWKSet } from "jose";
import { z } from "zod";
import { env } from "@/lib/env";

const metadataSchema = z.object({
  issuer: z.string(),
  authorization_endpoint: z.url(),
  token_endpoint: z.url(),
  revocation_endpoint: z.url(),
  jwks_uri: z.url(),
});

type OidcMetadata = z.infer<typeof metadataSchema>;

let cached: Promise<{ metadata: OidcMetadata; jwks: ReturnType<typeof createRemoteJWKSet> }> | undefined;

async function load() {
  const res = await fetch(`${env.SNAPTRADE_ISSUER}/.well-known/openid-configuration`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`);
  const metadata = metadataSchema.parse(await res.json());
  if (metadata.issuer !== env.SNAPTRADE_ISSUER) throw new Error("OIDC discovery issuer mismatch");
  // One JWKS per process: jose caches keys and refetches on an unknown `kid`.
  return { metadata, jwks: createRemoteJWKSet(new URL(metadata.jwks_uri)) };
}

/** Discovery metadata + JWKS, fetched once per server instance. A failed fetch is retried next call. */
export function getOidc() {
  cached ??= load().catch((err) => {
    cached = undefined;
    throw err;
  });
  return cached;
}
