import { createHook, FatalError } from "workflow";

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { extractFromText, extractFromVision } from "@/lib/ingest/lease-extraction";
import { matchTenant } from "@/lib/ingest/fuzzy-match-tenant";
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
  // tenant_entity is a required field in LeaseExtractedFieldsSchema — the
  // same Opus call that read the whole contract for
  // responsibility_matrix/notice_period_days/etc. already extracted this,
  // so match against it directly rather than re-deriving a name from a
  // narrower line-pattern regex over the raw text. portfolio.server.ts reads
  // the same `extracted_fields.tenant_entity` for the Legal tab's Gate 1
  // display, so the name the landlord is shown is provably the same string
  // this confidence score was computed from.
  const match = matchTenant(extraction.extractedFields.tenant_entity, context.candidates);
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
  // Only ever invoked with confirmed:true or a correctedLocaleId set — the
  // workflow loop below intercepts the reject case (neither present) before
  // calling this, so there's nothing to guard against here.
  decision: { confirmed: boolean; correctedLocaleId?: string; verifiedById?: string },
): Promise<string | null> {
  "use step";
  const supabase = getSupabaseServiceClient();

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

/** A genuine "discard this document" decision — distinct from a rescan
 *  (still trying to get a usable extraction) and from `failed` (an error,
 *  not a choice). Nothing is promoted to `leases`; the document just stops
 *  here. Same lightweight treatment as markExtractionFailed: an
 *  error_message for the landlord to read, no verified_at/by_id pair —
 *  those are reserved for actions that actually write data (root
 *  CLAUDE.md §3 ties that audit trail to Tier 3 actions, and declining to
 *  commit isn't one). */
async function markDocumentRejected(documentId: string): Promise<void> {
  "use step";
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("documents")
    .update({
      status: "rejected",
      error_message: "Documento rechazado — no se promovió ningún dato a la plaza.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}

// ── Step 4: promote the confirmed extraction onto the current lease ─────────

async function promoteExtraction(
  documentId: string,
  localeId: string,
  // Only ever invoked for action: "confirm" (see the workflow loop below) —
  // no `confirmed` field here since there is nothing left to branch on.
  decision: {
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

  const { data: locale, error: localeError } = await supabase
    .from("locales")
    .select("unit_number, tenant_entity, status")
    .eq("id", localeId)
    .single();
  if (localeError || !locale) {
    throw new FatalError(`could not load locale ${localeId}: ${localeError?.message ?? "no row returned"}`);
  }

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

  // Whether this confirm is starting a fresh tenancy rather than editing the
  // current tenant's own terms. True when the locale isn't actually occupied
  // by anyone (vacant, or genuinely lease-less) OR when the contract names
  // someone other than the locale's tenant of record — an expired-but-not-
  // yet-offboarded unit (locales.status still OCCUPIED, vacateTenantAction
  // never run) getting a new tenant's contract without a separate "vacate"
  // step first. Found live: uploading Sushi Central's contract onto MINT
  // Boutique's expired-but-still-OCCUPIED unit silently overwrote MINT's
  // lease row in place under MINT's own tenant_entity, because the old
  // lookup only asked "does a leases row exist," never "is it this same
  // tenant's." portfolio.server.ts already keys "active lease" off
  // locales.status, not date/existence alone — this mirrors that.
  const incomingTenant = finalFields.tenant_entity.trim().toLowerCase();
  const recordedTenant = locale.tenant_entity?.trim().toLowerCase();
  const isNewTenancy = locale.status !== "OCCUPIED" || !recordedTenant || incomingTenant !== recordedTenant;

  if (isNewTenancy) {
    if (!currentLeaseId && !decision.newLeaseDetails) {
      // First time reaching this locale with no lease row at all: the match
      // was fine, there's just nothing to promote onto yet. Save finalFields
      // onto `documents` as a safe-deposit (it's the landlord's confirmed/
      // edited matrix — the only copy in existence once the caller's payload
      // is gone) and flip status to the dedicated `needs_new_lease` state so
      // the panel renders the follow-up form instead of looking stuck.
      // Returning this discriminator (rather than just writing the row) is
      // what tells the workflow loop to keep the same hook open for that
      // follow-up, instead of treating this call as done.
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

    // Either the needs_new_lease follow-up answered (a genuinely lease-less
    // locale), or a tenant swap detected directly from the confirmed
    // extraction — finalFields already carries tenant_entity/start_date/
    // end_date/base_rent_monthly (LeaseExtractedFieldsSchema extracts them
    // unconditionally for exactly this reason), so no extra round-trip is
    // needed for the swap case. lease_id follows rent-roll-actions.ts's own
    // convention for a locale gaining a subsequent lease row (`newLeaseId`)
    // rather than the original "LEASE-<unit_number>" one, which only ever
    // held for a locale's first-ever lease — a second row for the same unit
    // would collide against `leases.lease_id`'s unique constraint.
    const leaseDetails = decision.newLeaseDetails ?? {
      tenant_entity: finalFields.tenant_entity,
      start_date: finalFields.start_date,
      end_date: finalFields.end_date,
      base_rent_monthly: finalFields.base_rent_monthly,
    };

    const { data: newLease, error: insertError } = await supabase
      .from("leases")
      .insert({
        lease_id: `LEASE-${locale.unit_number}-${Date.now()}`,
        locale_id: localeId,
        tenant_entity: leaseDetails.tenant_entity,
        start_date: leaseDetails.start_date,
        end_date: leaseDetails.end_date,
        base_rent_monthly: leaseDetails.base_rent_monthly,
        responsibility_matrix: finalFields.responsibility_matrix,
        notice_period_days: finalFields.notice_period_days,
        exclusive_use_clause: finalFields.exclusive_use_clause,
        permitted_use: finalFields.permitted_use,
        source_document_id: documentId,
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
      .update({
        tenant_entity: leaseDetails.tenant_entity,
        status: "OCCUPIED",
        ...(finalFields.area_sqm !== null ? { area_sqm: finalFields.area_sqm } : {}),
      })
      .eq("id", localeId);
  } else {
    if (finalFields.area_sqm !== null) {
      // A confirmed extraction is the contract's stated GLA — same rule as
      // the tenant/term/rent overwrite just above: this document is now the
      // authoritative source, not a value to leave stale forever because
      // nothing else in the pipeline ever writes `locales.area_sqm`.
      await supabase.from("locales").update({ area_sqm: finalFields.area_sqm }).eq("id", localeId);
    }

    await supabase
      .from("leases")
      .update({
        // A confirmed extraction asserts "this document is the current,
        // authoritative version of this lease" — tenant/term/rent included,
        // not just the matrix. Previously left untouched here on the
        // assumption an existing lease's core terms were already correct;
        // that's wrong whenever the uploaded contract is what actually
        // corrects or supersedes them (found live: an existing lease row
        // carried placeholder end_date/rent that didn't match the real
        // contract just confirmed).
        tenant_entity: finalFields.tenant_entity,
        start_date: finalFields.start_date,
        end_date: finalFields.end_date,
        base_rent_monthly: finalFields.base_rent_monthly,
        responsibility_matrix: finalFields.responsibility_matrix,
        notice_period_days: finalFields.notice_period_days,
        exclusive_use_clause: finalFields.exclusive_use_clause,
        permitted_use: finalFields.permitted_use,
        source_document_id: documentId,
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
): Promise<{ documentId: string; status: "attached" | "failed" | "rejected" }> {
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
  //
  // Iterated with `for await` rather than a single `await` — a landlord
  // rejecting the suggestion (confirmed:false, no correctedLocaleId) has to
  // actually discard the document and dispose the hook, not just consume it.
  // The single-`await` version could only ever resolve the hook once no
  // matter the decision, so a reject silently spent it while writing
  // nothing — stranding the document at `ready_for_triage` with no live
  // hook left, unrecoverable short of the resume-or-start path
  // confirm-lease-match/route.ts now has for a genuinely dead hook.
  const matchHook = createHook<{
    confirmed: boolean;
    correctedLocaleId?: string;
    verifiedById?: string;
  }>({
    token: `lease-doc-match:${documentId}`,
  });

  let localeId: string | null = null;
  for await (const matchDecision of matchHook) {
    if (!matchDecision.confirmed && !matchDecision.correctedLocaleId) {
      await markDocumentRejected(documentId);
      matchHook.dispose();
      return { documentId, status: "rejected" };
    }
    localeId = await promoteMatch(documentId, matchDecision);
    matchHook.dispose();
    break;
  }

  if (!localeId) {
    return { documentId, status: "failed" };
  }

  // Gate 2 (Tier 3) — extraction accuracy. Woken by the confirm-extraction
  // route calling resumeHook(`lease-doc-extraction:${documentId}`, ...).
  //
  // One hook, iterated with `for await` rather than recreated per attempt —
  // this is the documented shape for a token that receives more than one
  // payload over its lifetime (@workflow/core's createHook: "Hooks
  // implement... AsyncIterable", with dispose() releasing the token once
  // done). Three actions land here, not two: "confirm" promotes; "rescan"
  // re-runs extraction on the same document (same locale — only the
  // field-level read was disputed, not the match) and the *same* hook waits
  // for another look; "reject" ends the run with nothing promoted. Landlords
  // conflated the first version of "rescan" with a full "reject" — this is
  // the split that fixes that. Rescan is capped at 3 attempts: each is a
  // real paid Opus call, and repeatedly rescanning the same document is a
  // sign the source text itself is bad, not something more retries fix —
  // that case should surface as a failure and point at re-upload.
  const extractionHook = createHook<{
    action: "confirm" | "rescan" | "reject";
    correctedFields?: LeaseExtractedFields;
    newLeaseDetails?: NewLeaseDetails;
    verifiedById?: string;
  }>({
    token: `lease-doc-extraction:${documentId}`,
  });

  const MAX_REEXTRACTIONS = 3;
  let reextractions = 0;

  for await (const extractionDecision of extractionHook) {
    if (extractionDecision.action === "confirm") {
      const result = await promoteExtraction(documentId, localeId, extractionDecision);
      // "needs_new_lease" isn't a rejection — the extraction itself was
      // accepted, promotion just has nothing to write onto yet. Keep the
      // same hook open for the follow-up (tenant name / term / rent) instead
      // of falling through to dispose+return.
      if (result === "needs_new_lease") continue;
      extractionHook.dispose();
      return { documentId, status: "attached" };
    }

    if (extractionDecision.action === "reject") {
      await markDocumentRejected(documentId);
      extractionHook.dispose();
      return { documentId, status: "rejected" };
    }

    // action === "rescan"
    if (reextractions >= MAX_REEXTRACTIONS) {
      await markExtractionFailed(
        documentId,
        "Documento re-escaneado varias veces sin éxito — vuelve a subir el documento para reintentar desde cero.",
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
