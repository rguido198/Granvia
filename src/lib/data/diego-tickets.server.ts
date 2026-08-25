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
};

export type DiegoKPIs = {
  totalActiveTickets: number;
  pendingApprovalsCount: number;
  /** sum(estimated_cost) where dispatched — in-flight committed spend, not
   * yet realized (final_cost is null until the ticket closes). */
  dispatchedCostInFlight: number;
};

export async function fetchDiegoTickets(): Promise<{ tickets: DiegoTicket[]; kpis: DiegoKPIs }> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      id, ticket_number, status, priority, cost_bucket, estimated_cost,
      tenant_entity, raw_report, diagnosis_answer, created_at, unresolved_jd_keys,
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
    unresolved_jd_keys: string[] | null;
    skeptic_flagged: boolean;
    skeptic_concerns: string[] | null;
    locales: { unit_number: string; properties: { name: string } | null } | null;
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
    };
  });

  const kpis = tickets.reduce<DiegoKPIs>(
    (acc, t) => {
      if (t.status !== "closed" && t.status !== "closed_administrative") acc.totalActiveTickets += 1;
      if (t.status === "needs_approval") acc.pendingApprovalsCount += 1;
      if (t.status === "dispatched" && t.estimatedCost) acc.dispatchedCostInFlight += t.estimatedCost;
      return acc;
    },
    { totalActiveTickets: 0, pendingApprovalsCount: 0, dispatchedCostInFlight: 0 },
  );

  return { tickets, kpis };
}
