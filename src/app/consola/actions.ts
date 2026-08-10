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
  if (!credentials) {
    return { error: "La consola no está configurada. Falta definir las variables de acceso en el servidor." };
  }

  const submittedUser = String(formData.get("usuario") ?? "");
  const submittedPassword = String(formData.get("password") ?? "");

  // Both comparisons run before the result is used: `&&` would short-circuit on
  // a wrong username and skip the password check, making the response time
  // reveal which of the two was wrong.
  const userMatches = safeEqual(submittedUser, credentials.user);
  const passwordMatches = safeEqual(submittedPassword, credentials.password);

  if (!userMatches || !passwordMatches) {
    // One message for both cases — naming which field failed tells an attacker
    // when they have found a valid username.
    return { error: "Usuario o contraseña incorrectos.", usuario: submittedUser };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(credentials.secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: CONSOLE_HOME_PATH,
    maxAge: SESSION_TTL_SECONDS,
  });

  // Outside the guard clauses on purpose: redirect() signals by throwing.
  redirect(CONSOLE_HOME_PATH);
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete({ name: SESSION_COOKIE, path: CONSOLE_HOME_PATH });
  redirect(CONSOLE_LOGIN_PATH);
}
