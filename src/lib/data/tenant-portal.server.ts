import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { DiegoTicket } from "@/lib/data/diego-tickets.server";

export type PortalLocale = {
  id: string;
  unitNumber: string;
  tenantEntity: string;
  propertyName: string;
};

export type LocaleOption = {
  id: string;
  unitNumber: string;
  tenantEntity: string | null;
  propertyName: string;
};

/**
 * No real tenant auth exists yet (deferred to the landlord-invite flow) — for
 * now this always resolves to the first locale on file, matching the single
 * seeded unit every other real query in this build has been tested against.
 * Once invite-based auth lands, the locale comes from the session instead of
 * this lookup.
 */
async function resolvePortalLocale(): Promise<PortalLocale | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("locales")
    .select("id, unit_number, tenant_entity, properties ( name )")
    .order("unit_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as {
    id: string;
    unit_number: string;
    tenant_entity: string | null;
    properties: { name: string } | null;
  };
  return {
    id: row.id,
    unitNumber: row.unit_number,
    tenantEntity: row.tenant_entity ?? "Inquilino",
    propertyName: row.properties?.name ?? "?",
  };
}

export async function fetchTenantPortalData(): Promise<{
  locale: PortalLocale | null;
  tickets: DiegoTicket[];
}> {
  const locale = await resolvePortalLocale();
  if (!locale) return { locale: null, tickets: [] };

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      id, ticket_number, status, priority, cost_bucket, estimated_cost,
      raw_report, diagnosis_answer, created_at, unresolved_jd_keys,
      skeptic_flagged, skeptic_concerns,
      contractors ( name )
    `,
    )
    .eq("locale_id", locale.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  type Row = {
    id: string;
    ticket_number: string;
    status: DiegoTicket["status"];
    priority: DiegoTicket["priority"];
    cost_bucket: DiegoTicket["costBucket"];
    estimated_cost: string | number | null;
    raw_report: string;
    diagnosis_answer: string | null;
    created_at: string;
    unresolved_jd_keys: string[] | null;
    skeptic_flagged: boolean;
    skeptic_concerns: string[] | null;
    contractors: { name: string } | null;
  };

  const tickets: DiegoTicket[] = ((data ?? []) as unknown as Row[]).map((t) => {
    const unresolvedKeys = t.unresolved_jd_keys ?? [];
    return {
      id: t.id,
      ticketNumber: t.ticket_number,
      status: t.status,
      priority: t.priority,
      costBucket: t.cost_bucket,
      estimatedCost: t.estimated_cost !== null ? Number(t.estimated_cost) : null,
      rawReport: t.raw_report,
      diagnosis: t.diagnosis_answer,
      unitNumber: locale.unitNumber,
      propertyName: locale.propertyName,
      unresolvedKeys,
      showWatermark: unresolvedKeys.length > 0,
      contractorName: t.contractors?.name ?? null,
      skepticFlagged: t.skeptic_flagged,
      skepticConcerns: t.skeptic_concerns ?? [],
      createdAt: t.created_at,
    };
  });

  return { locale, tickets };
}

export async function fetchLocaleOptions(): Promise<LocaleOption[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("locales")
    .select("id, unit_number, tenant_entity, properties ( name )")
    .order("unit_number", { ascending: true });

  if (error || !data) return [];

  type Row = { id: string; unit_number: string; tenant_entity: string | null; properties: { name: string } | null };
  return (data as unknown as Row[]).map((l) => ({
    id: l.id,
    unitNumber: l.unit_number,
    tenantEntity: l.tenant_entity,
    propertyName: l.properties?.name ?? "?",
  }));
}
