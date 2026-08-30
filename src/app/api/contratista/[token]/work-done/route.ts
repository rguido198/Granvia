import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { resolveContractorToken } from "@/lib/data/contractor-execution.server";
import { transitionResultToResponse, type TicketTransitionResult } from "@/lib/tickets/transition-result";

const MAX_FINAL_COST = 10_000_000;

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveContractorToken(token);

  if (!resolved) {
    return NextResponse.json({ error: "enlace no válido o expirado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
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
    p_ticket_id: resolved.ticketId,
    p_actor: `Contratista: ${resolved.contractorName}`,
    p_work_performed: workPerformed.trim(),
    p_final_cost: finalCost ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "no se pudo registrar el trabajo terminado" }, { status: 500 });
  }

  const transitionRes = result as TicketTransitionResult;
  if (transitionRes.ok) {
    // Mark token as used now that work is completed
    await supabase
      .from("contractor_access_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", resolved.tokenId);
  }

  return transitionResultToResponse(transitionRes);
}
