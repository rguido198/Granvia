"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type ToggleAutonomyResult = { error?: string; success?: boolean };

/**
 * Persists the RBAC tab's emergency kill-switch and is the only place that
 * decides its DB value — diegoTriageWorkflow reads properties.autonomy_frozen
 * directly (src/workflows/diego-triage.ts) and forces every new ticket to
 * needs_approval while it's true, so this toggle has a real effect on Diego's
 * autonomous dispatch, not just on what the RBAC tab displays.
 */
export async function toggleAutonomyKillSwitchAction(nextState: boolean): Promise<ToggleAutonomyResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return { error: "No autorizado" };
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("properties")
    .update({
      autonomy_frozen: nextState,
      autonomy_frozen_by: nextState ? profile.email : null,
      autonomy_frozen_at: nextState ? new Date().toISOString() : null,
    })
    .not("id", "is", null);

  if (error) return { error: error.message };

  revalidatePath("/consola");
  return { success: true };
}
