"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { invalidateCopilotoCache } from "@/lib/copiloto/cache";

export type CamActionResult = { error?: string };

/**
 * Confirms one lease's CAM contract terms — basis, cap, admin fee. Terms
 * only: this writes exactly what the contract says, never a computed peso
 * figure. cam_share_basis is required (it's what the coverage stat tracks);
 * cap and admin fee are optional since not every lease negotiates either.
 */
export async function confirmCamTermsAction(
  leaseRowId: string,
  camShareBasis: string,
  camCapControllablePct: number | null,
  adminFeePct: number | null,
): Promise<CamActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return { error: "No autorizado" };
  }
  if (!camShareBasis.trim()) {
    return { error: "La base de prorrateo es requerida" };
  }
  if (camCapControllablePct !== null && (!Number.isFinite(camCapControllablePct) || camCapControllablePct < 0 || camCapControllablePct > 100)) {
    return { error: "El tope de controlables debe estar entre 0 y 100" };
  }
  if (adminFeePct !== null && (!Number.isFinite(adminFeePct) || adminFeePct < 0 || adminFeePct > 100)) {
    return { error: "La cuota administrativa debe estar entre 0 y 100" };
  }

  const admin = getSupabaseServiceClient();
  const { error } = await admin
    .from("leases")
    .update({
      cam_share_basis: camShareBasis.trim(),
      cam_cap_controllable_pct: camCapControllablePct,
      admin_fee_pct: adminFeePct,
      updated_by: profile.id,
    })
    .eq("id", leaseRowId);
  if (error) return { error: error.message };

  revalidatePath("/consola");
  revalidatePath("/consola/cam");
  revalidatePath("/consola/finanzas");
  invalidateCopilotoCache();
  return {};
}
