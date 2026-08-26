import { createHook, FatalError } from "workflow";

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { extractFromText, extractFromVision } from "@/lib/ingest/lease-extraction";
import { extractTenantNameFromDocumentText, matchTenant } from "@/lib/ingest/fuzzy-match-tenant";
import type { LeaseExtractedFields, NewLeaseDetails } from "@/lib/ingest/lease-extraction-schema";

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

// ── Step 3b: re-run extraction after a Gate 2 rejection ─────────────────────

/** Surfaces the retry as "Extrayendo…" in the panel (STATUS_LABELS already
 *  has this state — a rejection re-extracting is the same wait as the first
 *  pass, from a landlord's point of view) and hides the stale review form,
 *  since LegalDocumentsPanel only renders it at status 'attached'. */
async function markReExtracting(documentId: string): Promise<void> {
  "use step";
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("documents")
    .update({ status: "extracting", updated_at: new Date().toISOString() })
    .eq("id", documentId);
}

async function recordReExtraction(documentId: string, extraction: ExtractionResult): Promise<void> {
  "use step";
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("documents")
    .update({
      extracted_fields: extraction.extractedFields,
      status: "attached",
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}

// ── Step 4: promote the confirmed extraction onto the current lease ─────────

async function promoteExtraction(
  documentId: string,
  localeId: string,
  decision: {
    confirmed: boolean;
    correctedFields?: LeaseExtractedFields;
    newLeaseDetails?: NewLeaseDetails;
    verifiedById?: string;
  },
): Promise<"promoted" | "needs_new_lease"> {
  "use step";
  const supabase = getSupabaseServiceClient();

  // Unlike promoteMatch's lookup — which degrades safely to null and just
  // declines to promote — this row is the only fallback source for the fields
  // written onto the lease. A silent null would surface as a plain TypeError
  // on finalFields below and the step would retry forever. Fail fatally and
  // legibly instead, the same way loadDocumentContext does.
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

  let currentLeaseId = leaseRows?.[0]?.id as string | undefined;

  if (!currentLeaseId) {
    // Gate 1's locale picker deliberately offers vacant units too — a scanned
    // contract can legitimately belong to a unit with no `leases` row yet.
    if (!decision.newLeaseDetails) {
      // First time reaching this locale with no active lease: the match was
      // fine, there's just nothing to promote onto yet. Save finalFields onto
      // `documents` as a safe-deposit (it's the landlord's confirmed/edited
      // matrix — the only copy in existence once the caller's payload is
      // gone) and flip status to the dedicated `needs_new_lease` state so the
      // panel renders the follow-up form instead of looking stuck. Returning
      // this discriminator (rather than just writing the row) is what tells
      // the workflow loop to keep the same hook open for that follow-up,
      // instead of treating this call as done.
      await supabase
        .from("documents")
        .update({
          extracted_fields: finalFields,
          status: "needs_new_lease",
          error_message: "Local sin contrato activo — agrega el arrendatario primero",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);
      return "needs_new_lease";
    }

    // The follow-up form answered: create the missing lease and occupy the
    // locale. lease_id follows this dataset's existing convention (see any
    // row in `leases`: "LEASE-<unit_number>") rather than inventing a new one.
    const { data: locale, error: localeError } = await supabase
      .from("locales")
      .select("unit_number")
      .eq("id", localeId)
      .single();
    if (localeError || !locale) {
      throw new FatalError(
        `could not load locale ${localeId} to create new lease: ${localeError?.message ?? "no row returned"}`,
      );
    }

    const { data: newLease, error: insertError } = await supabase
      .from("leases")
      .insert({
        lease_id: `LEASE-${locale.unit_number}`,
        locale_id: localeId,
        tenant_entity: decision.newLeaseDetails.tenant_entity,
        start_date: decision.newLeaseDetails.start_date,
        end_date: decision.newLeaseDetails.end_date,
        base_rent_monthly: decision.newLeaseDetails.base_rent_monthly,
        responsibility_matrix: finalFields.responsibility_matrix,
        notice_period_days: finalFields.notice_period_days,
      })
      .select("id")
      .single();
    if (insertError || !newLease) {
      throw new FatalError(
        `could not create lease for locale ${localeId}: ${insertError?.message ?? "no row returned"}`,
      );
    }
    currentLeaseId = newLease.id as string;

    await supabase
      .from("locales")
      .update({ tenant_entity: decision.newLeaseDetails.tenant_entity, status: "OCCUPIED" })
      .eq("id", localeId);
  } else {
    await supabase
      .from("leases")
      .update({
        responsibility_matrix: finalFields.responsibility_matrix,
        notice_period_days: finalFields.notice_period_days,
      })
      .eq("id", currentLeaseId);
  }

  await supabase
    .from("documents")
    .update({
      extracted_fields: finalFields,
      status: "attached",
      error_message: null,
      extraction_verified_at: new Date().toISOString(),
      // Tier 3 audit trail (root CLAUDE.md §3), same rule as promoteMatch.
      extraction_verified_by_id: decision.verifiedById ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  return "promoted";
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

/**
 * Extracts a step failure's message without relying on `instanceof Error`.
 *
 * `"use workflow"` bodies run inside a Node `vm.Context` (see
 * `node_modules/@workflow/core/dist/vm/index.js`'s `createContext`, which
 * calls `vmCreateContext()` and does NOT inject the host's `Error` global).
 * When a step exhausts its retries, `dist/runtime/step-handler.js` bubbles
 * the failure up as a `step_failed` event; on replay,
 * `dist/step.js` turns that into `new FatalError(errorMessage)` —
 * constructed with the *host*-realm `FatalError` class (imported from
 * `@workflow/errors` into a host module) — and rejects the step's promise
 * with it. That rejection is awaited as-is (by reference, not cloned) inside
 * the sandboxed workflow code, so the `catch` here receives a real
 * `FatalError` object whose prototype chain is rooted in the *host's*
 * `Error.prototype` — not this sandbox's own `Error.prototype`. `instanceof
 * Error` inside the sandbox resolves `Error` to the sandbox's own
 * constructor, so it evaluates to `false` for that object and the real
 * message was being discarded in favor of the generic fallback below.
 *
 * The library's own code hits this exact problem and works around it the
 * same way twice: `dist/types.js`'s `normalizeSyncError` checks
 * `types.isNativeError(v)` (from `node:util`, which is realm-safe) instead
 * of `instanceof Error`; and `dist/workflow.js` explicitly throws
 * `new vmGlobalThis.Error(...)` — the *sandbox's* Error constructor — when it
 * wants a thrown error to satisfy `instanceof Error` from inside the vm.
 * `node:util` isn't available in here (no Node.js access inside `"use
 * workflow"`), so this duck-types on the `message` property instead, which
 * survives across realms since it's a plain string data property.
 */
function getStepFailureMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "extraction failed";
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
    await markExtractionFailed(documentId, getStepFailureMessage(error));
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
  //
  // One hook, iterated with `for await` rather than recreated per attempt —
  // this is the documented shape for a token that receives more than one
  // payload over its lifetime (@workflow/core's createHook: "Hooks
  // implement... AsyncIterable", with dispose() releasing the token once
  // done). A rejection re-runs extraction (same document, same locale — only
  // the field-level read was disputed, not the match) and the *same* hook
  // waits for another look, rather than stranding the document at `attached`
  // with no way forward short of a full re-upload. Capped at 3
  // re-extractions: each retry is a real paid Opus call, and a landlord
  // repeatedly rejecting the same document is a sign the source text itself
  // is bad, not something more retries fix — that case should surface as a
  // failure and point at re-upload, not loop forever.
  const extractionHook = createHook<{
    confirmed: boolean;
    correctedFields?: LeaseExtractedFields;
    newLeaseDetails?: NewLeaseDetails;
    verifiedById?: string;
  }>({
    token: `lease-doc-extraction:${documentId}`,
  });

  const MAX_REEXTRACTIONS = 3;
  let reextractions = 0;

  for await (const extractionDecision of extractionHook) {
    if (extractionDecision.confirmed) {
      const result = await promoteExtraction(documentId, localeId, extractionDecision);
      // "needs_new_lease" isn't a rejection — the extraction itself was
      // accepted, promotion just has nothing to write onto yet. Keep the
      // same hook open for the follow-up (tenant name / term / rent) instead
      // of falling through to dispose+return.
      if (result === "needs_new_lease") continue;
      extractionHook.dispose();
      return { documentId, status: "attached" };
    }

    if (reextractions >= MAX_REEXTRACTIONS) {
      await markExtractionFailed(
        documentId,
        "Extracción rechazada varias veces — vuelve a subir el documento para reintentar desde cero.",
      );
      extractionHook.dispose();
      return { documentId, status: "failed" };
    }
    reextractions++;

    await markReExtracting(documentId);
    try {
      extraction = await extractDocument(context);
    } catch (error) {
      await markExtractionFailed(documentId, getStepFailureMessage(error));
      extractionHook.dispose();
      return { documentId, status: "failed" };
    }
    await recordReExtraction(documentId, extraction);
  }

  // Unreachable in practice — the loop only exits via an explicit return
  // above, never by the hook's iterator naturally completing — but keeps
  // the function's return type honest instead of an implicit `undefined`.
  throw new FatalError(`lease-doc-extraction hook for ${documentId} ended without a decision`);
}
