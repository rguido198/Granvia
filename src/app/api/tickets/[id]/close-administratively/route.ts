import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { transitionResultToResponse, type TicketTransitionResult } from "@/lib/tickets/transition-result";

/**
 * The escalation path for a ticket sitting in pending_confirmation (or
 * reopened) with no tenant response — no email/SMS channel exists to
 * remind anyone, so this is a landlord-initiated close, not an automatic
 * timeout. The 48h "overdue" framing lives client-side
 * (DiegoKPIs.overdueConfirmationsCount, the drawer's own display) purely
 * to make this visible; nothing here blocks calling it earlier — the
 * landlord already has standing authority to close administratively
 * whenever they decide to.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServiceClient();
  const { data: result, error } = await supabase.rpc("close_ticket_administratively", {
    p_ticket_id: id,
    p_actor: profile.fullName ?? profile.email,
  });

  if (error) {
    return NextResponse.json({ error: "no se pudo cerrar el ticket" }, { status: 500 });
  }

  return transitionResultToResponse(result as TicketTransitionResult);
}
