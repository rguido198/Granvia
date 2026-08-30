import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { DiegoTicket } from "@/lib/data/diego-tickets.server";

export type PortalLocale = {
  id: string;
  unitNumber: string;
  tenantEntity: string;
  propertyName: string;
  areaSqm: number;
  monthlyRent: number | null;
  leaseEndDate: string | null;
};

export type LocaleOption = {
  id: string;
  unitNumber: string;
  tenantEntity: string | null;
  /** `locales.status` verbatim ("OCCUPIED" / "VACANT" / etc.) — the Legal
   *  tab's Gate 1 picker groups by this, and the overwrite-warning check
   *  mirrors lease-digitization.ts's own isNewTenancy predicate
   *  (`status !== "OCCUPIED"`), so this has to be the same ground truth,
   *  not a tenantEntity-nullness proxy. */
  status: string;
  propertyName: string;
};

/**
 * With a localeId (the real tenant's own session), resolves that exact
 * locale. Without one — the landlord's "Vista Inquilino" preview inside
 * /consola, which isn't scoped to any one tenant — falls back to the first
 * locale on file, same as before real auth existed.
 *
 * Two plain queries rather than an embedded locales->leases join — this
 * codebase hit a real bug earlier with PostgREST embedded-resource joins
 * silently dropping a joined column (mariana-screening.ts), so sequential
 * queries are the established pattern here.
 */
async function resolvePortalLocale(localeId?: string): Promise<PortalLocale | null> {
  const supabase = getSupabaseServiceClient();
  let query = supabase.from("locales").select("id, unit_number, area_sqm, tenant_entity, properties ( name )");
  query = localeId ? query.eq("id", localeId) : query.order("unit_number", { ascending: true }).limit(1);
  const { data, error } = await query.maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as {
    id: string;
    unit_number: string;
    area_sqm: number;
    tenant_entity: string | null;
    properties: { name: string } | null;
  };

  const { data: lease } = await supabase
    .from("leases")
    .select("base_rent_monthly, end_date")
    .eq("locale_id", row.id)
    .maybeSingle();

  return {
    id: row.id,
    unitNumber: row.unit_number,
    tenantEntity: row.tenant_entity ?? "Inquilino",
    propertyName: row.properties?.name ?? "?",
    areaSqm: Number(row.area_sqm),
    monthlyRent: lease ? Number(lease.base_rent_monthly) : null,
    leaseEndDate: lease?.end_date ?? null,
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
      raw_report, diagnosis_answer, created_at, updated_at,
      work_performed, final_cost, unresolved_jd_keys,
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
    updated_at: string;
    work_performed: string | null;
    final_cost: string | number | null;
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
      // The tenant portal's own tickets are always this tenant's — reuse the
      // resolved locale's name rather than adding a redundant select column.
      tenantEntity: locale.tenantEntity,
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
      updatedAt: t.updated_at,
      workPerformed: t.work_performed,
      finalCost: t.final_cost !== null ? Number(t.final_cost) : null,
      // Landlord-only escalation UI reads this — see its doc comment in
      // diego-tickets.server.ts. The tenant portal never needs it.
      pendingConfirmationSince: null,
    };
  });

  return { locale, tickets };
}

export async function fetchLocaleOptions(): Promise<LocaleOption[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("locales")
    .select("id, unit_number, tenant_entity, status, properties ( name )")
    .order("unit_number", { ascending: true });

  if (error || !data) return [];

  type Row = {
    id: string;
    unit_number: string;
    tenant_entity: string | null;
    status: string;
    properties: { name: string } | null;
  };
  return (data as unknown as Row[]).map((l) => ({
    id: l.id,
    unitNumber: l.unit_number,
    tenantEntity: l.tenant_entity,
    status: l.status,
    propertyName: l.properties?.name ?? "?",
  }));
}
