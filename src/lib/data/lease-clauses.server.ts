import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { LeaseClause, SpecialClause } from "./contract-status";
import type { LeaseExtractedFields } from "@/lib/ingest/lease-extraction-schema";

export type { LeaseClause, LeaseClauseReviewStatus } from "./contract-status";

// Same Spanish labels landlord-dashboard.tsx already renders for these eight
// fields (its allNamedClauses array) — kept as a literal list here rather
// than imported, same reasoning contract-status.ts's own NAMED_CLAUSES list
// already documents (one's UI, this is a data-layer module with no reason
// to depend on it, or vice versa).
const NAMED_CLAUSE_LABELS: Record<string, string> = {
  parking_clause: "Estacionamiento Reservado",
  directory_advertising_clause: "Publicidad en Directorio",
  expansion_option_clause: "Ampliación Futura",
  extended_hours_clause: "Horario Extendido",
  signage_clause: "Señalización Exterior",
  pets_clause: "Mascotas",
  sublease_restriction_clause: "Restricción de Subarrendamiento",
  remodeling_clause: "Remodelación",
};

/**
 * Assembles the complete per-clause list for a lease's ledger — exclusive_use_clause
 * and the eight named-clause fields (each already promoted to its own `leases`
 * column, kept there unchanged per the 2026-09-03 "coexist" decision) plus
 * special_clauses' catch-all entries, so the ledger is a complete inventory
 * of everything extraction found, not just the overflow bucket.
 */
export function buildFullClauseList(fields: LeaseExtractedFields): SpecialClause[] {
  const clauses: SpecialClause[] = [];
  if (fields.exclusive_use_clause) {
    clauses.push({ label: "Cláusula de Exclusividad", text: fields.exclusive_use_clause });
  }
  for (const [field, label] of Object.entries(NAMED_CLAUSE_LABELS)) {
    const text = (fields as unknown as Record<string, string | null>)[field];
    if (text) clauses.push({ label, text });
  }
  clauses.push(...fields.special_clauses);
  return clauses;
}

export async function fetchLeaseClausesByLeaseIds(leaseIds: string[]): Promise<Map<string, LeaseClause[]>> {
  const byLeaseId = new Map<string, LeaseClause[]>();
  if (leaseIds.length === 0) return byLeaseId;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("lease_clauses")
    .select("id, lease_id, source_document_id, clause_number, clause_label, clause_text, review_status, flagged, agent_note, created_at, updated_at")
    .in("lease_id", leaseIds)
    .order("clause_number");
  if (error) throw new Error(error.message);

  for (const r of data ?? []) {
    const clause: LeaseClause = {
      id: r.id,
      leaseId: r.lease_id,
      sourceDocumentId: r.source_document_id,
      clauseNumber: r.clause_number,
      clauseLabel: r.clause_label,
      clauseText: r.clause_text,
      reviewStatus: r.review_status,
      flagged: r.flagged,
      agentNote: r.agent_note,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
    const list = byLeaseId.get(clause.leaseId) ?? [];
    list.push(clause);
    byLeaseId.set(clause.leaseId, list);
  }
  return byLeaseId;
}

/**
 * Called from promoteExtraction (workers/workflows/src/lease-digitization.ts)
 * on every (re-)digitization — replaces a lease's full clause set rather
 * than appending, so re-extracting the same document doesn't accumulate
 * duplicate rows. clause_number is the special_clauses array's own 1-based
 * position, not a literal contract clause number (see the migration's own
 * comment for why). New rows always start `awaiting_reading`/unflagged —
 * this function doesn't try to preserve a landlord's prior review of a
 * clause whose text just changed underneath it.
 */
export async function replaceLeaseClauses(
  leaseId: string,
  sourceDocumentId: string | null,
  specialClauses: SpecialClause[] | null,
): Promise<void> {
  const supabase = getSupabaseServiceClient();

  const { error: deleteError } = await supabase.from("lease_clauses").delete().eq("lease_id", leaseId);
  if (deleteError) throw new Error(deleteError.message);

  if (!specialClauses || specialClauses.length === 0) return;

  const rows = specialClauses.map((clause, index) => ({
    lease_id: leaseId,
    source_document_id: sourceDocumentId,
    clause_number: index + 1,
    clause_label: clause.label,
    clause_text: clause.text,
  }));

  const { error: insertError } = await supabase.from("lease_clauses").insert(rows);
  if (insertError) throw new Error(insertError.message);
}
