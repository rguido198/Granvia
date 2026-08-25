import { NextResponse, type NextRequest } from "next/server";
import { resumeHook } from "workflow/api";

import { getCurrentProfile } from "@/lib/auth/server";
import { LeaseExtractedFieldsSchema } from "@/lib/ingest/lease-extraction-schema";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Wakes leaseDigitizationWorkflow's Gate 2 (extraction accuracy) —
 * src/workflows/lease-digitization.ts's `extractionHook`, token
 * `lease-doc-extraction:${documentId}`.
 *
 * `correctedFields`, when present, is validated against
 * LeaseExtractedFieldsSchema before the hook resumes — `promoteExtraction()`
 * writes it straight onto `leases.responsibility_matrix` /
 * `notice_period_days`, so a malformed payload is rejected here rather than
 * corrupting that row.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { documentId, confirmed, correctedFields } = body as {
    documentId?: string;
    confirmed?: boolean;
    correctedFields?: unknown;
  };

  if (typeof documentId !== "string" || typeof confirmed !== "boolean") {
    return NextResponse.json({ error: "documentId and confirmed are required" }, { status: 400 });
  }

  let parsedFields;
  if (correctedFields !== undefined) {
    const parsed = LeaseExtractedFieldsSchema.safeParse(correctedFields);
    if (!parsed.success) {
      return NextResponse.json({ error: "correctedFields failed schema validation" }, { status: 400 });
    }
    parsedFields = parsed.data;
  }

  const supabase = getSupabaseServiceClient();
  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("id, status")
    .eq("id", documentId)
    .single();

  if (fetchError || !document) {
    return NextResponse.json({ error: "document not found" }, { status: 404 });
  }
  if (document.status !== "attached") {
    return NextResponse.json(
      { error: `document is '${document.status}', not 'attached' — already resolved` },
      { status: 409 },
    );
  }

  try {
    const result = await resumeHook(`lease-doc-extraction:${documentId}`, {
      confirmed,
      correctedFields: parsedFields,
    });
    return NextResponse.json({ ok: true, runId: result.runId });
  } catch (error) {
    return NextResponse.json(
      { error: `workflow hook not found or already resolved: ${error instanceof Error ? error.message : error}` },
      { status: 404 },
    );
  }
}
