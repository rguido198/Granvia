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
      // Same rule as this file's other error strings: the panel renders
      // `error` verbatim to the landlord, so the body stays Spanish and the
      // Zod detail stays in the server log.
      console.warn(
        `confirm-lease-extraction: correctedFields failed schema validation for document ${documentId}`,
        parsed.error.issues,
      );
      return NextResponse.json(
        {
          error:
            "Los datos corregidos no tienen el formato esperado. Revisa la matriz de responsabilidad y los días de aviso.",
        },
        { status: 400 },
      );
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
    // Same rule as the Gate 1 route: the panel renders `error` verbatim to the
    // landlord, so the row status stays in the log and the body stays Spanish.
    console.warn(
      `confirm-lease-extraction: document ${documentId} is '${document.status}', not 'attached'`,
    );
    return NextResponse.json(
      { error: "Esta extracción ya fue validada o el contrato cambió de estado. Actualiza la vista." },
      { status: 409 },
    );
  }

  try {
    // Same rule as the Gate 1 route: `verifiedById` comes from the
    // authenticated session, never the request body. promoteExtraction writes
    // it to documents.extraction_verified_by_id (root CLAUDE.md §3).
    const result = await resumeHook(`lease-doc-extraction:${documentId}`, {
      confirmed,
      correctedFields: parsedFields,
      verifiedById: profile.id,
    });
    return NextResponse.json({ ok: true, runId: result.runId });
  } catch (error) {
    // Never echo the raw resumeHook error — it embeds the internal hook token.
    console.error(`confirm-lease-extraction: resumeHook failed for document ${documentId}`, error);
    return NextResponse.json(
      { error: "Esta validación ya se registró o el contrato aún se está procesando. Actualiza la vista." },
      { status: 404 },
    );
  }
}
