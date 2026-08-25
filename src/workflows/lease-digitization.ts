import { createHook, FatalError } from "workflow";

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { extractFromText, extractFromVision } from "@/lib/ingest/lease-extraction";
import { extractTenantNameFromDocumentText, matchTenant } from "@/lib/ingest/fuzzy-match-tenant";
import type { LeaseExtractedFields } from "@/lib/ingest/lease-extraction-schema";

/**
 * Lease-document digitization as a durable state machine, mirroring
 * mariana-screening.ts's shape — same pattern, two human gates instead of one.
 *
 * An uploaded active-lease contract is extracted (native text where the PDF
 * carries it, Claude vision where it doesn't), fuzzy-matched to a locale, and
 * then suspended twice for a human to confirm:
 *   Gate 1 — entity reconciliation: is this the right tenant/locale?
 *   Gate 2 — extraction accuracy: are these the right responsibility_matrix
 *            and notice_period_days to write onto the lease?
 *
 * Both gates are Tier 3 (root CLAUDE.md §1): nothing lands on a `leases` row
 * without a person saying so. The two hook tokens below are the contract with
 * the resume routes — `lease-doc-match:${documentId}` and
 * `lease-doc-extraction:${documentId}`.
 *
 * Root CLAUDE.md §3 also requires a record of *who* authorized a Tier 3
 * action, so each hook payload carries the confirming landlord's
 * `verifiedById` (the resume routes already hold it from getCurrentProfile())
 * and the promote steps write it to `documents.match_verified_by_id` /
 * `documents.extraction_verified_by_id` alongside the matching timestamp.
 */

// ── Step 1: load the document plus every locale it could belong to ──────────

type DocumentContext = {
  documentId: string;
  storagePath: string;
  mimeType: string;
  rawText: string | null; // populated by pdf-parse in the ingest route, if native text existed
  candidates: { id: string; tenantEntity: string }[];
};

async function loadDocumentContext(documentId: string): Promise<DocumentContext> {
  "use step";
  const supabase = getSupabaseServiceClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, storage_path, mime_type, raw_text")
    .eq("id", documentId)
    .single();
  if (documentError || !document) {
    throw new FatalError(`document ${documentId} not found: ${documentError?.message}`);
  }

  // Unlike Mariana, this workflow isn't told a target locale — which locale
  // the contract belongs to is exactly what the fuzzy match determines — so
  // it loads every occupied locale in the plaza as a match candidate.
  const { data: locales } = await supabase
    .from("locales")
    .select("id, tenant_entity")
    .eq("status", "OCCUPIED")
    .not("tenant_entity", "is", null);

  return {
    documentId,
    storagePath: document.storage_path,
    mimeType: document.mime_type,
    rawText: document.raw_text,
    candidates: (locales ?? []).map((l) => ({ id: l.id, tenantEntity: l.tenant_entity as string })),
  };
}

// ── Step 2: extraction dispatch — native text if there is any, else vision ──

type ExtractionResult = { rawText: string; extractedFields: LeaseExtractedFields };

async function extractDocument(context: DocumentContext): Promise<ExtractionResult> {
  "use step";

  const hasNativeText = !!context.rawText && context.rawText.trim().split(/\s+/).length >= 20;
  if (hasNativeText) {
    const extractedFields = await extractFromText(context.rawText!);
    return { rawText: context.rawText!, extractedFields };
  }

  const supabase = getSupabaseServiceClient();
  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("intake")
    .download(context.storagePath);
  if (downloadError || !fileBlob) {
    throw new FatalError(`could not download ${context.storagePath}: ${downloadError?.message}`);
  }
  const bytes = new Uint8Array(await fileBlob.arrayBuffer());
  return extractFromVision(bytes, context.mimeType);
}

// ── Step 3: fuzzy match, record the suggestion, promote the human's answer ──

