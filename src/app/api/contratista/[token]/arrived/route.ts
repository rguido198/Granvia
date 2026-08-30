import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { resolveContractorToken } from "@/lib/data/contractor-execution.server";
import { transitionResultToResponse, type TicketTransitionResult } from "@/lib/tickets/transition-result";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveContractorToken(token);

  if (!resolved) {
    return NextResponse.json({ error: "enlace no válido o expirado" }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient();
  const { data: result, error } = await supabase.rpc("mark_ticket_arrived", {
    p_ticket_id: resolved.ticketId,
    p_actor: `Contratista: ${resolved.contractorName}`,
  });

  if (error) {
    return NextResponse.json({ error: "no se pudo registrar la llegada" }, { status: 500 });
  }

  return transitionResultToResponse(result as TicketTransitionResult);
}
