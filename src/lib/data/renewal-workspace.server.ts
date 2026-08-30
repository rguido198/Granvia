import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { RENEWAL_OUTREACH_STAGES, type RenewalOutreachStage, type RenewalOutreachStatus } from "@/lib/data/renewal-outreach-types";

// Re-exported so existing callers (the route handler, landlord-dashboard.tsx)
// don't need a second import line — the real definitions live in
// renewal-outreach-types.ts specifically so renewal-workspace.tsx ("use
// client") can import them without pulling in this file's "server-only" guard.
export { RENEWAL_OUTREACH_STAGES, type RenewalOutreachStage, type RenewalOutreachStatus };

/** Latest outreach event per lease — "order by created_at desc,
 *  first-seen-per-id wins," the same pattern diego-tickets.server.ts
 *  already uses for pendingConfirmationSince. A lease with zero events is
 *  simply absent from the returned map (caller reads that as "not
 *  started," not a real event). */
export async function fetchRenewalOutreachStatus(leaseIds: string[]): Promise<Map<string, RenewalOutreachStatus>> {
  const result = new Map<string, RenewalOutreachStatus>();
  if (leaseIds.length === 0) return result;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("renewal_outreach_events")
    .select("lease_id, stage, note, actor, created_at")
    .in("lease_id", leaseIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  type Row = { lease_id: string; stage: RenewalOutreachStage; note: string | null; actor: string; created_at: string };
  for (const row of (data ?? []) as Row[]) {
    if (result.has(row.lease_id)) continue;
    result.set(row.lease_id, { stage: row.stage, note: row.note, actor: row.actor, createdAt: row.created_at });
  }

  return result;
}
