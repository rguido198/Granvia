import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { transitionResultToResponse, type TicketTransitionResult } from "@/lib/tickets/transition-result";

/**
 * The tenant's "El problema continúa" path — the confirmation gate can't
 * force a yes. reopen_ticket_from_confirmation()
 * (supabase/migrations/20260829000008_ticket_transition_rpcs.sql) checks
 * locale_id ownership the same way confirm-resolved's RPC does, and
 * writes the tenant's note into ticket_status_history as the record of
 * why this bounced back.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "tenant" || !profile.localeId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { note } = body as { note?: string };

  if (typeof note !== "string" || !note.trim()) {
    return NextResponse.json({ error: "Describe qué sigue mal." }, { status: 400 });
  }
  if (note.trim().length > 2000) {
    return NextResponse.json({ error: "La descripción es demasiado larga (máx. 2000 caracteres)." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data: result, error } = await supabase.rpc("reopen_ticket_from_confirmation", {
    p_ticket_id: id,
    p_locale_id: profile.localeId,
    p_note: note.trim(),
  });

  if (error) {
    return NextResponse.json({ error: "no se pudo reabrir el ticket" }, { status: 500 });
  }

  return transitionResultToResponse(result as TicketTransitionResult);
}
