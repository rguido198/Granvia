import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/tickets/contractor-token";

export type ResolvedContractorToken = {
  tokenId: string;
  ticketId: string;
  ticketNumber: string;
  unitNumber: string;
  propertyName: string;
  rawReport: string;
  diagnosis: string | null;
  priority: string | null;
  contractorName: string;
  arrivedAt: string | null;
  status: string;
  dispatchedAt: string | null;
  slaOnsiteTarget: string | null;
  slaResolutionTarget: string | null;
};

/**
 * Resolves a contractor link token against DB. Hashes input token and
 * validates that token is unexpired and unused. Returns null if invalid.
 */
export async function resolveContractorToken(token: string): Promise<ResolvedContractorToken | null> {
  if (!token || typeof token !== "string") return null;

  const tokenHash = hashToken(token);
  const supabase = getSupabaseServiceClient();

  const { data: tokenRow, error: tokenError } = await supabase
    .from("contractor_access_tokens")
    .select("id, ticket_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError || !tokenRow) return null;
  if (tokenRow.used_at !== null) return null;

  const expiresAt = new Date(tokenRow.expires_at).getTime();
  if (Date.now() > expiresAt) return null;

  const { data: ticketRow, error: ticketError } = await supabase
    .from("tickets")
    .select(
      `
      id, ticket_number, status, priority, raw_report, diagnosis_answer,
      arrived_at, dispatched_at, sla_onsite_target, sla_resolution_target,
      locales ( unit_number, properties ( name ) ),
      contractors ( name )
    `,
    )
    .eq("id", tokenRow.ticket_id)
    .maybeSingle();

  if (ticketError || !ticketRow) return null;

  type Row = {
    id: string;
    ticket_number: string;
    status: string;
    priority: string | null;
    raw_report: string;
    diagnosis_answer: string | null;
    arrived_at: string | null;
    dispatched_at: string | null;
    sla_onsite_target: string | null;
    sla_resolution_target: string | null;
    locales: { unit_number: string; properties: { name: string } | null } | null;
    contractors: { name: string } | null;
  };

  const t = ticketRow as unknown as Row;

  return {
    tokenId: tokenRow.id,
    ticketId: t.id,
    ticketNumber: t.ticket_number,
    unitNumber: t.locales?.unit_number ?? "?",
    propertyName: t.locales?.properties?.name ?? "?",
    rawReport: t.raw_report,
    diagnosis: t.diagnosis_answer,
    priority: t.priority,
    contractorName: t.contractors?.name ?? "Contratista",
    arrivedAt: t.arrived_at,
    status: t.status,
    dispatchedAt: t.dispatched_at,
    slaOnsiteTarget: t.sla_onsite_target,
    slaResolutionTarget: t.sla_resolution_target,
  };
}
