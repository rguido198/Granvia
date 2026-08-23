"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type SignInState = { error?: string; email?: string };

/**
 * Shared by both /consola/acceso and /inquilinos/acceso — the only
 * difference between the two login experiences is which role is required
 * and where a successful sign-in redirects to. Wrong-role sign-ins are
 * rejected here too (not just by middleware), so "tenant credentials on
 * the landlord login" fails with one message, not a confusing bounce.
 */
export async function signInWithRole(
  role: "landlord" | "tenant",
  redirectPath: string,
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Introduce correo y contraseña", email };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Correo o contraseña incorrectos", email };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (!profile || profile.role !== role) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene acceso a este portal", email };
  }

  redirect(redirectPath);
}

export async function signOutAction(redirectPath: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(redirectPath);
}

export type InviteState = { error?: string; success?: string };

/**
 * Admin operation — inviteUserByEmail requires the service-role client, not
 * the session-scoped one (RLS has no bearing on Auth admin calls). Guarded
 * by getCurrentProfile() so this can only run for an actual landlord
 * session, never by role trusted from client input.
 */
export async function inviteUserAction(
  role: "landlord" | "tenant",
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return { error: "No autorizado" };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const localeId = role === "tenant" ? String(formData.get("locale_id") ?? "") : null;
  const fullName = String(formData.get("full_name") ?? "").trim() || null;

  if (!email) return { error: "Introduce un correo" };
  if (role === "tenant" && !localeId) return { error: "Selecciona un local" };

  const admin = getSupabaseServiceClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role, locale_id: localeId, full_name: fullName },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/completar-acceso`,
  });

  if (error) return { error: error.message };

  revalidatePath("/consola");
  return { success: `Invitación enviada a ${email}` };
}
