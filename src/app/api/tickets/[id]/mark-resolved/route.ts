import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { transitionResultToResponse, type TicketTransitionResult } from "@/lib/tickets/transition-result";

const MAX_FINAL_COST = 10_000_000;

/**
 * First half of the two-step ticket close diego-triage.ts never built: the
 * workflow's own Tier 3 gate ends at `dispatched` — there's no suspended
 * run left to wake here, so unlike /api/workflow/approve this calls a
 * direct-write RPC, not resumeHook(). mark_ticket_work_done()
 * (supabase/migrations/20260829000008_ticket_transition_rpcs.sql) does
 * the actual status-check + update + history-insert as one atomic
 * transaction — this route validates for a fast, friendly 400 and
 * translates the RPC's structured result to an HTTP status; the RPC's own
 * checks are the real boundary, not this one.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { workPerformed, finalCost } = body as { workPerformed?: string; finalCost?: number | null };

  if (typeof workPerformed !== "string" || !workPerformed.trim()) {
    return NextResponse.json({ error: "Describe el trabajo realizado." }, { status: 400 });
  }
  if (workPerformed.trim().length > 2000) {
    return NextResponse.json({ error: "La descripción es demasiado larga (máx. 2000 caracteres)." }, { status: 400 });
  }
  if (finalCost !== undefined && finalCost !== null) {
    if (typeof finalCost !== "number" || !Number.isFinite(finalCost)) {
      return NextResponse.json({ error: "El costo final debe ser un número." }, { status: 400 });
    }
    if (finalCost < 0) {
      return NextResponse.json({ error: "El costo final no puede ser negativo." }, { status: 400 });
    }
    if (finalCost > MAX_FINAL_COST) {
      return NextResponse.json({ error: "El costo final parece incorrecto — revísalo." }, { status: 400 });
    }
  }

  const supabase = getSupabaseServiceClient();
  const { data: result, error } = await supabase.rpc("mark_ticket_work_done", {
    p_ticket_id: id,
    p_actor: profile.fullName ?? profile.email,
    p_work_performed: workPerformed.trim(),
    p_final_cost: finalCost ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "no se pudo registrar el trabajo terminado" }, { status: 500 });
  }

  return transitionResultToResponse(result as TicketTransitionResult);
}
