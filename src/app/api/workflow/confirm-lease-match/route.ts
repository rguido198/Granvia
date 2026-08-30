import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

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
    return NextResponse.json(
      { error: "documentId and confirmed are required" },
      { status: 400 },
    );
  }

  if (correctedLocaleId !== undefined) {
    const supabase = getSupabaseServiceClient();
    const { data: locale } = await supabase
      .from("locales")
      .select("id")
      .eq("id", correctedLocaleId)
      .maybeSingle();
    if (!locale) {
      return NextResponse.json(
        { error: "correctedLocaleId does not match a known locale" },
        { status: 400 },
      );
    }
  }

  const supabase = getSupabaseServiceClient();
  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("id, status, workflow_run_id")
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
      {
        error:
          "Este contrato ya fue resuelto o cambió de estado. Actualiza la vista.",
      },
      { status: 409 },
    );
  }

  const { env } = getCloudflareContext();

  if (!document.workflow_run_id) {
    // No run on record at all — same self-heal path as a gone instance below.
    console.warn(
      `confirm-lease-match: document ${documentId} has no workflow run on record, starting one`,
    );
    const instance = await env.LEASE_DIGITIZATION_WORKFLOW.create({
      params: { documentId },
    });
    await supabase
      .from("documents")
      .update({ workflow_run_id: instance.id })
      .eq("id", documentId);
    return NextResponse.json(
      {
        error:
          "Este documento no tenía un proceso de fondo asociado y se está procesando desde cero. Espera unos segundos y vuelve a confirmar.",
      },
      { status: 409 },
    );
  }

  try {
    // `verifiedById` is the authenticated landlord from getCurrentProfile()
    // above — never a client-supplied field. promoteMatch writes it to
    // documents.match_verified_by_id, the Tier 3 record of who authorized
    // this gate (root CLAUDE.md §3).
    const instance = await env.LEASE_DIGITIZATION_WORKFLOW.get(
      document.workflow_run_id as string,
    );
    await instance.sendEvent({
      type: `lease-doc-match-${documentId}`,
      payload: { confirmed, correctedLocaleId, verifiedById: profile.id },
    });
    return NextResponse.json({ ok: true, runId: document.workflow_run_id });
  } catch (error) {
    // Resume-or-start: the run this document pointed at is gone (a dev-server
    // restart, an expired instance, or a workflow that never actually reached
    // this point) — document.status still says 'ready_for_triage', so
    // nothing was ever promoted, but there is no live instance left to
    // resume. The document itself isn't corrupt; only re-running the
    // pipeline can produce a fresh, resumable instance for it.
    //
    // Unlike the old Vercel-SDK version (which only restarted on the
    // specific HookNotFoundError, leaving other errors as a plain 409), this
    // restarts on ANY error from .get()/.sendEvent() — Cloudflare's exact
    // "instance not found" error shape isn't nailed down yet (no live account
    // to test against during this migration). Confirm the real error name
    // once deployed and narrow this catch if it turns out other, genuinely
    // transient errors are triggering unwanted restarts.
    console.warn(
      `confirm-lease-match: workflow instance gone for document ${documentId}, re-starting the workflow`,
      error,
    );
    const instance = await env.LEASE_DIGITIZATION_WORKFLOW.create({
      params: { documentId },
    });
    await supabase
      .from("documents")
      .update({ workflow_run_id: instance.id })
      .eq("id", documentId);
    return NextResponse.json(
      {
        error:
          "Este documento perdió su proceso de fondo y se está reprocesando desde cero. Espera unos segundos y vuelve a confirmar.",
      },
      { status: 409 },
    );
  }
}
