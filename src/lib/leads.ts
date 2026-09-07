import "server-only";
import {
  BUSINESS_CATEGORIES,
  LEASE_KEYS,
  branchFor,
  type LeaseKey,
} from "@/content/leasing";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type LeasingLead = {
  nombre: string;
  telefono: string;
  correo: string;
  giro: string;
  metros: number;
  duracion: LeaseKey;
  /** Which automation this lead should enter. Derived, never user-supplied. */
  branch: "guide" | "call";
  receivedAt: string;
};

/** Field-keyed error messages, ready to render inline next to each input. */
export type FieldErrors = Partial<
  Record<"nombre" | "telefono" | "correo" | "giro" | "metros" | "duracion", string>
>;

// Deliberately permissive: enough to catch typos, not so strict it rejects
// real addresses. Real deliverability is confirmed by the auto-reply landing.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Mexican numbers are 10 digits; tolerate spaces, dashes, parens and +52. */
function digitsOf(value: string) {
  return value.replace(/[\s\-().]/g, "").replace(/^\+?52/, "");
}

export function validateLead(
  formData: FormData,
): { ok: true; lead: LeasingLead } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim();
  const giro = String(formData.get("giro") ?? "").trim();
  const metrosRaw = String(formData.get("metros") ?? "").trim();
  const duracion = String(formData.get("duracion") ?? "").trim();

  if (nombre.length < 2) {
    errors.nombre = "Escribe tu nombre.";
  } else if (nombre.length > 120) {
    errors.nombre = "El nombre es demasiado largo.";
  }

  const phoneDigits = digitsOf(telefono);
  if (!phoneDigits) {
    errors.telefono = "Escribe un teléfono de contacto.";
  } else if (!/^\d{10}$/.test(phoneDigits)) {
    errors.telefono = "Debe tener 10 dígitos, por ejemplo 686 000 0000.";
  }

  if (!correo) {
    errors.correo = "Escribe tu correo.";
  } else if (!EMAIL.test(correo) || correo.length > 254) {
    errors.correo = "Ese correo no parece válido.";
  }

  if (!BUSINESS_CATEGORIES.includes(giro)) {
    errors.giro = "Selecciona un giro.";
  }

  const metros = Number(metrosRaw);
  if (!metrosRaw) {
    errors.metros = "Indica cuántos m² necesitas.";
  } else if (!Number.isFinite(metros) || metros <= 0) {
    errors.metros = "Usa un número, por ejemplo 60.";
  } else if (metros > 100000) {
    errors.metros = "Ese valor parece demasiado grande.";
  }

  if (!LEASE_KEYS.includes(duracion as LeaseKey)) {
    errors.duracion = "Selecciona la duración del arrendamiento.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const key = duracion as LeaseKey;
  return {
    ok: true,
    lead: {
      nombre,
      telefono: phoneDigits,
      correo: correo.toLowerCase(),
      giro,
      metros,
      duracion: key,
      branch: branchFor(key),
      receivedAt: new Date().toISOString(),
    },
  };
}

/**
 * Persistence seam for a validated lead — real destination as of this
 * write: the console's own `leads` table (lead-pipeline.tsx, source of
 * fetchLeads()), the same funnel a landlord already works from. Not a
 * separate system: `lease_applications.source_lead_id` already points back
 * at this table (20260830000011_lead_pipeline.sql), so a public inquiry
 * landing here is exactly the pipeline's own "how a lead becomes a
 * screened application" shape, not a new concept bolted on.
 *
 * `created_by` is `text not null`, not a uuid FK to auth.users — deliberately
 * accepts a non-landlord string identifier, which is what makes a publicly-
 * submitted lead (no authenticated user at all) representable in this table
 * without schema changes. RLS on `leads` is `is_landlord()`-only, so this
 * write goes through the service-role client, same as every other
 * public-facing insert in this codebase (e.g. /api/ingest).
 *
 * What's still a real gap, not fixed here: no CRM beyond this table, and no
 * auto-reply (the "pop-up guide PDF vs. scheduling link" the page's own copy
 * promises). Both need an actual choice of provider — email service, or a
 * real external CRM — plus credentials, which is a decision this change
 * doesn't get to make silently. What this write DOES fix is the actual
 * substance of the TODO it replaces: a submitted lead is now a durable,
 * queryable row a landlord can act on (visible in the console's Lead
 * Pipeline), not a log line nobody reads, and a failed write now throws —
 * submitLeasingInquiry's existing catch block (crece-tu-negocio/actions.ts)
 * already surfaces that to the visitor, it just never had a real failure
 * mode to catch before.
 */
export async function recordLead(lead: LeasingLead): Promise<void> {
  const supabase = getSupabaseServiceClient();

  const notes = [
    `Contacto: ${lead.telefono} · ${lead.correo}`,
    `Superficie deseada: ${lead.metros} m²`,
    `Duración de arrendamiento: ${lead.duracion}`,
  ].join("\n");

  const { error } = await supabase.from("leads").insert({
    applicant_entity: lead.nombre,
    category: lead.giro,
    contact_channel: `${lead.telefono} / ${lead.correo}`,
    source: "crece-tu-negocio (sitio web)",
    notes,
    created_by: "public_site:crece-tu-negocio",
  });

  if (error) throw new Error(error.message);
}
