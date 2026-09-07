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
  /** Valeria's stated reasoning for this specific edit (askValeria's
   *  ProposedRenewalEdit.reasoning) — persisted alongside the field change
   *  so the diff view can attribute this row to her, with her own words,
   *  instead of defaulting every row to "Mariana AI" regardless of who
   *  actually touched it last. Undefined for any future non-chat caller. */
  reasoning?: string,
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

  const { error } = await admin
    .from("lease_renewals")
    .update({
      [field]: value,
      last_edited_by: "valeria_ai",
      last_edited_reasoning: reasoning ?? null,
    })
    .eq("id", renewalId);
  if (error) return { error: error.message };

  revalidatePath("/consola");
  revalidatePath(`/consola/renovaciones/${renewalId}`);
  invalidateCopilotoCache();
  return { success: `${renewal.renewal_number} actualizado.` };
}

/**
 * Tier 2 — a landlord leaving feedback on an in-flight draft without
 * resolving it either way (not an approve, not a reject): status stays
 * needs_landlord_review, the note just sits on the record for whoever
 * redrafts next. Mirrors updateRenewalFieldAction's own draft-only scoping.
 */
export async function requestRenewalChangesAction(
  renewalId: string,
  feedback: string,
): Promise<UpdateRenewalFieldResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return { error: "No autorizado" };
  }
  const trimmed = feedback.trim();
  if (!trimmed) return { error: "Escribe qué cambios necesitas antes de enviar." };

  const admin = getSupabaseServiceClient();
  const { data: renewal, error: fetchError } = await admin
    .from("lease_renewals")
    .select("status, renewal_number")
    .eq("id", renewalId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!renewal) return { error: "Renovación no encontrada" };
  if (renewal.status !== "needs_landlord_review") {
    return { error: `Solo se pueden dejar comentarios en renovaciones en borrador — ${renewal.renewal_number} ya está en estatus "${renewal.status}".` };
  }

  const { error } = await admin
    .from("lease_renewals")
    .update({ landlord_feedback: trimmed })
    .eq("id", renewalId);
  if (error) return { error: error.message };

  revalidatePath("/consola");
  revalidatePath(`/consola/renovaciones/${renewalId}`);
  invalidateCopilotoCache();
  return { success: `Comentario guardado en ${renewal.renewal_number}.` };
}
