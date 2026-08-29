import { NextResponse } from "next/server";
import {
  SITE_ACCESS_COOKIE,
  SITE_ACCESS_MAX_AGE_SECONDS,
  checkSitePassword,
  signSiteAccessCookie,
  siteAuthConfigured,
} from "@/lib/site-session";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

export const runtime = "edge";

export async function POST(request: Request) {
  if (!siteAuthConfigured()) {
    // Fail closed: no SITE_PASSWORD/SITE_SESSION_SECRET means the gate can
    // never be passed, not "fall back to a default password."
    return NextResponse.json({ error: "Acceso al sitio no configurado" }, { status: 503 });
  }

  const ip = getClientIp(request);
  // failClosed: true — this throttle is the only brute-force protection the
  // password endpoint has (unlike /api/ingest, where size/magic-byte checks
  // stand on their own). An RPC permission/config fault here must block the
  // endpoint, not silently drop its only defense. Same generic 429 either
  // way, so a caller triggering the fault can't distinguish "rate limited"
  // from "the limiter is broken" — checkRateLimit's console.error is where
  // an operator actually sees the difference.
  const rateLimit = await checkRateLimit(`site-auth:${ip}`, {
    max: 5,
    windowMs: 10 * 60 * 1000,
    failClosed: true,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Demasiados intentos — vuelve a intentar en unos minutos" }, { status: 429 });
  }

  try {
    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Introduce la contraseña" }, { status: 400 });
    }

    if (!checkSitePassword(password)) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    const cookieValue = await signSiteAccessCookie();
    if (!cookieValue) {
      return NextResponse.json({ error: "Acceso al sitio no configurado" }, { status: 503 });
    }

    const response = NextResponse.json({ success: true });

    // Browser discard hint only — the real expiry is signed into
    // cookieValue itself and checked server-side on every request
    // (verifySiteAccessCookie), so a client can't extend it by re-sending
    // the same cookie past its embedded timestamp.
    response.cookies.set({
      name: SITE_ACCESS_COOKIE,
      value: cookieValue,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SITE_ACCESS_MAX_AGE_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Error de autenticación" }, { status: 500 });
  }
}
