import { describe, expect, it } from "vitest";
import { isCanonicalHost } from "@/lib/oauth/canonical-host";

// Test env: APP_BASE_URL = http://127.0.0.1:3000 (see vitest.config.ts)
describe("isCanonicalHost", () => {
  it("accepts the registered host and port", () => expect(isCanonicalHost("127.0.0.1:3000")).toBe(true));
  it("rejects localhost: its cookies would never reach the callback on 127.0.0.1", () => expect(isCanonicalHost("localhost:3000")).toBe(false));
  it("rejects the right host on the wrong port", () => expect(isCanonicalHost("127.0.0.1:3001")).toBe(false));
  it("rejects a lookalike host", () => expect(isCanonicalHost("127.0.0.1.evil.example:3000")).toBe(false));
  it("a missing host header is allowed (non-browser caller)", () => expect(isCanonicalHost(null)).toBe(true));
});
