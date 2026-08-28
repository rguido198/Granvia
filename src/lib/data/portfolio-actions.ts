"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { invalidateCopilotoCache } from "@/lib/copiloto/cache";

export type UpdateRentRollFieldResult = { error?: string };

/**
 * Rent Roll's "Modo Edición" inline inputs — landlord-gated, writes the real
 * column each field displays. sqm belongs to locales; rent belongs to the
 * locale's lease row. A vacant unit has no active lease row, so there's
 * nothing real to update — returns an error rather than silently doing
 * nothing.
 *
 * The rent update targets one specific lease row (fetched first, by id) —
 * the locale's OCCUPIED status plus its latest end_date, matching
 * portfolio.server.ts's own "active lease" rule. A locale can accumulate
 * more than one `leases` row over its life once vacate/re-add exist
 * (vacateTenantAction ends a lease without deleting it) — an unscoped
 * `.eq("locale_id", …)` update would silently rewrite a terminated lease's
 * historical rent too, and a same-day date filter like `end_date >= today`
 * would still match a lease vacated earlier today (see the note in
 * portfolio.server.ts on why status, not date, is the source of truth).
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
    const { data: locale, error: localeError } = await admin
      .from("locales")
      .select("status")
      .eq("id", localeId)
      .maybeSingle();
    if (localeError) return { error: localeError.message };
    if (!locale || locale.status !== "OCCUPIED") {
      return { error: "Este local no tiene contrato activo — no hay renta que actualizar." };
    }

    const { data: activeLease, error: leaseFetchError } = await admin
      .from("leases")
      .select("id")
      .eq("locale_id", localeId)
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (leaseFetchError) return { error: leaseFetchError.message };
    if (!activeLease) {
      return { error: "Este local no tiene contrato activo — no hay renta que actualizar." };
    }

    const { error } = await admin.from("leases").update({ base_rent_monthly: value }).eq("id", activeLease.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/consola");
  invalidateCopilotoCache();
  return {};
}
