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

export type UpdateApprovalTiersResult = { error?: string; success?: boolean };

/**
 * Persists the RBAC tab's Diego CapEx threshold card to the same
 * approval_tiers rows diego-triage.ts actually reads (matchContractorAndTier)
 * to decide AUTO vs GERENTE vs DIRECCION — previously this card's "Guardar
 * Cambios" only cleared local edit state and never wrote anywhere real.
 * Updates all three tiers together so they stay contiguous: AUTO's max,
 * GERENTE's min/max, and DIRECCION's min are all derived from the same two
 * boundaries — DIRECCION's own max_amount is left null (no ceiling on the
 * top tier), matching its existing row.
 */
export async function updateApprovalTiersAction(autoCeilingMxn: number, gerenteCeilingMxn: number): Promise<UpdateApprovalTiersResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return { error: "No autorizado" };
  }
  if (!Number.isFinite(autoCeilingMxn) || autoCeilingMxn < 0) {
    return { error: "Techo AUTO inválido" };
  }
  if (!Number.isFinite(gerenteCeilingMxn) || gerenteCeilingMxn <= autoCeilingMxn) {
    return { error: "El techo de GERENTE debe ser mayor al techo de AUTO" };
  }

  const supabase = getSupabaseServiceClient();
  const { data: property, error: propertyError } = await supabase.from("properties").select("id").limit(1).single();
  if (propertyError || !property) return { error: propertyError?.message ?? "No se encontró la propiedad en Supabase" };

  const results = await Promise.all([
    supabase.from("approval_tiers").update({ max_amount: autoCeilingMxn }).eq("property_id", property.id).eq("level", "AUTO"),
    supabase
      .from("approval_tiers")
      .update({ min_amount: autoCeilingMxn + 0.01, max_amount: gerenteCeilingMxn })
      .eq("property_id", property.id)
      .eq("level", "GERENTE"),
    supabase.from("approval_tiers").update({ min_amount: gerenteCeilingMxn + 0.01 }).eq("property_id", property.id).eq("level", "DIRECCION"),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidatePath("/consola");
  return { success: true };
}

export type UpdateMaintenanceBudgetResult = { error?: string; success?: boolean };

/**
 * Same single-properties-row pattern as toggleAutonomyKillSwitchAction —
 * landlord-set quarterly maintenance spend cap, plaza-wide. `null` clears
 * the cap rather than defaulting to a number nobody chose.
 */
export async function updateMaintenanceBudgetAction(quarterlyBudgetMxn: number | null): Promise<UpdateMaintenanceBudgetResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return { error: "No autorizado" };
  }
  if (quarterlyBudgetMxn !== null && (!Number.isFinite(quarterlyBudgetMxn) || quarterlyBudgetMxn < 0)) {
    return { error: "Monto inválido" };
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("properties")
    .update({ maintenance_quarterly_budget_mxn: quarterlyBudgetMxn })
    .not("id", "is", null);

  if (error) return { error: error.message };

  revalidatePath("/consola");
  return { success: true };
}
