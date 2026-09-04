"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { LeaseClauseReviewStatus } from "@/lib/data/lease-clauses.server";

export type UpdateLeaseClauseResult = { error?: string };

/**
 * Tier 3 — the landlord-facing review action on Mariana's clause ledger.
 * Only touches review_status/flagged/agent_note; clause_text/clause_label
 * are extraction output and only change via replaceLeaseClauses (a
 * re-digitization, triggered from the Cloudflare Worker), never a direct
 * edit here.
 */
export async function updateLeaseClauseReviewAction(
  clauseId: string,
  updates: { reviewStatus?: LeaseClauseReviewStatus; flagged?: boolean; agentNote?: string | null },
): Promise<UpdateLeaseClauseResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return { error: "No autorizado" };
  }

  const payload: Record<string, unknown> = {};
  if (updates.reviewStatus !== undefined) payload.review_status = updates.reviewStatus;
  if (updates.flagged !== undefined) payload.flagged = updates.flagged;
  if (updates.agentNote !== undefined) payload.agent_note = updates.agentNote;
  if (Object.keys(payload).length === 0) return {};

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("lease_clauses").update(payload).eq("id", clauseId);
  if (error) return { error: error.message };

  revalidatePath("/consola");
  return {};
}
