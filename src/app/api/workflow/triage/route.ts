import { start } from "workflow/api";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { diegoTriageWorkflow } from "@/workflows/diego-triage";

/**
 * Manual/external trigger for Diego's triage workflow — mainly for testing
 * and re-running a stuck document. The automatic path is /api/ingest calling
 * start() directly once a document hits 'ready_for_triage', not this route.
 *
 * Gated by a real Supabase Auth session with role='landlord' — same pattern
 * as /api/workflow/approve. Without this, any caller who knew (or guessed)
 * a documentId/localeId pair could kick off a privileged, cost-incurring
 * workflow run for someone else's ticket at will.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { documentId, localeId } = body as { documentId?: string; localeId?: string };

  if (!documentId || !localeId) {
    return NextResponse.json({ error: "documentId and localeId are required" }, { status: 400 });
  }

  const run = await start(diegoTriageWorkflow, [documentId, localeId]);
  return NextResponse.json({ runId: run.runId }, { status: 202 });
}
