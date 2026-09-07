import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { resolveAssetDisplayName } from "@/lib/data/equipment-assets.server";

export type DiegoTicket = {
  id: string;
  ticketNumber: string;
  status:
    | "pending_triage"
    | "pending_diagnosis"
    | "pending_warranty_check"
    | "pending_cost_attribution"
    | "pending_skeptic"
    | "needs_approval"
    | "dispatched"
    | "pending_confirmation"
    | "reopened"
    | "closed"
    | "closed_administrative";
  priority: "P1" | "P2" | "P3" | "P4" | null;
  costBucket: "ARRENDADOR" | "INQUILINO" | "CAM" | "PENDIENTE" | null;
  estimatedCost: number | null;
  tenantEntity: string | null;
  /** Free-text name of whoever actually reported the fault — distinct from
   *  tenantEntity, which names the business, not the person. Null on
   *  intake channels that never collect one (see the migration's own
   *  comment). */
  reporterName: string | null;
  rawReport: string;
  diagnosis: string | null;
  /** locales.id — the same value LeaseDetail.id carries (that file's own
   *  "id is actually the locale's id" convention) — lets a consumer match a
   *  ticket to its lease/local by id instead of a fragile unitNumber string
   *  compare. */
  localeId: string | null;
  unitNumber: string;
  propertyName: string;
  unresolvedKeys: string[];
  showWatermark: boolean;
  contractorName: string | null;
  skepticFlagged: boolean;
  skepticConcerns: string[];
  createdAt: string;
  updatedAt: string;
  /** Landlord-recorded description of what a dispatched ticket's
   *  contractor actually did — set by /api/tickets/[id]/mark-resolved,
   *  read null until then. */
  workPerformed: string | null;
  /** The real cost once work is marked done — distinct from estimatedCost,
   *  which is the pre-dispatch approval figure. Null until
   *  mark-resolved writes it. */
  finalCost: number | null;
  /** Name of the equipment/asset Diego's triage matched this ticket's report
   *  to (assets.name) — null when nothing in the tracked equipment list
   *  matched, which is the common case for reports that aren't about a
   *  major system (a leaking faucet, a broken light). */
  assetName: string | null;
  /** Whether Diego determined the matched asset's warranty/service contract
   *  covered this fault at triage time — what actually drove costBucket
   *  landing on ARRENDADOR at $0 instead of a real charge. Always false
   *  when assetName is null (no match to check coverage against). */
  warrantyCovered: boolean;
  /** When this ticket most recently entered pending_confirmation, per
   *  ticket_status_history — deliberately NOT updatedAt, which is a
   *  generic trigger-maintained column now (bumps on any update to the
   *  row, not just this transition) and would silently reset an overdue
   *  clock built on it. Null for any ticket not currently
   *  pending_confirmation, and always null from the tenant portal's own
   *  fetch (tenant-portal.server.ts) — the escalation UI that reads this
   *  is landlord-only. */
  pendingConfirmationSince: string | null;

  // — Agent provenance/trace fields, root claude.md's #4 frontend priority
  // ("agent trace / audit"). All real columns Diego's triage workflow
  // already writes (diego-triage.ts) but that never reached the frontend
  // before this — no new schema, no new writes. Always null from the
  // tenant portal's own fetch (tenant-portal.server.ts): a tenant has no
  // business reason to see the landlord's internal cost-attribution
  // reasoning or who on the landlord's team approved it.
  /** draft.lease_clause_citation — the specific clause or responsibility-
   *  matrix entry Diego cited for cost_bucket, verbatim. Null when nothing
   *  resolved it (cost_bucket lands on PENDIENTE in that case). */
  leaseClauseCitation: string | null;
  /** draft.diagnosis_source — where the diagnosis came from: manual
   *  lookup, the asset register, a submitted photo, or the tenant's own
   *  report text alone. */
  diagnosisSource: "manual" | "asset_register" | "photo" | "tenant_report" | null;
  /** draft.diagnostic_question_asked — the one clarifying question Diego
   *  asked to narrow the diagnosis, when it asked one. */
  diagnosisQuestion: string | null;
  /** agent_decisions.ai_draft.draft.priority_rationale — why this
   *  severity, in Diego's own words. Null for a ticket predating the
   *  agent_decisions write (2026-08-23) or if that insert ever failed
   *  silently (it's fire-and-forget, not part of the ticket transaction). */
  priorityRationale: string | null;
  /** agent_decisions.ai_draft.draft.jd05_applied — true when cost
   *  attribution fell through to the jurisdictional default (JD-05)
   *  because neither the responsibility matrix nor the lease's own
   *  maintenance clause covered the fault's system. Worth flagging
   *  distinctly: a JD-05 fallback is weaker evidence than a matrix hit or
   *  a cited clause, which is exactly the kind of thing a defensible
   *  approval needs to surface, not bury. Null alongside priorityRationale
   *  when no agent_decisions row exists. */
  jd05Applied: boolean | null;
  /** profiles.full_name (or email) for tickets.approved_by — who actually
   *  clicked Aprobar. Null until a landlord resolves the Tier 3 gate. */
  approvedByName: string | null;
  approvedAt: string | null;
};

