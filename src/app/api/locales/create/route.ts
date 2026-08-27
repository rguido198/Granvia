import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Creates a brand-new, empty (VACANT, no tenant) locale row — the missing
 * piece Gate 1 (lease-doc-match) needs when a scanned contract's tenant
 * doesn't match anything on record AND the unit itself isn't in the rent
 * roll at all yet. Previously the only way to create a new locale was
 * addTenantAction ("+ Agregar Inquilino"), which has no file upload at all
 * — a tenant onboarded that way had no link back to their actual signed
 * PDF. This lets the landlord create the unit inline, right where they
 * already are, and immediately use its id as Gate 1's correctedLocaleId —
 * the digitization pipeline then runs its normal needs_new_lease path
 * against a locale that actually has the source document attached.
 *
 * Deliberately does NOT create a lease or set a tenant — that's still
 * Gate 2's job (promoteExtraction's needs_new_lease branch), which is the
 * one place a Tier 3 write onto `leases` happens with the landlord's
 * confirmed/edited fields, not this one.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { unitNumber, areaSqm } = body as { unitNumber?: string; areaSqm?: number };

  const trimmedUnitNumber = typeof unitNumber === "string" ? unitNumber.trim() : "";
  if (!trimmedUnitNumber) {
    return NextResponse.json({ error: "El número de local es requerido" }, { status: 400 });
  }
  if (typeof areaSqm !== "number" || !Number.isFinite(areaSqm) || areaSqm <= 0) {
    return NextResponse.json({ error: "La superficie (m²) debe ser un número positivo" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  // Any existing row for this unit_number — occupied, vacant, or pending —
  // means this isn't actually a new unit. Distinct from addTenantAction's
  // check (which only blocks on OCCUPIED, since it also handles re-leasing
  // a vacant unit): this route's whole point is asserting "this local has
  // never existed in the system," so any match at all is a contradiction.
  const { data: existing, error: existingError } = await supabase
    .from("locales")
    .select("id")
    .eq("unit_number", trimmedUnitNumber)
    .maybeSingle();
  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json(
      { error: `El local ${trimmedUnitNumber} ya existe en el sistema — selecciónalo de la lista en vez de crearlo.` },
      { status: 409 },
    );
  }

  const { data: property, error: propertyError } = await supabase.from("properties").select("id").limit(1).single();
  if (propertyError || !property) {
    return NextResponse.json({ error: "No se encontró la propiedad en Supabase" }, { status: 500 });
  }

  const { data: locale, error: insertError } = await supabase
    .from("locales")
    .insert({
      property_id: property.id,
      unit_number: trimmedUnitNumber,
      area_sqm: areaSqm,
      status: "VACANT",
      tenant_entity: null,
    })
    .select("id, unit_number")
    .single();
  if (insertError || !locale) {
    return NextResponse.json({ error: insertError?.message ?? "No se pudo crear el local" }, { status: 500 });
  }

  return NextResponse.json({ id: locale.id, unitNumber: locale.unit_number });
}
