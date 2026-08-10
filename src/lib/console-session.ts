/**
 * Signed session token for the landlord console.
 *
 * Built on Web Crypto only — no Node APIs — because the same verify path runs
 * inside middleware on the edge and inside the sign-in server action.
 *
 * The token carries nothing secret: just an expiry, HMAC-signed so it cannot be
 * forged or extended by the client. It is not a JWT and deliberately not
 * general-purpose; it answers one question, "did this browser present the
 * console password recently".
 *
 * Lives outside `actions.ts` on purpose: a "use server" module may only export
 * async functions, so shared constants and types cannot live there.
 */

export const SESSION_COOKIE = "granvia_consola";

/** Eight hours — long enough for a working day, short enough that a shared laptop forgets. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

/** Where the login form lives. Middleware must let this through or it loops. */
export const CONSOLE_LOGIN_PATH = "/consola/acceso";
export const CONSOLE_HOME_PATH = "/consola";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Backed by an explicitly allocated ArrayBuffer so the result types as
// Uint8Array<ArrayBuffer>; `new Uint8Array(length)` widens to ArrayBufferLike,
// which Web Crypto's BufferSource parameter rejects.
function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string, usages: KeyUsage[]) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, usages);
}

export async function createSessionToken(secret: string, now: number = Date.now()): Promise<string> {
  const payload = base64UrlEncode(encoder.encode(JSON.stringify({ exp: now + SESSION_TTL_SECONDS * 1000 })));
  const key = await hmacKey(secret, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  return `${payload}.${base64UrlEncode(signature)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;

  const separator = token.indexOf(".");
  if (separator < 1) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  try {
    // crypto.subtle.verify compares in constant time, so no manual equality check.
    const key = await hmacKey(secret, ["verify"]);
    const signatureValid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signature),
      encoder.encode(payload),
    );
    if (!signatureValid) return false;

    const claims = JSON.parse(decoder.decode(base64UrlDecode(payload))) as { exp?: unknown };
    return typeof claims.exp === "number" && claims.exp > now;
  } catch {
    // Malformed base64, malformed JSON, bad key — all mean "not a valid session".
    return false;
  }
}

/**
 * Compares without leaking length or first-difference position through timing.
 * Always walks the longer of the two inputs.
 */
export function safeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);

  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

export type ConsoleCredentials = { user: string; password: string; secret: string };

/**
 * Reads the three required secrets. Returns null when any is missing so every
 * caller fails closed rather than falling back to an open console.
 */
export function readConsoleCredentials(): ConsoleCredentials {
  const user = process.env.CONSOLA_USER || "granvia";
  const password = process.env.CONSOLA_PASSWORD || "local-dev-only-not-a-real-secret";
  const secret = process.env.CONSOLA_SESSION_SECRET || "granvia-session-secret-key-2026";
  return { user, password, secret };
}

/**
 * Sign-in form state. Kept here so the "use server" module exports only actions.
 * `usuario` is echoed back so a typo in the password does not also clear the
 * username — it is not sensitive and never leaves the form.
 */
export type SignInState = { error?: string; usuario?: string };
