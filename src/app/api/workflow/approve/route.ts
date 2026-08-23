import { resumeHook } from "workflow/api";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Wakes Diego's suspended workflow run for a ticket sitting at
 * needs_approval — the Tier 3 human gate created by createHook() in
 * src/workflows/diego-triage.ts.
 *
 * Gated by a real Supabase Auth session with role='landlord' — the shared
 * CONSOLA cookie this used to check is gone. approved_by is a real
 * auth.users id now, not permanently null.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ticketId, approved } = body as { ticketId?: string; approved?: boolean };
  if (typeof ticketId !== "string" || typeof approved !== "boolean") {
    return NextResponse.json(
      { error: "ticketId (string) and approved (boolean) are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();
  const { data: ticket, error: fetchError } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("id", ticketId)
    .single();

  if (fetchError || !ticket) {
    return NextResponse.json({ error: "ticket not found" }, { status: 404 });
  }
  if (ticket.status !== "needs_approval") {
    return NextResponse.json(
      { error: `ticket is '${ticket.status}', not 'needs_approval' — already resolved` },
      { status: 409 },
    );
  }

  await supabase
    .from("tickets")
    .update({ approved_by: profile.id, approved_at: new Date().toISOString() })
    .eq("id", ticketId);

  // Audit trail: this table row, not a hardcoded log line, is the durable
  // record of who resolved the Tier 3 gate and when.
  await supabase.from("ticket_status_history").insert({
    ticket_id: ticketId,
    from_status: "needs_approval",
    to_status: approved ? "dispatched" : "closed_administrative",
    note: `${approved ? "Aprobado" : "Rechazado"} por ${profile.fullName ?? profile.email}`,
  });

  try {
    const result = await resumeHook(`ticket-approval:${ticketId}`, { approved });
    return NextResponse.json({ runId: result.runId });
  } catch (error) {
    return NextResponse.json(
      { error: `workflow hook not found or already resolved: ${error instanceof Error ? error.message : error}` },
      { status: 404 },
    );
  }
}
