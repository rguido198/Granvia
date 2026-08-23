import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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

/** Null when there's no session or no matching profile row — callers decide what "not authenticated" means for their page. */
export async function getCurrentProfile(): Promise<Profile | null> {
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
