import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Wakes Mariana's suspended workflow run for a lease application sitting at
 * needs_landlord_review — the Tier 3 human gate created by
 * step.waitForEvent() in workers/workflows/src/mariana-screening.ts. Mirrors
 * /api/workflow/approve (Diego's ticket equivalent) — separate route rather
 * than one branching on a `kind` param, since the two tables/status enums
 * don't overlap.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { applicationId, approved } = body as {
    applicationId?: string;
    approved?: boolean;
  };
  if (typeof applicationId !== "string" || typeof approved !== "boolean") {
    return NextResponse.json(
      { error: "applicationId (string) and approved (boolean) are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();
  const { data: application, error: fetchError } = await supabase
    .from("lease_applications")
    .select("id, status, workflow_run_id")
    .eq("id", applicationId)
    .single();

  if (fetchError || !application) {
    return NextResponse.json(
      { error: "lease application not found" },
      { status: 404 },
    );
  }
  if (application.status !== "needs_landlord_review") {
    return NextResponse.json(
      {
        error: `application is '${application.status}', not 'needs_landlord_review' — already resolved`,
      },
      { status: 409 },
    );
  }
  if (!application.workflow_run_id) {
    return NextResponse.json(
      { error: "application has no workflow run on record" },
      { status: 404 },
    );
  }

  // sendEvent first — see /api/workflow/approve for why: a missing/already-
  // resolved instance must not leave the DB claiming a decision was
  // delivered when it wasn't.
  const runId = application.workflow_run_id as string;
  try {
    const { env } = getCloudflareContext();
    const instance = await env.MARIANA_SCREENING_WORKFLOW.get(runId);
    await instance.sendEvent({
      type: `lease-application-review-${applicationId}`,
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

  // The workflow has already accepted the decision at this point — this
  // write is the audit trail, not the decision itself, and sendEvent can't
  // be rolled back if it fails. See /api/workflow/approve for the same
  // pattern and its note on why this stays a logged warning, not a durable
  // outbox/retry queue.
  const { error: updateError } = await supabase
    .from("lease_applications")
    .update({ reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (updateError) {
    console.error(
      `lease application ${applicationId}: sendEvent succeeded (runId ${runId}) but audit write failed`,
      updateError,
    );
    return NextResponse.json({
      runId,
      warning:
        "la decisión se envió al flujo de trabajo, pero no se pudo registrar en la auditoría — requiere revisión manual",
    });
  }

  return NextResponse.json({ runId });
}
