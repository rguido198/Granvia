import "server-only";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Session-scoped Supabase client for Server Components/Actions/Route
 * Handlers — reads the real Supabase Auth cookie, subject to RLS. Distinct
 * from getSupabaseServiceClient() (src/lib/supabase/server.ts), which
 * bypasses RLS entirely and has no notion of "who is asking."
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component that can't set cookies — the
            // middleware refresh path covers session renewal in that case.
          }
        },
      },
    },
  );
}

export type Profile = {
  id: string;
  role: "landlord" | "tenant";
  localeId: string | null;
  fullName: string | null;
  email: string;
};

/**
 * Local-only escape hatch for calling a landlord-gated API route (e.g.
 * /api/workflow/approve) without a real Supabase Auth session — needed
 * because a suspended Workflow DevKit run's hook only lives in the memory
 * of the live server process that created it, so testing an approval/
 * rejection from a script or curl has no session to authenticate with at
 * all, real credentials or not.
 *
 * Two independent conditions, both required:
 *   1. `process.env.NODE_ENV !== "production"` — hard-coded, not read from
 *      any env var, so this branch cannot execute on a real deploy no
 *      matter how DEV_BYPASS_* are (mis)configured there. Next.js always
 *      sets NODE_ENV=production for `next build`/`next start`.
 *   2. The caller must present DEV_BYPASS_AUTH_TOKEN via the
 *      `x-dev-bypass-token` header — unset by default, so this is opt-in
 *      even in dev. See .env.example.
 *
 * Returns the real profiles row for DEV_BYPASS_PROFILE_ID (a seeded,
 * unmistakably-labeled test identity — see .env.example) rather than a
 * fabricated one: profiles.id has a hard FK to auth.users(id), and several
 * write paths (approved_by, extraction_verified_by_id, ...) need a real,
 * valid id to satisfy that constraint.
 */
async function resolveDevBypassProfile(): Promise<Profile | null> {
  if (process.env.NODE_ENV === "production") return null;

  const expectedToken = process.env.DEV_BYPASS_AUTH_TOKEN;
  const profileId = process.env.DEV_BYPASS_PROFILE_ID;
  if (!expectedToken || !profileId) return null;

  const headerList = await headers();
  if (headerList.get("x-dev-bypass-token") !== expectedToken) return null;

  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, locale_id, full_name, email")
    .eq("id", profileId)
    .single();
  if (!data) return null;

  return {
    id: data.id,
    role: data.role,
    localeId: data.locale_id,
    fullName: data.full_name,
    email: data.email,
  };
}

/** Null when there's no session or no matching profile row — callers decide what "not authenticated" means for their page. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const devBypass = await resolveDevBypassProfile();
  if (devBypass) return devBypass;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("id, role, locale_id, full_name, email").eq("id", user.id).single();
  if (!data) return null;

  return {
    id: data.id,
    role: data.role,
    localeId: data.locale_id,
    fullName: data.full_name,
    email: data.email,
  };
}
