"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { CONTRACTOR_TRADES, CONTRACTOR_RATE_TYPES } from "@/lib/contractors/shared";

export type ContractorFormState = { error?: string; success?: string };

/**
 * Single action for both create and edit — an "id" field present means
 * update, absent means insert. Landlord-gated like every other Tier 2/3
 * write in this app (inviteUserAction, approve route).
 *
 * license_expiry/coi_expiry are nullable in the DB but functionally
 * required: matchContractorAndTier() filters on
 * `.gte("license_expiry", today)` and `.gte("coi_expiry", today)`, and
 * Postgres null never satisfies a gte comparison — a contractor saved
 * without both dates is permanently invisible to auto-dispatch. Both are
 * `required` in the form for that reason, not just data hygiene.
 */
export async function upsertContractorAction(
  _prev: ContractorFormState,
  formData: FormData,
): Promise<ContractorFormState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return { error: "No autorizado" };
  }

  const id = String(formData.get("id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const trade = String(formData.get("trade") ?? "").trim();
  const coverageHours = String(formData.get("coverage_hours") ?? "").trim() || null;
  const responseTimeCommitment = String(formData.get("response_time_commitment") ?? "").trim() || null;
  const rateRaw = String(formData.get("rate") ?? "").trim();
  const rateTypeRaw = String(formData.get("rate_type") ?? "").trim();
  const licenseExpiry = String(formData.get("license_expiry") ?? "").trim();
  const coiExpiry = String(formData.get("coi_expiry") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!name) return { error: "Nombre del contratista requerido" };
  if (!(CONTRACTOR_TRADES as readonly string[]).includes(trade)) {
    return { error: `Especialidad debe ser una de: ${CONTRACTOR_TRADES.join(", ")}` };
  }
  if (!licenseExpiry || !coiExpiry) {
    return { error: "Vencimiento de licencia y de póliza (COI) son requeridos para que Diego pueda despachar a este contratista" };
  }
  if (rateTypeRaw && !(CONTRACTOR_RATE_TYPES as readonly string[]).includes(rateTypeRaw)) {
    return { error: `Tipo de tarifa debe ser una de: ${CONTRACTOR_RATE_TYPES.join(", ")}` };
  }

  const admin = getSupabaseServiceClient();
  const payload = {
    name,
    trade,
    coverage_hours: coverageHours,
    response_time_commitment: responseTimeCommitment,
    rate: rateRaw ? Number(rateRaw) : null,
    rate_type: rateTypeRaw || null,
    license_expiry: licenseExpiry,
    coi_expiry: coiExpiry,
    active,
  };

  const { error } = id
    ? await admin.from("contractors").update(payload).eq("id", id)
    : await admin.from("contractors").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/consola");
  return { success: id ? "Contratista actualizado" : "Contratista agregado" };
}
