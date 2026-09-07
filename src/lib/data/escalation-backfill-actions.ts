"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, type Profile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { invalidateCopilotoCache } from "@/lib/copiloto/cache";
import type { EscalationMethod } from "@/lib/data/contract-status";

export type EscalationBackfillActionResult = { error?: string };

const ESCALATION_METHODS: EscalationMethod[] = ["fixed_pct", "landlord_specified"];

/** Returns the landlord profile (for updated_by attribution — see
 *  lease_field_history's own migration comment on why the app has to
 *  supply this, not a trigger) or the auth error to return as-is. */
async function requireLandlord(): Promise<{ profile: Profile } | { error: string }> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return { error: "No autorizado" };
  }
  return { profile };
}

/**
 * Confirms one lease's escalation schedule — the single-row action in
 * /consola/escalaciones, whether the landlord accepted the mined suggestion
 * as-is or edited it first. Same target columns updateLeaseFieldAction
 * already writes (escalation_pct/method/month); a dedicated action here
 * because this flow also needs to write all three atomically in one call
 * and validate them together, not one field at a time.
 */
export async function confirmEscalationScheduleAction(
  leaseRowId: string,
  escalationMonth: number,
  escalationPct: number,
  escalationMethod: EscalationMethod,
): Promise<EscalationBackfillActionResult> {
  const auth = await requireLandlord();
  if ("error" in auth) return auth;

  if (!Number.isInteger(escalationMonth) || escalationMonth < 1 || escalationMonth > 12) {
    return { error: "El mes debe estar entre 1 y 12" };
  }
  if (!Number.isFinite(escalationPct) || escalationPct <= 0) {
    return { error: "El porcentaje debe ser mayor a 0" };
  }
  if (!ESCALATION_METHODS.includes(escalationMethod)) {
    return { error: "Método de escalación inválido" };
  }

  const admin = getSupabaseServiceClient();
  const { error } = await admin
    .from("leases")
    .update({
      escalation_month: escalationMonth,
      escalation_pct: escalationPct,
      escalation_method: escalationMethod,
      escalation_confirmed_none: false,
      updated_by: auth.profile.id,
    })
    .eq("id", leaseRowId);
  if (error) return { error: error.message };

  revalidatePath("/consola");
  revalidatePath("/consola/escalaciones");
  revalidatePath("/consola/finanzas");
  invalidateCopilotoCache();
  return {};
}

/**
 * Confirms the contract has no escalation clause — the "reviewed, genuinely
 * none" state escalation_confirmed_none exists to represent, distinct from
 * "nobody has looked at this yet" (the alternative is just leaving
 * escalation_month null forever, which is indistinguishable from a lease
 * still on the worklist).
 */
export async function confirmNoEscalationAction(leaseRowId: string): Promise<EscalationBackfillActionResult> {
  const auth = await requireLandlord();
  if ("error" in auth) return auth;

  const admin = getSupabaseServiceClient();
  const { error } = await admin
    .from("leases")
    .update({
      escalation_confirmed_none: true,
      escalation_month: null,
      escalation_pct: null,
      escalation_method: null,
      updated_by: auth.profile.id,
    })
    .eq("id", leaseRowId);
  if (error) return { error: error.message };

  revalidatePath("/consola");
  revalidatePath("/consola/escalaciones");
  revalidatePath("/consola/finanzas");
  invalidateCopilotoCache();
  return {};
}

/**
 * Bulk-confirms every eligible row at once — "eligible" decided by the
 * caller (EscalationBackfillCandidate.bulkConfirmEligible: a suggested pct
 * was mined AND the anniversary month is unambiguous), never re-derived
 * here. Applies each row's OWN suggested pct/month, method always
 * "fixed_pct" since findEscalationClause only ever mines a matched
 * percentage — never a value this action invents itself.
 */
export async function bulkConfirmSuggestedEscalationsAction(
  rows: { leaseRowId: string; month: number; pct: number }[],
): Promise<EscalationBackfillActionResult> {
  const auth = await requireLandlord();
  if ("error" in auth) return auth;
  if (rows.length === 0) return {};

  const admin = getSupabaseServiceClient();
  const results = await Promise.all(
    rows.map((r) =>
      admin
        .from("leases")
        .update({
          escalation_month: r.month,
          escalation_pct: r.pct,
          escalation_method: "fixed_pct",
          escalation_confirmed_none: false,
          updated_by: auth.profile.id,
        })
        .eq("id", r.leaseRowId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  revalidatePath("/consola");
  revalidatePath("/consola/escalaciones");
  revalidatePath("/consola/finanzas");
  invalidateCopilotoCache();
  return {};
}
