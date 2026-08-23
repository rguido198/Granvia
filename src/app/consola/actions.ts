"use server";

import { signOutAction } from "@/lib/auth/actions";
import { CONSOLE_LOGIN_PATH } from "@/lib/console-session";

export async function signOut(): Promise<void> {
  await signOutAction(CONSOLE_LOGIN_PATH);
}
