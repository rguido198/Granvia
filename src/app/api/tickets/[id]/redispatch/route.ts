import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { transitionResultToResponse, type TicketTransitionResult } from "@/lib/tickets/transition-result";

/**
 * Landlord's response to a reopened ticket: send the same contractor back
 * out. redispatch_ticket() bumps dispatched_at to now — a re-dispatch is a
 * new repair attempt, not a continuation of the first one — while leaving
 * the original work_performed/final_cost on the row as evidence of what
 * didn't hold.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServiceClient();
  const { data: result, error } = await supabase.rpc("redispatch_ticket", {
    p_ticket_id: id,
    p_actor: profile.fullName ?? profile.email,
  });

  if (error) {
    return NextResponse.json({ error: "no se pudo reenviar el ticket" }, { status: 500 });
  }

  return transitionResultToResponse(result as TicketTransitionResult);
}
