import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

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
  rawReport: string;
  diagnosis: string | null;
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
  /** When this ticket most recently entered pending_confirmation, per
   *  ticket_status_history — deliberately NOT updatedAt, which is a
   *  generic trigger-maintained column now (bumps on any update to the
   *  row, not just this transition) and would silently reset an overdue
   *  clock built on it. Null for any ticket not currently
   *  pending_confirmation, and always null from the tenant portal's own
   *  fetch (tenant-portal.server.ts) — the escalation UI that reads this
   *  is landlord-only. */
  pendingConfirmationSince: string | null;
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
      tenant_entity, raw_report, diagnosis_answer, created_at, updated_at,
      work_performed, final_cost, unresolved_jd_keys,
      skeptic_flagged, skeptic_concerns,
      locales ( unit_number, properties ( name ) ),
      contractors ( name )
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
    raw_report: string;
    diagnosis_answer: string | null;
    created_at: string;
    updated_at: string;
    work_performed: string | null;
    final_cost: string | number | null;
    unresolved_jd_keys: string[] | null;
    skeptic_flagged: boolean;
    skeptic_concerns: string[] | null;
    locales: { unit_number: string; properties: { name: string } | null } | null;
    contractors: { name: string } | null;
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
      rawReport: t.raw_report,
      diagnosis: t.diagnosis_answer,
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
      pendingConfirmationSince: pendingConfirmationSinceById.get(t.id) ?? null,
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
