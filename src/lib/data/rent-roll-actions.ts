"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type RentRollActionState = { error?: string; success?: string };

async function requireLandlord() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") return null;
  return profile;
}

async function getPropertyId(admin: ReturnType<typeof getSupabaseServiceClient>): Promise<string | null> {
  const { data } = await admin.from("properties").select("id").limit(1).single();
  return data?.id ?? null;
}

/** Five-year illustrative term, same convention documented on the backfilled
 *  rows in portfolio.server.ts's migration notes — used only when the
 *  landlord doesn't supply a real end date. */
function defaultLeaseDates(startDateInput: string) {
  const today = new Date().toISOString().slice(0, 10);
  const start = startDateInput || today;
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 5);
  return { start, end: end.toISOString().slice(0, 10) };
}

/** leases.lease_id is unique — a plain `LEASE-{unitNumber}` collides the
 *  moment a unit is re-leased after being vacated, since the terminated row
 *  keeps its lease_id rather than being deleted. Suffixing with a timestamp
 *  keeps every lease_id unique across a unit's whole history. */
function newLeaseId(unitNumber: string): string {
  return `LEASE-${unitNumber}-${Date.now()}`;
}

/**
 * Tier 3 — commits the client to a new lease record. Handles two real
 * cases against Session A's schema: a brand-new unit_number (inserts a
 * `locales` row) and re-leasing a unit that's currently VACANT (updates the
 * existing `locales` row back to OCCUPIED instead of blocking on "ya
 * existe" — the locale row is never deleted by vacateTenantAction, so a
 * vacant unit's unit_number is still "taken" in the naive sense). Either
 * way a fresh `leases` row is inserted; a vacant unit's terminated lease is
 * left untouched as history (see formerTenants in portfolio.server.ts).
 *
 * The UI (RentRollAdminTools in src/components/hub/rent-roll-tools.tsx)
 * gates this behind an explicit "revisar → confirmar" two-step before this
 * action ever fires — there is no single-click path to it.
 */
