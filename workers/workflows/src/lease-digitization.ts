import {
  WorkflowEntrypoint,
  type WorkflowStep,
  type WorkflowEvent,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import { getSupabaseServiceClient } from "../../../src/lib/supabase/server";
import {
  extractFromText,
  extractFromVision,
} from "../../../src/lib/ingest/lease-extraction";
import {
  isSameTenant,
  matchTenant,
} from "../../../src/lib/ingest/fuzzy-match-tenant";
import { checkExclusivityConflicts } from "../../../src/lib/ingest/exclusivity-check";
import type {
  LeaseExtractedFields,
  NewLeaseDetails,
} from "../../../src/lib/ingest/lease-extraction-schema";
import {
  hydrateProcessEnv,
  notifyCopilotoCacheStale,
  type WorkflowsEnv,
} from "./env";

/**
 * Lease-document digitization as a durable state machine, on Cloudflare
 * Workflows. Ported from src/workflows/lease-digitization.ts (the Vercel
 * `workflow` SDK version) — business logic unchanged; only the durable-
 * execution primitives differ.
 *
 * An uploaded active-lease contract is extracted (native text where the PDF
 * carries it, Claude vision where it doesn't), fuzzy-matched to a locale, and
 * then suspended twice for a human to confirm:
 *   Gate 1 — entity reconciliation: is this the right tenant/locale?
 *   Gate 2 — extraction accuracy: are these the right responsibility_matrix
 *            and notice_period_days to write onto the lease?
 *
 * Both gates are Tier 3 (root CLAUDE.md §1): nothing lands on a `leases` row
 * without a person saying so. The two event types below are the contract
 * with the resume routes — `lease-doc-match-${documentId}` and
 * `lease-doc-extraction-${documentId}` (dashes, not colons — Cloudflare's
 * step.waitForEvent() type must match ^[a-zA-Z0-9_][a-zA-Z0-9-_]*$).
 *
 * Root CLAUDE.md §3 also requires a record of *who* authorized a Tier 3
 * action, so each event payload carries the confirming landlord's
 * `verifiedById` (the resume routes already hold it from getCurrentProfile())
 * and the promote steps write it to `documents.match_verified_by_id` /
 * `documents.extraction_verified_by_id` alongside the matching timestamp.
 *
 * Vercel's `"use workflow"`-body VM-sandboxing workaround (a long comment
 * block in the source file, `getStepFailureMessage()`'s `instanceof Error`
 * duck-typing) has no equivalent here and is deliberately dropped: Cloudflare
 * Workflows runs `run()` and every `step.do()` callback as plain code in the
 * Worker itself, not inside a separate vm.Context — the cross-realm `Error`
 * problem that workaround existed for doesn't exist on this engine.
 */

type Params = { documentId: string };

type DocumentContext = {
  documentId: string;
  storagePath: string;
  mimeType: string;
  rawText: string | null;
  candidates: { id: string; tenantEntity: string; tradeName: string | null }[];
};

async function loadDocumentContext(
  documentId: string,
): Promise<DocumentContext> {
  const supabase = getSupabaseServiceClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, storage_path, mime_type, raw_text")
    .eq("id", documentId)
    .single();
  if (documentError || !document) {
    throw new NonRetryableError(
      `document ${documentId} not found: ${documentError?.message}`,
    );
  }

  const { data: locales } = await supabase
    .from("locales")
    .select("id, tenant_entity, trade_name")
    .eq("status", "OCCUPIED")
    .not("tenant_entity", "is", null);

  return {
    documentId,
    storagePath: document.storage_path,
    mimeType: document.mime_type,
    rawText: document.raw_text,
    candidates: (locales ?? []).map((l) => ({
      id: l.id,
      tenantEntity: l.tenant_entity as string,
      tradeName: l.trade_name,
    })),
  };
}

type ExtractionResult = {
  rawText: string;
  extractedFields: LeaseExtractedFields;
};

async function extractDocument(
  context: DocumentContext,
): Promise<ExtractionResult> {
  const hasNativeText =
    !!context.rawText && context.rawText.trim().split(/\s+/).length >= 20;
  if (hasNativeText) {
    const extractedFields = await extractFromText(context.rawText!);
    return { rawText: context.rawText!, extractedFields };
  }

  const supabase = getSupabaseServiceClient();
  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("intake")
    .download(context.storagePath);
  if (downloadError || !fileBlob) {
    throw new NonRetryableError(
      `could not download ${context.storagePath}: ${downloadError?.message}`,
    );
  }
  const bytes = new Uint8Array(await fileBlob.arrayBuffer());
  return extractFromVision(bytes, context.mimeType);
}

async function suggestMatch(
  context: DocumentContext,
  extraction: ExtractionResult,
): Promise<{ suggestedLocaleId: string | null; confidence: number | null }> {
  const match = matchTenant(
    extraction.extractedFields.tenant_entity,
    context.candidates,
    extraction.extractedFields.trade_name,
  );
  return {
    suggestedLocaleId: match?.localeId ?? null,
    confidence: match?.confidence ?? null,
  };
}

async function recordSuggestion(
  documentId: string,
  extraction: ExtractionResult,
  suggestion: { suggestedLocaleId: string | null; confidence: number | null },
): Promise<void> {
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
  decision: {
    confirmed: boolean;
    correctedLocaleId?: string;
    verifiedById?: string;
  },
): Promise<string | null> {
  const supabase = getSupabaseServiceClient();

  const { data: document } = await supabase
    .from("documents")
    .select("suggested_locale_id")
    .eq("id", documentId)
    .single();

  const finalLocaleId =
    decision.correctedLocaleId ?? document?.suggested_locale_id ?? null;
  if (!finalLocaleId) return null;

  await supabase
    .from("documents")
    .update({
      locale_id: finalLocaleId,
      match_verified_at: new Date().toISOString(),
      match_verified_by_id: decision.verifiedById ?? null,
      status: "attached",
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  return finalLocaleId;
}

async function markReExtracting(documentId: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("documents")
    .update({ status: "extracting", updated_at: new Date().toISOString() })
    .eq("id", documentId);
}

async function recordReExtraction(
  documentId: string,
  extraction: ExtractionResult,
): Promise<void> {
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

async function markDocumentRejected(documentId: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("documents")
    .update({
      status: "rejected",
      error_message:
        "Documento rechazado — no se promovió ningún dato a la plaza.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}

async function promoteExtraction(
  documentId: string,
  localeId: string,
  decision: {
    correctedFields?: LeaseExtractedFields;
    newLeaseDetails?: NewLeaseDetails;
    verifiedById?: string;
  },
  env: WorkflowsEnv,
): Promise<"promoted" | "needs_new_lease"> {
  const supabase = getSupabaseServiceClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("extracted_fields")
    .eq("id", documentId)
    .single();
  if (documentError || !document) {
    throw new NonRetryableError(
      `could not load document ${documentId} to promote extraction: ${documentError?.message ?? "no row returned"}`,
    );
  }

  const finalFields =
    decision.correctedFields ??
    (document.extracted_fields as LeaseExtractedFields);
  const extractedTradeName = finalFields.trade_name ?? null;

  const { data: locale, error: localeError } = await supabase
    .from("locales")
    .select("unit_number, tenant_entity, trade_name, status")
    .eq("id", localeId)
    .single();
  if (localeError || !locale) {
    throw new NonRetryableError(
      `could not load locale ${localeId}: ${localeError?.message ?? "no row returned"}`,
    );
  }

  const { data: leaseRows } = await supabase
    .from("leases")
    .select("id, end_date")
    .eq("locale_id", localeId)
    .order("end_date", { ascending: false })
    .limit(1);

  let currentLeaseId = leaseRows?.[0]?.id as string | undefined;

  const recordedTenant = locale.tenant_entity?.trim();
  const isNewTenancy =
    locale.status !== "OCCUPIED" ||
    !recordedTenant ||
    !isSameTenant(
      finalFields.tenant_entity,
      recordedTenant,
      extractedTradeName,
      locale.trade_name,
    );

  if (isNewTenancy) {
    if (!currentLeaseId && !decision.newLeaseDetails) {
      await supabase
        .from("documents")
        .update({
          extracted_fields: finalFields,
          status: "needs_new_lease",
          error_message:
            "Local sin contrato activo — agrega el arrendatario primero",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);
      return "needs_new_lease";
    }

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
        trade_name: extractedTradeName,
        start_date: leaseDetails.start_date,
        end_date: leaseDetails.end_date,
        base_rent_monthly: leaseDetails.base_rent_monthly,
        responsibility_matrix: finalFields.responsibility_matrix,
        notice_period_days: finalFields.notice_period_days,
        exclusive_use_clause: finalFields.exclusive_use_clause,
        permitted_use: finalFields.permitted_use,
        parking_clause: finalFields.parking_clause,
        directory_advertising_clause: finalFields.directory_advertising_clause,
        expansion_option_clause: finalFields.expansion_option_clause,
        extended_hours_clause: finalFields.extended_hours_clause,
        signage_clause: finalFields.signage_clause,
        pets_clause: finalFields.pets_clause,
        sublease_restriction_clause: finalFields.sublease_restriction_clause,
        remodeling_clause: finalFields.remodeling_clause,
        source_document_id: documentId,
      })
      .select("id")
      .single();
    if (insertError || !newLease) {
      throw new NonRetryableError(
        `could not create lease for locale ${localeId}: ${insertError?.message ?? "no row returned"}`,
      );
    }
    currentLeaseId = newLease.id as string;

    await supabase
      .from("locales")
      .update({
        tenant_entity: leaseDetails.tenant_entity,
        trade_name: extractedTradeName,
        status: "OCCUPIED",
        ...(finalFields.area_sqm !== null
          ? { area_sqm: finalFields.area_sqm }
          : {}),
      })
      .eq("id", localeId);
  } else {
    if (finalFields.area_sqm !== null) {
      await supabase
        .from("locales")
        .update({ area_sqm: finalFields.area_sqm })
        .eq("id", localeId);
    }
    if (
      extractedTradeName !== null &&
      extractedTradeName !== locale.trade_name
    ) {
      await supabase
        .from("locales")
        .update({ trade_name: extractedTradeName })
        .eq("id", localeId);
    }

    await supabase
      .from("leases")
      .update({
        tenant_entity: finalFields.tenant_entity,
        trade_name: extractedTradeName,
        start_date: finalFields.start_date,
        end_date: finalFields.end_date,
        base_rent_monthly: finalFields.base_rent_monthly,
        responsibility_matrix: finalFields.responsibility_matrix,
        notice_period_days: finalFields.notice_period_days,
        exclusive_use_clause: finalFields.exclusive_use_clause,
        permitted_use: finalFields.permitted_use,
        parking_clause: finalFields.parking_clause,
        directory_advertising_clause: finalFields.directory_advertising_clause,
        expansion_option_clause: finalFields.expansion_option_clause,
        extended_hours_clause: finalFields.extended_hours_clause,
        signage_clause: finalFields.signage_clause,
        pets_clause: finalFields.pets_clause,
        sublease_restriction_clause: finalFields.sublease_restriction_clause,
        remodeling_clause: finalFields.remodeling_clause,
        source_document_id: documentId,
      })
      .eq("id", currentLeaseId);
  }

  const { data: occupiedLocaleRows } = await supabase
    .from("locales")
    .select("id, unit_number")
    .eq("status", "OCCUPIED")
    .neq("id", localeId);
  const occupiedLocalesById = new Map(
    (occupiedLocaleRows ?? []).map((l) => [l.id, l]),
  );

  const { data: otherLeaseRows } = await supabase
    .from("leases")
    .select("locale_id, tenant_entity, exclusive_use_clause")
    .in("locale_id", [...occupiedLocalesById.keys()])
    .not("exclusive_use_clause", "is", null);

  const otherActiveLeasesWithExclusivity = (otherLeaseRows ?? [])
    .map((row) => ({
      unitCode:
        occupiedLocalesById.get(row.locale_id as string)?.unit_number ?? "?",
      tenantEntity: row.tenant_entity as string,
      exclusiveUseClause: row.exclusive_use_clause as string,
    }))
    .filter(
      (l, i, arr) =>
        arr.findIndex((other) => other.unitCode === l.unitCode) === i,
    );

  const conflicts = await checkExclusivityConflicts(
    {
      unitCode: locale.unit_number,
      tenantEntity: finalFields.tenant_entity,
      permittedUse: finalFields.permitted_use,
    },
    otherActiveLeasesWithExclusivity,
  );
  const conflictNote =
    conflicts.length > 0
      ? `Posible conflicto de exclusividad: ${conflicts
          .map(
            (c) =>
              `${c.tenant_entity} (Local ${c.unit_code}, ${c.severity}) — "${c.this_lease_term}" vs. cláusula "${c.protected_term}"`,
          )
          .join(
            "; ",
          )}. Requiere revisión legal antes de operar el giro tal cual está descrito.`
      : null;

  await supabase
    .from("documents")
    .update({
      extracted_fields: finalFields,
      status: "attached",
      error_message: conflictNote,
      extraction_verified_at: new Date().toISOString(),
      extraction_verified_by_id: decision.verifiedById ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  await notifyCopilotoCacheStale(env);

  return "promoted";
}

async function markExtractionFailed(
  documentId: string,
  message: string,
): Promise<void> {
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

const MAX_REEXTRACTIONS = 3;

export class LeaseDigitizationWorkflow extends WorkflowEntrypoint<
  WorkflowsEnv,
  Params
> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    hydrateProcessEnv(this.env);
    const { documentId } = event.payload;

    const context = await step.do("load document context", () =>
      loadDocumentContext(documentId),
    );

    let extraction: ExtractionResult;
    try {
      extraction = await step.do("extract document", () =>
        extractDocument(context),
      );
    } catch (error) {
      await step.do("mark extraction failed", () =>
        markExtractionFailed(documentId, getStepFailureMessage(error)),
      );
      return { documentId, status: "failed" as const };
    }

    const suggestion = await step.do("suggest match", () =>
      suggestMatch(context, extraction),
    );
    await step.do("record suggestion", () =>
      recordSuggestion(documentId, extraction, suggestion),
    );

    // Gate 1 (Tier 3) — entity reconciliation. Woken by the confirm-match
    // route sending an event of type `lease-doc-match-${documentId}`.
    let localeId: string | null = null;
    {
      const matchDecision = await step.waitForEvent<{
        confirmed: boolean;
        correctedLocaleId?: string;
        verifiedById?: string;
      }>("await entity match confirmation", {
        type: `lease-doc-match-${documentId}`,
        timeout: "30 days",
      });
      const decision = matchDecision.payload;
      if (!decision.confirmed && !decision.correctedLocaleId) {
        await step.do("mark document rejected (gate 1)", () =>
          markDocumentRejected(documentId),
        );
        return { documentId, status: "rejected" as const };
      }
      localeId = await step.do("promote match", () =>
        promoteMatch(documentId, decision),
      );
    }

    if (!localeId) {
      return { documentId, status: "failed" as const };
    }

    // Gate 2 (Tier 3) — extraction accuracy. Woken by the confirm-extraction
    // route sending an event of type `lease-doc-extraction-${documentId}`.
    // Vercel's single createHook, iterated with `for await` across multiple
    // resumes (rescan can re-arm it up to 3x), becomes an explicit loop here:
    // Cloudflare's step.waitForEvent() resolves once per call, so each
    // iteration below calls it again — safe because run() replays
    // deterministically from the top on every wake, which is exactly the
    // guarantee this loop shape relies on.
    let reextractions = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const extractionEvent = await step.waitForEvent<{
        action: "confirm" | "rescan" | "reject";
        correctedFields?: LeaseExtractedFields;
        newLeaseDetails?: NewLeaseDetails;
        verifiedById?: string;
      }>(`await extraction confirmation (attempt ${reextractions + 1})`, {
        type: `lease-doc-extraction-${documentId}`,
        timeout: "30 days",
      });
      const decision = extractionEvent.payload;

      if (decision.action === "confirm") {
        const result = await step.do(
          `promote extraction (attempt ${reextractions + 1})`,
          () => promoteExtraction(documentId, localeId!, decision, this.env),
        );
        if (result === "needs_new_lease") continue;
        return { documentId, status: "attached" as const };
      }

      if (decision.action === "reject") {
        await step.do("mark document rejected (gate 2)", () =>
          markDocumentRejected(documentId),
        );
        return { documentId, status: "rejected" as const };
      }

      // action === "rescan"
      if (reextractions >= MAX_REEXTRACTIONS) {
        await step.do("mark extraction failed (rescan cap)", () =>
          markExtractionFailed(
            documentId,
            "Documento re-escaneado varias veces sin éxito — vuelve a subir el documento para reintentar desde cero.",
          ),
        );
        return { documentId, status: "failed" as const };
      }
      reextractions++;

      await step.do(`mark re-extracting (attempt ${reextractions})`, () =>
        markReExtracting(documentId),
      );
      try {
        extraction = await step.do(
          `re-extract document (attempt ${reextractions})`,
          () => extractDocument(context),
        );
      } catch (error) {
        await step.do("mark extraction failed (rescan error)", () =>
          markExtractionFailed(documentId, getStepFailureMessage(error)),
        );
        return { documentId, status: "failed" as const };
      }
      await step.do(`record re-extraction (attempt ${reextractions})`, () =>
        recordReExtraction(documentId, extraction),
      );
    }
  }
}
