import { NextResponse } from "next/server";
import { SITE_ACCESS_COOKIE, SITE_PASSWORD } from "@/lib/site-session";

export const runtime = "edge";


export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Introduce la contraseña" }, { status: 400 });
    }

    // Check against configured password (or default fallback granvia2026 / granvia)
    const validPasswords = [SITE_PASSWORD, "granvia2026", "granvia", "local-dev-only-not-a-real-secret"];
    const isValid = validPasswords.includes(password.trim());

    if (!isValid) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    
    // Set 30-day site access cookie
    response.cookies.set({
      name: SITE_ACCESS_COOKIE,
      value: "granted",
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Error de autenticación" }, { status: 500 });
  }
}
