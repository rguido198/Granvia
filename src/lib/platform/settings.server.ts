import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type AutonomyState = {
  frozen: boolean;
  frozenBy: string | null;
  frozenAt: string | null;
};

// Single-property deployment (root CLAUDE.md §5) — the kill switch is
// plaza-wide, so there is exactly one properties row to read.
export async function fetchAutonomyState(): Promise<AutonomyState> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("properties")
    .select("autonomy_frozen, autonomy_frozen_by, autonomy_frozen_at")
    .single();

  if (error) throw new Error(error.message);

  return {
    frozen: data.autonomy_frozen,
    frozenBy: data.autonomy_frozen_by,
    frozenAt: data.autonomy_frozen_at,
  };
}
