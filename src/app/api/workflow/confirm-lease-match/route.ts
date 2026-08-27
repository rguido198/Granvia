import { NextResponse, type NextRequest } from "next/server";
import { resumeHook, start } from "workflow/api";
import { HookNotFoundError } from "workflow/internal/errors";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { leaseDigitizationWorkflow } from "@/workflows/lease-digitization";

/**
 * Wakes leaseDigitizationWorkflow's Gate 1 (entity reconciliation) —
 * src/workflows/lease-digitization.ts's `matchHook`, token
 * `lease-doc-match:${documentId}`.
 *
 * Beyond the hook resume itself, this route is the one place a
 * human/UI-supplied `correctedLocaleId` passes through before
 * `promoteMatch()` writes it straight onto `documents.locale_id` — so it's
 * validated here against a real `locales` row before resuming. Without this,
 * a bad id would silently no-op (foreign-key mismatch) or, worse, resolve to
 * the wrong locale if ids were ever reused. Gate 2's route validates its own
 * human-supplied payload (`correctedFields`) via a Zod schema instead, since
 * that payload is structured data rather than a bare id.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { documentId, confirmed, correctedLocaleId } = body as {
    documentId?: string;
    confirmed?: boolean;
    correctedLocaleId?: string;
  };

  if (typeof documentId !== "string" || typeof confirmed !== "boolean") {
    return NextResponse.json({ error: "documentId and confirmed are required" }, { status: 400 });
  }

  if (correctedLocaleId !== undefined) {
    const supabase = getSupabaseServiceClient();
    const { data: locale } = await supabase
      .from("locales")
      .select("id")
      .eq("id", correctedLocaleId)
      .maybeSingle();
    if (!locale) {
      return NextResponse.json({ error: "correctedLocaleId does not match a known locale" }, { status: 400 });
    }
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
  if (document.status !== "ready_for_triage") {
    // The panel renders `error` verbatim to the landlord, so the body carries a
    // Spanish sentence they can act on; the row status that produced it is a
    // debugging detail and stays in the server log.
    console.warn(
      `confirm-lease-match: document ${documentId} is '${document.status}', not 'ready_for_triage'`,
    );
    return NextResponse.json(
      { error: "Este contrato ya fue resuelto o cambió de estado. Actualiza la vista." },
      { status: 409 },
    );
  }

  try {
    // `verifiedById` is the authenticated landlord from getCurrentProfile()
    // above — never a client-supplied field. promoteMatch writes it to
    // documents.match_verified_by_id, the Tier 3 record of who authorized
    // this gate (root CLAUDE.md §3).
    const result = await resumeHook(`lease-doc-match:${documentId}`, {
      confirmed,
      correctedLocaleId,
      verifiedById: profile.id,
    });
    return NextResponse.json({ ok: true, runId: result.runId });
  } catch (error) {
    // The "resume or start" pattern @workflow/errors documents for
    // HookNotFoundError: the run this hook belonged to is gone (a dev-server
    // restart, an expired hook, or a workflow that never actually reached
    // this point) — document.status still says 'ready_for_triage', so
    // nothing was ever promoted, but there is no live hook left to resume.
    // The document itself isn't corrupt; only re-running the pipeline can
    // produce a fresh, resumable hook for it.
    if (HookNotFoundError.is(error)) {
      console.warn(
        `confirm-lease-match: hook gone for document ${documentId}, re-starting the workflow`,
        error,
      );
      const run = await start(leaseDigitizationWorkflow, [documentId]);
      await supabase.from("documents").update({ workflow_run_id: run.runId }).eq("id", documentId);
      return NextResponse.json(
        {
          error:
            "Este documento perdió su proceso de fondo y se está reprocesando desde cero. Espera unos segundos y vuelve a confirmar.",
        },
        { status: 409 },
      );
    }

    // Never echo the raw resumeHook error — it embeds the internal hook token.
    console.error(`confirm-lease-match: resumeHook failed for document ${documentId}`, error);
    return NextResponse.json(
      { error: "Este contrato ya fue resuelto o cambió de estado. Actualiza la vista." },
      { status: 409 },
    );
  }
}
