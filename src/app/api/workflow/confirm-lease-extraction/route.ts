import { NextResponse, type NextRequest } from "next/server";
import { resumeHook } from "workflow/api";
import { HookNotFoundError } from "workflow/internal/errors";

import { getCurrentProfile } from "@/lib/auth/server";
import { LeaseExtractedFieldsSchema, NewLeaseDetailsSchema } from "@/lib/ingest/lease-extraction-schema";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Wakes leaseDigitizationWorkflow's Gate 2 (extraction accuracy) —
 * src/workflows/lease-digitization.ts's `extractionHook`, token
 * `lease-doc-extraction:${documentId}`.
 *
 * `action` is one of three landlord decisions, all routed through this same
 * endpoint: "confirm" promotes the (possibly edited) fields onto the lease;
 * "rescan" discards the current read and re-extracts the same document;
 * "reject" ends the document with nothing promoted.
 *
 * `correctedFields`/`newLeaseDetails`, when present, are validated against
 * their schemas before the hook resumes — `promoteExtraction()` writes them
 * straight onto `leases`, so a malformed payload is rejected here rather than
 * corrupting that row.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { documentId, action, correctedFields, newLeaseDetails } = body as {
    documentId?: string;
    action?: string;
    correctedFields?: unknown;
    newLeaseDetails?: unknown;
  };

  if (
    typeof documentId !== "string" ||
    (action !== "confirm" && action !== "rescan" && action !== "reject")
  ) {
    return NextResponse.json(
      { error: "documentId and a valid action ('confirm' | 'rescan' | 'reject') are required" },
      { status: 400 },
    );
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

  let parsedNewLeaseDetails;
  if (newLeaseDetails !== undefined) {
    const parsed = NewLeaseDetailsSchema.safeParse(newLeaseDetails);
    if (!parsed.success) {
      console.warn(
        `confirm-lease-extraction: newLeaseDetails failed schema validation for document ${documentId}`,
        parsed.error.issues,
      );
      return NextResponse.json(
        {
          error:
            "Los datos del nuevo contrato no tienen el formato esperado. Revisa el inquilino, las fechas y la renta.",
        },
        { status: 400 },
      );
    }
    parsedNewLeaseDetails = parsed.data;
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
  // 'needs_new_lease' is Gate 2's own follow-up state (promoteExtraction
  // found no active lease to promote onto and is waiting on tenant/term/rent
  // details) — a valid pre-state for resuming the same hook, not just
  // 'attached'.
  if (document.status !== "attached" && document.status !== "needs_new_lease") {
    // Same rule as the Gate 1 route: the panel renders `error` verbatim to the
    // landlord, so the row status stays in the log and the body stays Spanish.
    console.warn(
      `confirm-lease-extraction: document ${documentId} is '${document.status}', not 'attached' or 'needs_new_lease'`,
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
      action,
      correctedFields: parsedFields,
      newLeaseDetails: parsedNewLeaseDetails,
      verifiedById: profile.id,
    });
    return NextResponse.json({ ok: true, runId: result.runId });
  } catch (error) {
    // Unlike Gate 1 (confirm-lease-match/route.ts), a dead hook here can't
    // self-heal by re-starting the workflow: a fresh run always begins at
    // Gate 1 (loadDocumentContext → extraction → the match hook), which
    // would silently flip this already-`attached` document's status back to
    // `ready_for_triage` — undoing the Gate 1 confirmation a landlord already
    // made, not just re-running the step they were already about to redo.
    // That's a real, surprising side effect a silent auto-restart shouldn't
    // spring on someone, so this surfaces the true cause instead and tells
    // the landlord what recovering it actually requires: re-confirming Gate 1
    // for the same document (the "Pendiente: confirmar local" card,
    // reachable once the document's status is nudged back — currently a
    // support/dev action, not a self-serve one).
    if (HookNotFoundError.is(error)) {
      console.warn(
        `confirm-lease-extraction: hook gone for document ${documentId}`,
        error,
      );
      return NextResponse.json(
        {
          error:
            "Este documento perdió su proceso de fondo y no se puede validar desde aquí. Contacta a soporte para reiniciarlo — no se perdió ningún dato, pero habrá que confirmar el local (Gate 1) de nuevo.",
        },
        { status: 409 },
      );
    }

    // Never echo the raw resumeHook error — it embeds the internal hook token.
    console.error(`confirm-lease-extraction: resumeHook failed for document ${documentId}`, error);
    return NextResponse.json(
      { error: "Esta extracción ya fue validada o el contrato cambió de estado. Actualiza la vista." },
      { status: 409 },
    );
  }
}
