import { start } from "workflow/api";
import { NextResponse, type NextRequest } from "next/server";

import { diegoTriageWorkflow } from "@/workflows/diego-triage";

/**
 * Manual/external trigger for Diego's triage workflow — mainly for testing
 * and re-running a stuck document. The automatic path is /api/ingest calling
 * start() directly once a document hits 'ready_for_triage', not this route.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { documentId, localeId } = body as { documentId?: string; localeId?: string };

  if (!documentId || !localeId) {
    return NextResponse.json({ error: "documentId and localeId are required" }, { status: 400 });
  }

  const run = await start(diegoTriageWorkflow, [documentId, localeId]);
  return NextResponse.json({ runId: run.runId }, { status: 202 });
}
