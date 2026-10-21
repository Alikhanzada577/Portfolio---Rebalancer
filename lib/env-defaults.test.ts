import { describe, expect, it } from "vitest";
import { withDefaultBaseUrl } from "@/lib/env-defaults";

describe("withDefaultBaseUrl", () => {
  it("an explicit APP_BASE_URL wins, even on Vercel", () => {
    expect(withDefaultBaseUrl({ APP_BASE_URL: "https://app.example.com", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" }).APP_BASE_URL).toBe("https://app.example.com");
  });
  it("on Vercel it falls back to the production domain, adding https", () => {
    expect(withDefaultBaseUrl({ VERCEL_PROJECT_PRODUCTION_URL: "portfolio-rebalancer.vercel.app" }).APP_BASE_URL).toBe("https://portfolio-rebalancer.vercel.app");
  });
  it("an empty APP_BASE_URL counts as not set (Vercel keeps empty variables)", () => {
    expect(withDefaultBaseUrl({ APP_BASE_URL: "  ", VERCEL_PROJECT_PRODUCTION_URL: "a.vercel.app" }).APP_BASE_URL).toBe("https://a.vercel.app");
  });
  it("removes trailing slashes so the redirect address can't become '//api/auth/callback'", () => {
    expect(withDefaultBaseUrl({ APP_BASE_URL: "http://127.0.0.1:3000/" }).APP_BASE_URL).toBe("http://127.0.0.1:3000");
    expect(withDefaultBaseUrl({ APP_BASE_URL: "https://a.vercel.app///" }).APP_BASE_URL).toBe("https://a.vercel.app");
  });
  it("with neither set it stays unset, so validation reports the missing variable", () => {
    expect(withDefaultBaseUrl({}).APP_BASE_URL).toBeUndefined();
  });
  it("leaves every other variable untouched", () => {
    expect(withDefaultBaseUrl({ DATABASE_URL: "x", APP_BASE_URL: "http://a" }).DATABASE_URL).toBe("x");
  });
});