async function suggestMatch(
  context: DocumentContext,
  extraction: ExtractionResult,
): Promise<{ suggestedLocaleId: string | null; confidence: number | null }> {
  "use step";
  // The extraction's special_clauses/rawText don't carry a clean "tenant name"
  // field by design (the schema is scoped to the fields Diego/Renata/Mariana
  // need, not document metadata) — pull the likely name from the transcribed
  // "ARRENDATARIO: <name>" line every generated and real contract carries.
  //
  // Shared with the Legal tab's Gate 1 form (via portfolio.server.ts) rather
  // than inlined here, so the name the landlord is shown is provably the same
  // string this confidence score was computed from.
  const extractedName = extractTenantNameFromDocumentText(extraction.rawText) ?? "";

  const match = matchTenant(extractedName, context.candidates);
  return { suggestedLocaleId: match?.localeId ?? null, confidence: match?.confidence ?? null };
}

async function recordSuggestion(
  documentId: string,
  extraction: ExtractionResult,
  suggestion: { suggestedLocaleId: string | null; confidence: number | null },
): Promise<void> {
  "use step";
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("documents")
    .update({
      raw_text: extraction.rawText,
      extracted_fields: extraction.extractedFields,
      suggested_locale_id: suggestion.suggestedLocaleId,
      match_confidence: suggestion.confidence,
      status: "ready_for_triage",
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}

async function promoteMatch(
  documentId: string,
  decision: { confirmed: boolean; correctedLocaleId?: string; verifiedById?: string },
): Promise<string | null> {
  "use step";
  const supabase = getSupabaseServiceClient();

  if (!decision.confirmed && !decision.correctedLocaleId) {
    // Client rejected the suggestion without picking a replacement — leave
    // the document sitting in ready_for_triage rather than guessing.
    return null;
  }

  const { data: document } = await supabase
    .from("documents")
    .select("suggested_locale_id")
    .eq("id", documentId)
    .single();

  const finalLocaleId = decision.correctedLocaleId ?? document?.suggested_locale_id ?? null;
  if (!finalLocaleId) return null;

  await supabase
    .from("documents")
    .update({
      locale_id: finalLocaleId,
      match_verified_at: new Date().toISOString(),
      // Tier 3 audit trail (root CLAUDE.md §3) — the landlord profile the
      // confirm route authenticated, not the service role that writes the row.
      match_verified_by_id: decision.verifiedById ?? null,
      status: "attached",
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  return finalLocaleId;
}

// ── Step 4: promote the confirmed extraction onto the current lease ─────────

async function promoteExtraction(
  documentId: string,
  localeId: string,
  decision: { confirmed: boolean; correctedFields?: LeaseExtractedFields; verifiedById?: string },
): Promise<void> {
  "use step";
  const supabase = getSupabaseServiceClient();

  if (!decision.confirmed) return; // client rejected — leave attached, unverified, for a human to redo later

  // Unlike promoteMatch's lookup — which degrades safely to null and just
  // declines to promote — this row is the only fallback source for the fields
  // written onto the lease, and Gate 2's hook has already been consumed by the
  // time we get here (it cannot be re-fired). A silent null would surface as a
  // plain TypeError on finalFields below, the step would retry, and the
  // document would strand in `attached` with no extraction_verified_at. Fail
  // fatally and legibly instead, the same way loadDocumentContext does.
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("extracted_fields")
    .eq("id", documentId)
    .single();
  if (documentError || !document) {
    throw new FatalError(
      `could not load document ${documentId} to promote extraction: ${documentError?.message ?? "no row returned"}`,
    );
  }

  const finalFields = decision.correctedFields ?? (document.extracted_fields as LeaseExtractedFields);

  // "Current" lease for the locale is resolved the same way
  // portfolio.server.ts already does it — latest end_date among that locale's
  // leases rows — rather than inventing new selection logic here.
  const { data: leaseRows } = await supabase
    .from("leases")
    .select("id, end_date")
    .eq("locale_id", localeId)
    .order("end_date", { ascending: false })
    .limit(1);

  const currentLeaseId = leaseRows?.[0]?.id;
  if (!currentLeaseId) {
    // Gate 1's locale picker deliberately offers vacant units too — a scanned
    // contract can legitimately belong to a unit with no `leases` row yet. So
    // reaching here is a real, reachable state, not a corrupt one, and it
    // arrives AFTER Gate 2's single-use hook has already been consumed: a
    // throw here would kill the run with an opaque error and strand the
    // document unrecoverably.
    //
    // Write a landlord-readable explanation onto the row instead and leave
    // `status` at 'attached' — the *match* was fine, only the promotion has
    // nothing to write onto. Creating the missing `leases` row is explicitly
    // out of scope; that's a human decision, not this workflow's.
    //
    // finalFields is the landlord's confirmed/edited Gate 2 answer — the only
    // copy of it in existence once this hook resolves. Save it onto the
    // `documents` row as a safe-deposit even though there's no `leases` row to
    // promote onto, so it's never lost with no recovery path short of
    // re-upload + redoing both gates. This is NOT a promotion: no
    // extraction_verified_at is set, and nothing is written to `leases`.
    await supabase
      .from("documents")
      .update({
        extracted_fields: finalFields,
        error_message: "Local sin contrato activo — agrega el arrendatario primero",
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);
    return;
  }

  await supabase
    .from("leases")
    .update({
      responsibility_matrix: finalFields.responsibility_matrix,
      notice_period_days: finalFields.notice_period_days,
    })
    .eq("id", currentLeaseId);

  await supabase
    .from("documents")
    .update({
      extracted_fields: finalFields,
      extraction_verified_at: new Date().toISOString(),
      // Tier 3 audit trail (root CLAUDE.md §3), same rule as promoteMatch.
      extraction_verified_by_id: decision.verifiedById ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}

/**
 * Extraction is the one stage that can hard-fail on a document a human can
 * still do something about (an unreadable scan, a non-PDF that never should
 * have been accepted), so the failure is written back to the row rather than
 * left as a dead workflow run. This lives in its own step, not inline in the
 * workflow body: `"use workflow"` runs in a sandboxed VM with no Node.js
 * access, and getSupabaseServiceClient() pulls in `server-only` plus the
 * Supabase client — both of which need a real Node runtime.
 */
async function markExtractionFailed(documentId: string, message: string): Promise<void> {
  "use step";
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("documents")
    .update({
      status: "failed",
      error_message: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}

// ── The workflow ────────────────────────────────────────────────────────────

export async function leaseDigitizationWorkflow(
  documentId: string,
): Promise<{ documentId: string; status: "attached" | "failed" }> {
  "use workflow";

  const context = await loadDocumentContext(documentId);

  let extraction: ExtractionResult;
  try {
    extraction = await extractDocument(context);
  } catch (error) {
    await markExtractionFailed(
      documentId,
      error instanceof Error ? error.message : "extraction failed",
    );
    return { documentId, status: "failed" };
  }

  const suggestion = await suggestMatch(context, extraction);
  await recordSuggestion(documentId, extraction, suggestion);

  // Gate 1 (Tier 3) — entity reconciliation. Woken by the confirm-match route
  // calling resumeHook(`lease-doc-match:${documentId}`, ...).
  const matchHook = createHook<{
    confirmed: boolean;
    correctedLocaleId?: string;
    verifiedById?: string;
  }>({
    token: `lease-doc-match:${documentId}`,
  });
  const matchDecision = await matchHook;
  const localeId = await promoteMatch(documentId, matchDecision);

  if (!localeId) {
    return { documentId, status: "failed" }; // rejected with no replacement — stays ready_for_triage
  }

  // Gate 2 (Tier 3) — extraction accuracy. Woken by the confirm-extraction
  // route calling resumeHook(`lease-doc-extraction:${documentId}`, ...).
  const extractionHook = createHook<{
    confirmed: boolean;
    correctedFields?: LeaseExtractedFields;
    verifiedById?: string;
  }>({
    token: `lease-doc-extraction:${documentId}`,
  });
  const extractionDecision = await extractionHook;
  await promoteExtraction(documentId, localeId, extractionDecision);

  return { documentId, status: "attached" };
}
