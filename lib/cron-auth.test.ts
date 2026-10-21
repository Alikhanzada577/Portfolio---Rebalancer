import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "@/lib/cron-auth";

const secret = "s3cret-s3cret-s3cret";

describe("isAuthorizedCron", () => {
  it("accepts the exact bearer secret", () => expect(isAuthorizedCron(`Bearer ${secret}`, secret)).toBe(true));
  it("rejects a wrong secret, a missing header and other schemes", () => {
    expect(isAuthorizedCron("Bearer nope", secret)).toBe(false);
    expect(isAuthorizedCron(null, secret)).toBe(false);
    expect(isAuthorizedCron(secret, secret)).toBe(false);
    expect(isAuthorizedCron(`Basic ${secret}`, secret)).toBe(false);
  });
  it("a prefix or extension of the secret is rejected (length check before comparing)", () => {
    expect(isAuthorizedCron(`Bearer ${secret.slice(0, -1)}`, secret)).toBe(false);
    expect(isAuthorizedCron(`Bearer ${secret}x`, secret)).toBe(false);
  });
  it("with no secret configured the endpoint is disabled, even for an empty or matching-looking header", () => {
    expect(isAuthorizedCron("Bearer undefined", undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
  });
});
