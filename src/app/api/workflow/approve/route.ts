import { resumeHook } from "workflow/api";
import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE,
  readConsoleCredentials,
  verifySessionToken,
} from "@/lib/console-session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Wakes Diego's suspended workflow run for a ticket sitting at
 * needs_approval — the Tier 3 human gate created by createHook() in
 * src/workflows/diego-triage.ts.
 *
 * Gated by the existing /consola session cookie (the same check
 * middleware.ts already runs) rather than new auth infrastructure — the
 * pragmatic bridge until real per-landlord Supabase Auth exists. This is a
 * shared credential, not a per-user one, so there is no landlord identity to
 * attribute the approval to yet; see the note on approved_by below.
 */
export async function POST(request: NextRequest) {
  const credentials = readConsoleCredentials();
  if (!credentials) {
    return NextResponse.json({ error: "console not configured" }, { status: 503 });
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token, credentials.secret))) {
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

  // Audit trail: this table row, not a hardcoded log line, is the durable
  // record of who resolved the Tier 3 gate and when. approved_by stays null
  // until real per-landlord auth exists — the /consola cookie identifies a
  // shared credential, not an individual, so there's no auth.users id to
  // attribute this to honestly.
  await supabase.from("ticket_status_history").insert({
    ticket_id: ticketId,
    from_status: "needs_approval",
    to_status: approved ? "dispatched" : "closed_administrative",
    note: approved
      ? "Aprobado vía /consola (sesión compartida)"
      : "Rechazado vía /consola (sesión compartida)",
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
