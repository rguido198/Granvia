"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { invalidateCopilotoCache } from "@/lib/copiloto/cache";
import type { LocaleUnitType } from "@/lib/data/portfolio.server";

export type UpdateRentRollFieldResult = { error?: string };

const UNIT_TYPES: LocaleUnitType[] = ["ANCHOR", "FOOD", "RETAIL", "SERVICE", "OTHER"];

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

export type LeaseEditableField =
  | "escalation_pct"
  | "escalation_method"
  | "escalation_month"
  | "security_deposit_amount"
  | "security_deposit_status"
  | "agent_notes";

const LEASE_NUMERIC_FIELDS: LeaseEditableField[] = ["escalation_pct", "escalation_month", "security_deposit_amount"];

/**
 * Tier 3 — the same "Modo Edición" pattern as updateRentRollFieldAction, but
 * targeting `leases` directly by leaseRowId (LeaseDetail.leaseRowId, the real
 * leases.id) rather than by localeId, since these six fields live on the
 * lease row itself, not the locale. One action instead of six near-identical
 * ones — the three text fields (escalation_method, security_deposit_status,
 * agent_notes) and three numeric fields (escalation_pct, escalation_month,
 * security_deposit_amount) share the same auth/revalidate shape and differ
 * only in how the raw value is cast before the write.
 */
export async function updateLeaseFieldAction(
  leaseRowId: string,
  field: LeaseEditableField,
  rawValue: string,
): Promise<UpdateRentRollFieldResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return { error: "No autorizado" };
  }

  const trimmed = rawValue.trim();
  let value: number | string | null;
  if (LEASE_NUMERIC_FIELDS.includes(field)) {
    if (trimmed === "") {
      value = null;
    } else {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) return { error: "Valor numérico inválido" };
      if (field === "escalation_month" && (n < 1 || n > 12)) return { error: "El mes debe estar entre 1 y 12" };
      value = n;
    }
  } else {
    value = trimmed === "" ? null : trimmed;
  }

  const admin = getSupabaseServiceClient();
  const { error } = await admin.from("leases").update({ [field]: value }).eq("id", leaseRowId);
  if (error) return { error: error.message };

  revalidatePath("/consola");
  invalidateCopilotoCache();
  return {};
}

/**
 * Sets a locale's commercial category — independent of updateRentRollFieldAction
 * above since it targets `locales.unit_type` unconditionally, with no
 * vacant/occupied branching (a vacant unit keeps its category). Existing
 * locales predate this column and start null; this is also the one-time
 * backfill path for those, in addition to being the ongoing edit path.
 */
export async function updateUnitTypeAction(localeId: string, unitType: LocaleUnitType): Promise<UpdateRentRollFieldResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return { error: "No autorizado" };
  }
  if (!UNIT_TYPES.includes(unitType)) {
    return { error: "Tipo de local inválido" };
  }

  const admin = getSupabaseServiceClient();
  const { error } = await admin.from("locales").update({ unit_type: unitType }).eq("id", localeId);
  if (error) return { error: error.message };

  revalidatePath("/consola");
  invalidateCopilotoCache();
  return {};
}
