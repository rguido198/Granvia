"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CONSOLE_HOME_PATH,
  CONSOLE_LOGIN_PATH,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  readConsoleCredentials,
  safeEqual,
  type SignInState,
} from "@/lib/console-session";

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const credentials = readConsoleCredentials();
  const submittedUser = String(formData.get("usuario") ?? "").trim().toLowerCase();

  if (!credentials) {
    return {
      error: "Consola no configurada: faltan CONSOLA_USER, CONSOLA_PASSWORD o CONSOLA_SESSION_SECRET.",
      usuario: submittedUser,
    };
  }

  const submittedPassword = String(formData.get("password") ?? "").trim();

  const userMatches = submittedUser === credentials.user.toLowerCase();
  const passwordMatches = safeEqual(submittedPassword, credentials.password);

  if (!userMatches || !passwordMatches) {
    return { error: "Usuario o contraseña incorrectos.", usuario: submittedUser };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(credentials.secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect(CONSOLE_HOME_PATH);
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete({ name: SESSION_COOKIE, path: "/" });
  redirect(CONSOLE_LOGIN_PATH);
}
