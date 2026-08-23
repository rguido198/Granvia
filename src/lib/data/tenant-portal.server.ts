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
 * With a localeId (the real tenant's own session), resolves that exact
 * locale. Without one — the landlord's "Vista Inquilino" preview inside
 * /consola, which isn't scoped to any one tenant — falls back to the first
 * locale on file, same as before real auth existed.
 */
async function resolvePortalLocale(localeId?: string): Promise<PortalLocale | null> {
  const supabase = getSupabaseServiceClient();
  let query = supabase.from("locales").select("id, unit_number, tenant_entity, properties ( name )");
  query = localeId ? query.eq("id", localeId) : query.order("unit_number", { ascending: true }).limit(1);
  const { data, error } = await query.maybeSingle();

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

export async function fetchTenantPortalData(localeId?: string): Promise<{
  locale: PortalLocale | null;
  tickets: DiegoTicket[];
}> {
  const locale = await resolvePortalLocale(localeId);
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
