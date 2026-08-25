import { NextResponse, type NextRequest } from "next/server";
import { resumeHook } from "workflow/api";

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
    return NextResponse.json(
      { error: `document is '${document.status}', not 'ready_for_triage' — already resolved` },
      { status: 409 },
    );
  }

  try {
    const result = await resumeHook(`lease-doc-match:${documentId}`, { confirmed, correctedLocaleId });
    return NextResponse.json({ ok: true, runId: result.runId });
  } catch (error) {
    return NextResponse.json(
      { error: `workflow hook not found or already resolved: ${error instanceof Error ? error.message : error}` },
      { status: 404 },
    );
  }
}
