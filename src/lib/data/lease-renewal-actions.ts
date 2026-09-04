"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { invalidateCopilotoCache } from "@/lib/copiloto/cache";
import type { RenewalEditableField } from "@/lib/copiloto/ask-copiloto";

export type UpdateRenewalFieldResult = { error?: string; success?: string };

const NUMERIC_FIELDS: RenewalEditableField[] = ["new_base_rent_monthly", "escalation_pct"];

/**
 * Tier 2 — the only write path for editing an in-flight renewal draft's own
 * terms before a landlord approves it (no such path existed before this;
 * the panel only ever supported approve/reject via /api/workflow/approve-
 * lease-renewal, never an in-place edit). This is what Valeria's confirm
 * card (§3a) calls on "Aplicar" — the tool call itself
 * (askValeria/propose_renewal_edit) never reaches this far on its own.
 *
 * Scoped to needs_landlord_review rows only, matching the "unsigned drafts
 * only, never a signed lease" boundary decided for Valeria's editing
 * capability (2026-09-03).
 */
export async function updateRenewalFieldAction(
  renewalId: string,
  field: RenewalEditableField,
  rawValue: string,
): Promise<UpdateRenewalFieldResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return { error: "No autorizado" };
  }

  const admin = getSupabaseServiceClient();
  const { data: renewal, error: fetchError } = await admin
    .from("lease_renewals")
    .select("status, renewal_number")
    .eq("id", renewalId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!renewal) return { error: "Renovación no encontrada" };
  if (renewal.status !== "needs_landlord_review") {
    return { error: `Solo se pueden editar renovaciones en borrador — ${renewal.renewal_number} ya está en estatus "${renewal.status}".` };
  }

  let value: number | string;
  if (NUMERIC_FIELDS.includes(field)) {
    const n = Number(rawValue);
    if (!Number.isFinite(n)) return { error: "Valor numérico inválido" };
    value = n;
  } else {
    value = rawValue;
  }

  const { error } = await admin.from("lease_renewals").update({ [field]: value }).eq("id", renewalId);
  if (error) return { error: error.message };

  revalidatePath("/consola");
  invalidateCopilotoCache();
  return { success: `${renewal.renewal_number} actualizado.` };
}
