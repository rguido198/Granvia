import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Wakes Diego's suspended workflow run for a ticket sitting at
 * needs_approval — the Tier 3 human gate created by
 * step.waitForEvent() in workers/workflows/src/diego-triage.ts.
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
  const { ticketId, approved } = body as {
    ticketId?: string;
    approved?: boolean;
  };
  if (typeof ticketId !== "string" || typeof approved !== "boolean") {
    return NextResponse.json(
      { error: "ticketId (string) and approved (boolean) are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();
  const { data: ticket, error: fetchError } = await supabase
    .from("tickets")
    .select("id, status, workflow_run_id")
    .eq("id", ticketId)
    .single();

  if (fetchError || !ticket) {
    return NextResponse.json({ error: "ticket not found" }, { status: 404 });
  }
  if (ticket.status !== "needs_approval") {
    return NextResponse.json(
      {
        error: `ticket is '${ticket.status}', not 'needs_approval' — already resolved`,
      },
      { status: 409 },
    );
  }
  if (!ticket.workflow_run_id) {
    return NextResponse.json(
      { error: "ticket has no workflow run on record" },
      { status: 404 },
    );
  }

  // sendEvent first: if the instance is gone or already past this wait
  // point, this throws and we return 404 with NO database writes at all —
  // previously the audit trail below was written first, so a missing
  // instance left the DB claiming a decision was made and delivered when it
  // never was.
  const runId = ticket.workflow_run_id as string;
  try {
    const { env } = getCloudflareContext();
    const instance = await env.DIEGO_TRIAGE_WORKFLOW.get(runId);
    await instance.sendEvent({
      type: `ticket-approval-${ticketId}`,
      payload: { approved },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `workflow instance not found or already resolved: ${error instanceof Error ? error.message : error}`,
      },
      { status: 404 },
    );
  }

  // The workflow has already accepted the decision at this point — these
  // two writes are the audit trail, not the decision itself, and there's no
  // way to roll sendEvent back if either fails. Check both explicitly and
  // report a distinct `auditWriteFailed` status rather than silently
  // returning as if nothing went wrong: a failure here needs someone to
  // reconcile the row by hand (a durable outbox/retry queue would close
  // this gap properly, but that's a bigger change than this fix pass).
  const { error: updateError } = await supabase
    .from("tickets")
    .update({ approved_by: profile.id, approved_at: new Date().toISOString() })
    .eq("id", ticketId);

  // Audit trail: this table row, not a hardcoded log line, is the durable
  // record of who resolved the Tier 3 gate and when. Written only after
  // sendEvent succeeded, so it can never claim a decision that wasn't
  // actually delivered to the workflow.
  const { error: historyError } = await supabase
    .from("ticket_status_history")
    .insert({
      ticket_id: ticketId,
      from_status: "needs_approval",
      to_status: approved ? "dispatched" : "closed_administrative",
      note: `${approved ? "Aprobado" : "Rechazado"} por ${profile.fullName ?? profile.email}`,
    });

  if (updateError || historyError) {
    console.error(
      `ticket ${ticketId}: sendEvent succeeded (runId ${runId}) but audit write failed`,
      { updateError, historyError },
    );
    return NextResponse.json({
      runId,
      warning:
        "la decisión se envió al flujo de trabajo, pero no se pudo registrar en la auditoría — requiere revisión manual",
    });
  }

  return NextResponse.json({ runId });
}
