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
  const { error } = await sendInvite(admin, email, role, localeId, fullName);
  if (error) return { error };

  revalidatePath("/consola");
  return { success: `Invitación enviada a ${email}` };
}

async function sendInvite(
  admin: ReturnType<typeof getSupabaseServiceClient>,
  email: string,
  role: "landlord" | "tenant",
  localeId: string | null,
  fullName: string | null,
): Promise<{ error?: string }> {
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role, locale_id: localeId, full_name: fullName },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/completar-acceso`,
  });
  return { error: error?.message };
}

export type ResendState = { done?: boolean };

/**
 * Public — reachable from the expired-link page with no session at all, so
 * it can't be landlord-gated like inviteUserAction. Kept safe by doing
 * nothing observable: same generic response whether the email has no
 * account, an already-confirmed account, or a genuinely pending invite —
 * only the last case actually triggers a resend. inviteUserByEmail refuses
 * to resend for an account that already exists unconfirmed (confirmed live
 * on this exact flow), so a stale pending account is deleted and recreated
 * with its original role/locale_id carried forward.
 */
export async function resendInviteAction(_prev: ResendState, formData: FormData): Promise<ResendState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { done: true };

  const admin = getSupabaseServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, locale_id, full_name")
    .eq("email", email)
    .maybeSingle();

  if (profile) {
    const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
    const alreadyConfirmed = !!authUser?.user?.confirmed_at;
    if (!alreadyConfirmed) {
      await admin.auth.admin.deleteUser(profile.id);
      await sendInvite(admin, email, profile.role, profile.locale_id, profile.full_name);
    }
  }

  return { done: true };
}
