import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { LeadRow, LeadStage } from "@/lib/data/lead-types";

export type { LeadRow, LeadStage };

export async function fetchLeads(): Promise<LeadRow[]> {
  const supabase = getSupabaseServiceClient();

  const { data: leadRows, error: leadError } = await supabase
    .from("leads")
    .select(
      `
      id, applicant_entity, category, target_locale_id, contact_channel, source,
      notes, stage, lost_reason, converted_application_id, created_by, created_at, updated_at,
      locales ( unit_number, properties ( name ) )
    `,
    )
    .order("updated_at", { ascending: false });

  if (leadError) throw new Error(leadError.message);

  type RawRow = {
    id: string;
    applicant_entity: string;
    category: string;
    target_locale_id: string | null;
    contact_channel: string | null;
    source: string | null;
    notes: string | null;
    stage: LeadStage;
    lost_reason: string | null;
    converted_application_id: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    locales: { unit_number: string; properties: { name: string } | null } | null;
  };

  const rows = (leadRows ?? []) as unknown as RawRow[];
  const leadIds = rows.map((r) => r.id);

  const latestHistoryByLeadId = new Map<string, { note: string | null; actor: string }>();
  if (leadIds.length > 0) {
    const { data: historyRows } = await supabase
      .from("lead_stage_history")
      .select("lead_id, note, actor, changed_at")
      .in("lead_id", leadIds)
      .order("changed_at", { ascending: false });

    for (const h of (historyRows ?? []) as { lead_id: string; note: string | null; actor: string }[]) {
      if (!latestHistoryByLeadId.has(h.lead_id)) {
        latestHistoryByLeadId.set(h.lead_id, { note: h.note, actor: h.actor });
      }
    }
  }

  return rows.map((r) => {
    const history = latestHistoryByLeadId.get(r.id);
    return {
      id: r.id,
      applicantEntity: r.applicant_entity,
      category: r.category,
      targetLocaleId: r.target_locale_id,
      targetUnitCode: r.locales?.unit_number ?? null,
      targetPropertyName: r.locales?.properties?.name ?? null,
      contactChannel: r.contact_channel,
      source: r.source,
      notes: r.notes,
      stage: r.stage,
      lostReason: r.lost_reason,
      convertedApplicationId: r.converted_application_id,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      latestNote: history?.note ?? null,
      latestActor: history?.actor ?? null,
    };
  });
}
