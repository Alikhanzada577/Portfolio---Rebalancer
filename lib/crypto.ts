import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const key = Buffer.from(env.TOKEN_ENCRYPTION_KEY, "base64");

/** AES-256-GCM with a random 96-bit IV. Output: base64 `iv:ciphertext:tag`. */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv, ct, cipher.getAuthTag()].map((b) => b.toString("base64")).join(":");
}

/** Throws if the value was tampered with or encrypted under a different key. */
export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Malformed encrypted value");
  const [iv, ct, tag] = parts.map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
