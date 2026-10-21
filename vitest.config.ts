import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // Next resolves this internally; outside Next it would throw on import.
      "server-only": fileURLToPath(new URL("./node_modules/next/dist/compiled/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    // Fake values so modules that import lib/env load in tests. Not real credentials.
    env: {
      SNAPTRADE_OAUTH_CLIENT_ID: "test-client",
      SNAPTRADE_OAUTH_CLIENT_SECRET: "test-secret",
      SNAPTRADE_ISSUER: "https://api.snaptrade.com",
      APP_BASE_URL: "http://127.0.0.1:3000",
      OAUTH_REDIRECT_PATH: "/api/auth/callback",
      SESSION_PASSWORD: "x".repeat(32),
      TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      DATABASE_URL: "postgres://test:test@localhost:5432/test",
    },
  },
});
