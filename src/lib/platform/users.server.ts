import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type CorporateUser = {
  id: string;
  email: string;
  fullName: string | null;
  status: "active" | "pending";
  createdAt: string;
};

/**
 * The RBAC tab's real user roster — landlord-role profiles only. Tenants
 * have their own portal and aren't "corporate users" of this console.
 *
 * There is exactly one operational role with console access today
 * (role='landlord' — see profiles.role, app_role enum has no CFO/Ops/Legal/
 * Audit tiers). A previous version of this tab invented a 4-user roster
 * with a 5-tier permission matrix that had no corresponding row in `profiles`
 * or `auth.users` at all — replaced with this real list, even where that
 * means it's short.
 */
export async function fetchCorporateUsers(): Promise<CorporateUser[]> {
  const supabase = getSupabaseServiceClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("role", "landlord")
    .order("created_at", { ascending: true });

  if (!profiles?.length) return [];

  return Promise.all(
    profiles.map(async (p) => {
      const { data } = await supabase.auth.admin.getUserById(p.id);
      return {
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        status: data?.user?.confirmed_at ? "active" : "pending",
        createdAt: p.created_at,
      } satisfies CorporateUser;
    }),
  );
}
