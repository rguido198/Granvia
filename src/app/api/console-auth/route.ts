import { NextResponse } from "next/server";
import {
  CONSOLE_HOME_PATH,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  readConsoleCredentials,
  safeEqual,
} from "@/lib/console-session";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usuario, password } = body || {};

    if (!usuario || !password) {
      return NextResponse.json({ error: "Introduce usuario y contraseña" }, { status: 400 });
    }

    const credentials = readConsoleCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: "Consola no configurada: faltan CONSOLA_USER, CONSOLA_PASSWORD o CONSOLA_SESSION_SECRET." },
        { status: 503 },
      );
    }

    const submittedUser = String(usuario).trim().toLowerCase();
    const submittedPassword = String(password).trim();

    const userMatches = submittedUser === credentials.user.toLowerCase();
    const passwordMatches = safeEqual(submittedPassword, credentials.password);

    if (!userMatches || !passwordMatches) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
    }

    const token = await createSessionToken(credentials.secret);

    const response = NextResponse.json({ success: true, redirect: CONSOLE_HOME_PATH });
    
    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Error de autenticación en el servidor." }, { status: 500 });
  }
}
