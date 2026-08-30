import { describe, it, expect } from "vitest";
import { generateToken, hashToken } from "./contractor-token";

describe("contractor-token utility", () => {
  it("generates 64-character hex tokens", () => {
    const token = generateToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces deterministic SHA-256 hashes for the same token", () => {
    const token = generateToken();
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different hashes for different tokens", () => {
    const token1 = generateToken();
    const token2 = generateToken();
    expect(hashToken(token1)).not.toBe(hashToken(token2));
  });
});
