import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "@/lib/crypto";

describe("crypto", () => {
  it("round-trips", () => {
    expect(decrypt(encrypt("refresh-token-123"))).toBe("refresh-token-123");
  });

  it("uses a fresh IV per value", () => {
    const a = encrypt("same");
    const b = encrypt("same");
    expect(a).not.toBe(b);
    expect(a.split(":")[0]).not.toBe(b.split(":")[0]);
  });

  it("rejects tampered ciphertext", () => {
    const [iv, ct, tag] = encrypt("secret").split(":");
    const flipped = Buffer.from(ct, "base64");
    flipped[0] ^= 1;
    expect(() => decrypt([iv, flipped.toString("base64"), tag].join(":"))).toThrow();
  });

  it("rejects malformed input", () => {
    expect(() => decrypt("not-encrypted")).toThrow("Malformed");
  });
});
