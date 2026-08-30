import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { transitionResultToResponse, type TicketTransitionResult } from "@/lib/tickets/transition-result";

/**
 * Second half of the two-step close — the tenant's own confirmation that
 * mark-resolved's landlord-recorded work actually happened.
 *
 * confirm_ticket_resolution()
 * (supabase/migrations/20260829000008_ticket_transition_rpcs.sql) checks
 * the ticket's locale_id against profile.localeId **inside the same
 * transaction as the transition itself**, not just here — the ticket id
 * alone is never enough authorization, and moving that check into
 * Postgres means it can't be bypassed by a route bug the way an
 * app-layer-only check could. This route still passes profile.localeId
 * through so the RPC has something to check against.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "tenant" || !profile.localeId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServiceClient();
  const { data: result, error } = await supabase.rpc("confirm_ticket_resolution", {
    p_ticket_id: id,
    p_locale_id: profile.localeId,
    p_confirmed_by: profile.fullName ?? profile.email,
  });

  if (error) {
    return NextResponse.json({ error: "no se pudo confirmar la resolución" }, { status: 500 });
  }

  return transitionResultToResponse(result as TicketTransitionResult);
}
