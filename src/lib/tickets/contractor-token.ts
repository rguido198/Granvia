import { randomBytes, createHash } from "crypto";

/**
 * Pure crypto helper for contractor execution links (no server-only guard).
 * Plaintext token exists only in the generated URL; database stores SHA-256 hash.
 */

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}