export async function addTenantAction(
  _prev: RentRollActionState,
  formData: FormData,
): Promise<RentRollActionState> {
  const profile = await requireLandlord();
  if (!profile) return { error: "No autorizado" };

  const tenantName = String(formData.get("tenant_name") ?? "").trim();
  const unitNumber = String(formData.get("unit_number") ?? "").trim();
  const sqmRaw = String(formData.get("area_sqm") ?? "").trim();
  const rentRaw = String(formData.get("base_rent_monthly") ?? "").trim();
  const startDateInput = String(formData.get("start_date") ?? "").trim();
  const endDateInput = String(formData.get("end_date") ?? "").trim();

  if (!tenantName) return { error: "Nombre del inquilino requerido" };
  if (!unitNumber) return { error: "Número de local requerido" };

  const sqm = Number(sqmRaw);
  const rent = Number(rentRaw);
  if (!sqmRaw || !Number.isFinite(sqm) || sqm <= 0) return { error: "Superficie (m²) inválida" };
  if (!rentRaw || !Number.isFinite(rent) || rent < 0) return { error: "Renta mensual inválida" };

  const admin = getSupabaseServiceClient();

  const { data: existingUnit, error: existingUnitError } = await admin
    .from("locales")
    .select("id, status")
    .eq("unit_number", unitNumber)
    .maybeSingle();
  if (existingUnitError) return { error: existingUnitError.message };
  if (existingUnit && existingUnit.status === "OCCUPIED") {
    return { error: `El local ${unitNumber} ya está ocupado en el rent roll` };
  }

  let localeId: string;
  if (existingUnit) {
    // Re-leasing a vacant unit — update the existing locale row rather than
    // inserting a duplicate.
    const { error: updateError } = await admin
      .from("locales")
      .update({ area_sqm: sqm, status: "OCCUPIED", tenant_entity: tenantName })
      .eq("id", existingUnit.id);
    if (updateError) return { error: updateError.message };
    localeId = existingUnit.id;
  } else {
    const propertyId = await getPropertyId(admin);
    if (!propertyId) return { error: "No se encontró la propiedad en Supabase" };

    const { data: locale, error: localeError } = await admin
      .from("locales")
      .insert({ property_id: propertyId, unit_number: unitNumber, area_sqm: sqm, status: "OCCUPIED", tenant_entity: tenantName })
      .select("id")
      .single();
    if (localeError || !locale) return { error: localeError?.message ?? "No se pudo crear el local" };
    localeId = locale.id;
  }

  const { start, end } = defaultLeaseDates(startDateInput);
  const { data: newLease, error: leaseError } = await admin
    .from("leases")
    .insert({
      lease_id: newLeaseId(unitNumber),
      locale_id: localeId,
      tenant_entity: tenantName,
      start_date: start,
      end_date: endDateInput || end,
      base_rent_monthly: rent,
      currency: "MXN",
    })
    .select("id")
    .single();

  if (leaseError || !newLease) {
    // Don't leave a newly-inserted locale OCCUPIED with no lease row behind
    // it — fetchPortfolio() would show it as leased with $0 rent, which is
    // worse than surfacing the failure here. A re-leased (pre-existing)
    // locale is left as-is: rolling it back to VACANT on a lease-insert
    // failure risks erasing the real prior tenant_entity value.
    if (!existingUnit) await admin.from("locales").delete().eq("id", localeId);
    return { error: leaseError?.message ?? "No se pudo crear el contrato" };
  }

  // Optional — threads this onboarding back to the Mariana screening that
  // approved it (lease_applications.promoted_lease_id), so the rent roll and
  // Copiloto can trace a tenant back to the risk assessment that let them
  // in, without lease_applications ever restating the lease's own facts.
  // Re-validated here (not just trusted from the form) — the picker only
  // ever offers approved+unlinked applications, but the unique index on
  // promoted_lease_id is the real backstop against a stale/tampered value.
  const applicationId = String(formData.get("application_id") ?? "").trim();
  if (applicationId) {
    const { error: linkError } = await admin
      .from("lease_applications")
      .update({ promoted_lease_id: newLease.id })
      .eq("id", applicationId)
      .eq("status", "approved")
      .is("promoted_lease_id", null);
    if (linkError) {
      // The lease itself already landed successfully — a failed link is a
      // secondary problem, not a reason to roll back a real onboarding.
      console.error(`addTenantAction: failed to link application ${applicationId} to lease ${newLease.id}`, linkError);
    }
  }

  revalidatePath("/consola");
  return { success: `${tenantName} agregado al rent roll — ${unitNumber}, ${sqm} m², ${rent.toLocaleString("es-MX")} MXN/mes.` };
}

/**
 * Tier 3 — terminates a real lease. Marks the locale VACANT (never
 * hard-deleted, so ticket history / audit trail referencing it stays intact)
 * and sets the lease's end_date to today rather than deleting the lease
 * row — that terminated row is exactly what portfolio.server.ts's
 * formerTenants list reads back out. `tenant_entity` on the locale is left
 * as-is deliberately: it's the last fact of who occupied the unit, and
 * fetchPortfolio()'s rent roll only shows non-vacant rows as leased anyway,
 * so a vacated unit never displays as occupied.
 */
export async function vacateTenantAction(
  _prev: RentRollActionState,
  formData: FormData,
): Promise<RentRollActionState> {
  const profile = await requireLandlord();
  if (!profile) return { error: "No autorizado" };

  const localeId = String(formData.get("locale_id") ?? "").trim();
  const leaseId = String(formData.get("lease_id") ?? "").trim();
  const tenantName = String(formData.get("tenant_name") ?? "").trim();

  if (!localeId || !leaseId) return { error: "Falta identificar el local o el contrato" };

  const admin = getSupabaseServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { error: localeError } = await admin.from("locales").update({ status: "VACANT" }).eq("id", localeId);
  if (localeError) return { error: localeError.message };

  const { error: leaseError } = await admin.from("leases").update({ end_date: today }).eq("id", leaseId);
  if (leaseError) return { error: leaseError.message };

  revalidatePath("/consola");
  return { success: `${tenantName || "Local"} marcado como vacante. Contrato terminado el ${today}.` };
}

