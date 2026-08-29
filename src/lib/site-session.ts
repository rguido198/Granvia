export const SITE_ACCESS_COOKIE = "granvia_site_access";
export const PRIVATE_GATE_PATH = "/acceso-privado";

// No fallback values — a missing secret means the gate fails closed (no one
// can pass it, on any environment) rather than silently accepting a
// well-known default password. Both must be set for the private gate to
// grant access at all; see .env.example.
const SITE_PASSWORD = process.env.SITE_PASSWORD;
const SITE_SESSION_SECRET = process.env.SITE_SESSION_SECRET;

const SITE_ACCESS_MARKER = "granted";

// Cookie's `maxAge` (site-auth/route.ts) only tells a compliant browser when
// to discard it — it's not enforced server-side. This is the value actually
// checked on every request, via the expiry embedded in the signed payload.
export const SITE_ACCESS_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function siteAuthConfigured(): boolean {
  return Boolean(SITE_PASSWORD && SITE_SESSION_SECRET);
}

export function checkSitePassword(candidate: string): boolean {
  if (!SITE_PASSWORD) return false;
  return candidate.trim() === SITE_PASSWORD;
}

// Web Crypto (crypto.subtle) rather than node:crypto — this module runs on
// both the edge runtime (site-auth/route.ts) and in middleware.ts, neither
// of which can rely on Node's crypto module.
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * A signed, self-expiring cookie value:
 *   granted.<expiresAtEpochSeconds>.<passwordFingerprint>.<hmac>
 *
 * - The HMAC covers the expiry, so a client can't extend its own session by
 *   editing the timestamp — any change invalidates the signature.
 * - passwordFingerprint (sha256 of the current SITE_PASSWORD) is part of
 *   what's signed. Rotating SITE_PASSWORD alone — without also touching
 *   SITE_SESSION_SECRET — changes the fingerprint every future verify call
 *   recomputes against, so every previously-issued cookie stops verifying
 *   the moment the password changes. Rotating SITE_SESSION_SECRET still
 *   invalidates everything too, as before.
 */
export async function signSiteAccessCookie(
  maxAgeSeconds: number = SITE_ACCESS_MAX_AGE_SECONDS,
): Promise<string | null> {
  if (!SITE_SESSION_SECRET || !SITE_PASSWORD) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const passwordFingerprint = await sha256Hex(SITE_PASSWORD);
  const payload = `${SITE_ACCESS_MARKER}.${expiresAt}.${passwordFingerprint}`;
  const signature = await hmacSha256Hex(SITE_SESSION_SECRET, payload);
  return `${payload}.${signature}`;
}

export async function verifySiteAccessCookie(value: string | undefined): Promise<boolean> {
  if (!value || !SITE_SESSION_SECRET || !SITE_PASSWORD) return false;

  const parts = value.split(".");
  if (parts.length !== 4) return false;
  const [marker, expiresAtRaw, passwordFingerprint, signature] = parts;
  if (marker !== SITE_ACCESS_MARKER) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;

  const payload = `${marker}.${expiresAtRaw}.${passwordFingerprint}`;
  const expectedSignature = await hmacSha256Hex(SITE_SESSION_SECRET, payload);
  if (!timingSafeEqual(signature, expectedSignature)) return false;

  const expectedFingerprint = await sha256Hex(SITE_PASSWORD);
  return timingSafeEqual(passwordFingerprint, expectedFingerprint);
}
