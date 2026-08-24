"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type UpdateRentRollFieldResult = { error?: string };

/**
 * Rent Roll's "Modo Edición" inline inputs — landlord-gated, writes the real
 * column each field displays. sqm belongs to locales; rent belongs to the
 * locale's lease row. A vacant unit has no lease row, so there's nothing
 * real to update — returns an error rather than silently doing nothing.
 */
export async function updateRentRollFieldAction(
  localeId: string,
  field: "sqm" | "rent",
  value: number,
): Promise<UpdateRentRollFieldResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return { error: "No autorizado" };
  }
  if (!Number.isFinite(value) || value < 0) {
    return { error: "Valor inválido" };
  }

  const admin = getSupabaseServiceClient();

  if (field === "sqm") {
    const { error } = await admin.from("locales").update({ area_sqm: value }).eq("id", localeId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await admin
      .from("leases")
      .update({ base_rent_monthly: value })
      .eq("locale_id", localeId)
      .select("id");
    if (error) return { error: error.message };
    if (!data || data.length === 0) {
      return { error: "Este local no tiene contrato activo — no hay renta que actualizar." };
    }
  }

  revalidatePath("/consola");
  return {};
}