/**
 * Tier 3 — bulk version of addTenantAction, driven by rows already parsed
 * and previewed client-side (RentRollTools' Excel import panel parses the
 * file with SheetJS and shows every row before this ever fires — no upload
 * silently commits anything). Best-effort per row: a failure on one row
 * doesn't roll back rows already inserted, and every failure is reported
 * back with its reason rather than swallowed. Unlike addTenantAction, a
 * unit_number that's currently VACANT is treated the same as "taken" here —
 * bulk-import is for onboarding a fresh sheet of tenants, not for
 * re-leasing individual vacant units one at a time (use the single Add
 * Inquilino form + its re-lease path for that).
 */
export type BulkImportRow = {
  tenantName: string;
  unitNumber: string;
  areaSqm: number;
  baseRentMonthly: number;
  startDate?: string;
  endDate?: string;
};
export type BulkImportResult = {
  error?: string;
  insertedCount: number;
  failed: { row: BulkImportRow; reason: string }[];
};

export async function bulkAddTenantsAction(_prev: BulkImportResult, rows: BulkImportRow[]): Promise<BulkImportResult> {
  const profile = await requireLandlord();
  if (!profile) return { error: "No autorizado", insertedCount: 0, failed: [] };
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "Sin filas para importar", insertedCount: 0, failed: [] };
  }

  const admin = getSupabaseServiceClient();
  const propertyId = await getPropertyId(admin);
  if (!propertyId) return { error: "No se encontró la propiedad en Supabase", insertedCount: 0, failed: [] };

  const { data: existingLocales } = await admin.from("locales").select("unit_number");
  const takenUnitNumbers = new Set((existingLocales ?? []).map((l) => l.unit_number));

  const failed: { row: BulkImportRow; reason: string }[] = [];
  let insertedCount = 0;

  for (const row of rows) {
    if (
      !row.tenantName ||
      !row.unitNumber ||
      !Number.isFinite(row.areaSqm) ||
      row.areaSqm <= 0 ||
      !Number.isFinite(row.baseRentMonthly) ||
      row.baseRentMonthly < 0
    ) {
      failed.push({ row, reason: "Faltan campos requeridos o son inválidos (inquilino, local, m², renta)" });
      continue;
    }
    if (takenUnitNumbers.has(row.unitNumber)) {
      failed.push({ row, reason: `Local ${row.unitNumber} ya existe en el rent roll` });
      continue;
    }

    const { data: locale, error: localeError } = await admin
      .from("locales")
      .insert({ property_id: propertyId, unit_number: row.unitNumber, area_sqm: row.areaSqm, status: "OCCUPIED", tenant_entity: row.tenantName })
      .select("id")
      .single();

    if (localeError || !locale) {
      failed.push({ row, reason: localeError?.message ?? "Error al crear el local" });
      continue;
    }

    const { start, end } = defaultLeaseDates(row.startDate ?? "");
    const { error: leaseError } = await admin.from("leases").insert({
      lease_id: newLeaseId(row.unitNumber),
      locale_id: locale.id,
      tenant_entity: row.tenantName,
      start_date: start,
      end_date: row.endDate || end,
      base_rent_monthly: row.baseRentMonthly,
      currency: "MXN",
    });

    if (leaseError) {
      await admin.from("locales").delete().eq("id", locale.id);
      failed.push({ row, reason: leaseError.message });
      continue;
    }

    takenUnitNumbers.add(row.unitNumber);
    insertedCount += 1;
  }

  if (insertedCount > 0) revalidatePath("/consola");
  return { insertedCount, failed };
}