export type DiegoKPIs = {
  totalActiveTickets: number;
  pendingApprovalsCount: number;
  /** sum(estimated_cost) where dispatched — in-flight committed spend, not
   * yet realized (final_cost is null until the ticket closes). */
  dispatchedCostInFlight: number;
  /** pending_confirmation for >48h since pendingConfirmationSince — the
   *  in-app "reminder" this project has instead of email/SMS (no channel
   *  exists): visible the moment a landlord opens Triage, not something
   *  they have to remember to check for. */
  overdueConfirmationsCount: number;
};

const OVERDUE_CONFIRMATION_MS = 48 * 60 * 60 * 1000;

export async function fetchDiegoTickets(): Promise<{ tickets: DiegoTicket[]; kpis: DiegoKPIs }> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      id, ticket_number, status, priority, cost_bucket, estimated_cost,
      tenant_entity, reporter_name, raw_report, diagnosis_answer, created_at, updated_at,
      work_performed, final_cost, unresolved_jd_keys, warranty_covered,
      skeptic_flagged, skeptic_concerns,
      lease_clause_citation, diagnosis_source, diagnosis_question, approved_by, approved_at,
      locale_id, locales ( unit_number, properties ( name ) ),
      contractors ( name ),
      assets ( name, model, make, manual_url )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  type Row = {
    id: string;
    ticket_number: string;
    status: DiegoTicket["status"];
    priority: DiegoTicket["priority"];
    cost_bucket: DiegoTicket["costBucket"];
    estimated_cost: string | number | null;
    tenant_entity: string | null;
    reporter_name: string | null;
    raw_report: string;
    diagnosis_answer: string | null;
    created_at: string;
    updated_at: string;
    work_performed: string | null;
    final_cost: string | number | null;
    unresolved_jd_keys: string[] | null;
    warranty_covered: boolean | null;
    skeptic_flagged: boolean;
    skeptic_concerns: string[] | null;
    lease_clause_citation: string | null;
    diagnosis_source: DiegoTicket["diagnosisSource"];
    diagnosis_question: string | null;
    approved_by: string | null;
    approved_at: string | null;
    locale_id: string | null;
    locales: { unit_number: string; properties: { name: string } | null } | null;
    contractors: { name: string } | null;
    assets: { name: string | null; model: string | null; make: string | null; manual_url: string | null } | null;
  };

  const rows = (data ?? []) as unknown as Row[];

  // Scoped to just the tickets currently pending_confirmation — a handful
  // at most, not a join across the whole history table for every ticket.
  // See DiegoTicket.pendingConfirmationSince's own doc comment for why
  // this can't just be updatedAt.
  const pendingConfirmationIds = rows.filter((t) => t.status === "pending_confirmation").map((t) => t.id);
  const pendingConfirmationSinceById = new Map<string, string>();
  if (pendingConfirmationIds.length > 0) {
    const { data: historyRows } = await supabase
      .from("ticket_status_history")
      .select("ticket_id, changed_at")
      .in("ticket_id", pendingConfirmationIds)
      .eq("to_status", "pending_confirmation")
      .order("changed_at", { ascending: false });
    // Ordered newest-first, so the first row seen per ticket_id is the
    // most recent transition into pending_confirmation — no need for a
    // separate max() aggregation query.
    for (const h of (historyRows ?? []) as { ticket_id: string; changed_at: string }[]) {
      if (!pendingConfirmationSinceById.has(h.ticket_id)) pendingConfirmationSinceById.set(h.ticket_id, h.changed_at);
    }
  }

  // Same "batch-fetch profiles by id" pattern audit-log.server.ts already
  // uses for approved_by — one query for every approver on this page,
  // not one per ticket.
  const approverIds = [...new Set(rows.map((t) => t.approved_by).filter((v): v is string => !!v))];
  const { data: approverProfiles } = approverIds.length
    ? await supabase.from("profiles").select("id, email, full_name").in("id", approverIds)
    : { data: [] };
  const approverById = new Map((approverProfiles ?? []).map((p) => [p.id, p]));

  // agent_decisions.ai_draft carries priority_rationale/jd05_applied —
  // Diego's two draft fields that never got a flat column on tickets
  // itself (unlike lease_clause_citation/diagnosis_source above). Scoped
  // to this page's own ticket ids, same batching reasoning as the
  // approver-profile fetch.
  const ticketIds = rows.map((t) => t.id);
  const { data: decisionRows } = ticketIds.length
    ? await supabase
        .from("agent_decisions")
        .select("ticket_id, ai_draft")
        .eq("skill", "maintenance-dispatcher")
        .in("ticket_id", ticketIds)
    : { data: [] };
  const decisionByTicketId = new Map(
    (decisionRows ?? []).map((d) => [
      d.ticket_id as string,
      d.ai_draft as { draft?: { priority_rationale?: string; jd05_applied?: boolean } },
    ]),
  );

  const tickets: DiegoTicket[] = rows.map((t) => {
    const unresolvedKeys = t.unresolved_jd_keys ?? [];
    return {
      id: t.id,
      ticketNumber: t.ticket_number,
      status: t.status,
      priority: t.priority,
      costBucket: t.cost_bucket,
      estimatedCost: t.estimated_cost !== null ? Number(t.estimated_cost) : null,
      tenantEntity: t.tenant_entity,
      reporterName: t.reporter_name,
      rawReport: t.raw_report,
      diagnosis: t.diagnosis_answer,
      localeId: t.locale_id,
      unitNumber: t.locales?.unit_number ?? "?",
      propertyName: t.locales?.properties?.name ?? "?",
      unresolvedKeys,
      showWatermark: unresolvedKeys.length > 0,
      contractorName: t.contractors?.name ?? null,
      skepticFlagged: t.skeptic_flagged,
      skepticConcerns: t.skeptic_concerns ?? [],
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      workPerformed: t.work_performed,
      finalCost: t.final_cost !== null ? Number(t.final_cost) : null,
      assetName: t.assets ? resolveAssetDisplayName(t.assets) : null,
      warrantyCovered: t.warranty_covered ?? false,
      pendingConfirmationSince: pendingConfirmationSinceById.get(t.id) ?? null,
      leaseClauseCitation: t.lease_clause_citation,
      diagnosisSource: t.diagnosis_source,
      diagnosisQuestion: t.diagnosis_question,
      priorityRationale: decisionByTicketId.get(t.id)?.draft?.priority_rationale ?? null,
      jd05Applied: decisionByTicketId.get(t.id)?.draft?.jd05_applied ?? null,
      approvedByName: t.approved_by ? (approverById.get(t.approved_by)?.full_name ?? approverById.get(t.approved_by)?.email ?? null) : null,
      approvedAt: t.approved_at,
    };
  });

  const kpis = tickets.reduce<DiegoKPIs>(
    (acc, t) => {
      if (t.status !== "closed" && t.status !== "closed_administrative") acc.totalActiveTickets += 1;
      if (t.status === "needs_approval") acc.pendingApprovalsCount += 1;
      if (t.status === "dispatched" && t.estimatedCost) acc.dispatchedCostInFlight += t.estimatedCost;
      if (
        t.status === "pending_confirmation" &&
        t.pendingConfirmationSince &&
        Date.now() - new Date(t.pendingConfirmationSince).getTime() > OVERDUE_CONFIRMATION_MS
      ) {
        acc.overdueConfirmationsCount += 1;
      }
      return acc;
    },
    { totalActiveTickets: 0, pendingApprovalsCount: 0, dispatchedCostInFlight: 0, overdueConfirmationsCount: 0 },
  );

  return { tickets, kpis };
}
