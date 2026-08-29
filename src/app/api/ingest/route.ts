import { randomUUID } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { start } from "workflow/api";

import { getCurrentProfile } from "@/lib/auth/server";
import { extractText } from "@/lib/ingest/extract-text";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { diegoTriageWorkflow } from "@/workflows/diego-triage";
import { leaseDigitizationWorkflow } from "@/workflows/lease-digitization";
import { marianaScreeningWorkflow } from "@/workflows/mariana-screening";

export const runtime = "nodejs"; // pdf-parse needs Node's Buffer, not the Edge runtime

// See the matching flag in legal-documents-panel.tsx — same reason, same
// on/off switch, flip both back together.
const LEASE_DIGITIZATION_PAUSED = false;

const ALLOWED_KINDS = ["maintenance_ticket", "lease_application", "active_lease"] as const;
type IngestKind = (typeof ALLOWED_KINDS)[number];

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/heic",
]);

/**
 * Single-file intake for Diego and Mariana. A landlord's ZIP of N lease
 * applications is a separate, later endpoint (Concept 2 — parallel
 * processing of a batch) that unzips and calls this same path N times; not
 * built here.
 *
 * Auth is per-kind, deliberately:
 *   - `maintenance_ticket` / `lease_application` stay OPEN. src/middleware.ts
 *     exempts /api/ from its gates precisely so these can be posted by
 *     systems with no browser session at all (a WhatsApp bridge, per
 *     maintenance-dispatcher/SKILL.md §1's intake channels). Do not add auth
 *     to those two — it would break the documented intake contract.
 *   - `active_lease` requires an authenticated landlord. It is only ever
 *     uploaded from the Legal tab by the landlord themselves, and an
 *     unauthenticated upload would push a document into a Tier 3 approval
 *     queue whose two gates write onto a real tenant's `leases` row.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind");
  const sourceChannel = formData.get("source_channel");
  const localeId = formData.get("locale_id");
  const description = formData.get("description");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (typeof kind !== "string" || !ALLOWED_KINDS.includes(kind as IngestKind)) {
    return NextResponse.json(
      { error: `kind must be one of: ${ALLOWED_KINDS.join(", ")}` },
      { status: 400 },
    );
  }
  if (kind === "active_lease") {
    // Mirrors LEASE_DIGITIZATION_PAUSED in legal-documents-panel.tsx, which
    // hides/disables the upload button for the same reason — flip both back
    // together when the org's Claude API credits are topped up.
    if (LEASE_DIGITIZATION_PAUSED) {
      return NextResponse.json(
        { error: "Ingesta de contratos pausada temporalmente — sin crédito de API disponible." },
        { status: 503 },
      );
    }
    // See the per-kind auth note above. Checked before the storage upload so
    // an unauthenticated caller can't even land bytes in the intake bucket.
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "landlord") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `unsupported file type: ${file.type}` },
      { status: 400 },
    );
  }
  if (kind === "active_lease" && file.type !== "application/pdf") {
    // The shared ALLOWED_MIME_TYPES allow-list above stays permissive for
    // Diego's and Mariana's photo uploads, but the lease-digitization
    // workflow's extractFromVision only accepts application/pdf (this
    // plan's Global Constraint: PDF only, no Word/.docx). Reject early
    // instead of letting a non-PDF active_lease upload fail later inside
    // the workflow.
    return NextResponse.json(
      { error: "active_lease documents must be application/pdf" },
      { status: 400 },
    );
  }
  if (kind !== "active_lease" && typeof localeId !== "string") {
    // Diego's ticket and Mariana's application both name a target local up
    // front. A lease document doesn't — bulk-drop matches it via fuzzy
    // tenant-name match inside leaseDigitizationWorkflow instead.
    return NextResponse.json(
      { error: "locale_id is required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();
  const storagePath = `${kind}/${randomUUID()}-${file.name}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("intake")
    .upload(storagePath, bytes, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 502 });
  }

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      kind,
      source_channel: typeof sourceChannel === "string" ? sourceChannel : null,
      original_filename: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      status: "extracting",
    })
    .select("id")
    .single();

  if (insertError || !document) {
    return NextResponse.json(
      { error: insertError?.message ?? "failed to record document" },
      { status: 500 },
    );
  }

  const documentId = document.id as string;

  // Scheduled via next/server's after() — guaranteed to run to completion
  // even though the response below is already on its way to the client.
  // On Vercel this is backed by waitUntil(), not a bare unawaited promise
  // that a frozen serverless invocation could drop.
  after(async () => {
    if (kind === "active_lease") {
      // Deliberately NO extractText() here.
      //
      // pdf-parse's bundled pdf.js throws `FormatError: bad XRef entry` as an
      // *unhandled promise rejection* — not a catchable synchronous throw — on
      // a real subset (~32%) of clean, valid lease PDFs. An unhandled
      // rejection isn't reliably scoped to the request that triggered it: with
      // concurrent bulk uploads it can be attributed to a different document's
      // try/catch, or kill the invocation outright and strand documents with
      // no error_message at all.
      //
      // The row is already inserted at status 'extracting', so dispatching the
      // workflow with raw_text still null is the whole fix: loadDocumentContext
      // reads null, extractDocument's `hasNativeText` is correctly false, and
      // it falls through to the Claude-vision path — which Task 12 showed
      // handles even the skewed scan that broke tesseract. Vision also carries
      // its own deterministic legibility gate, which pdf-parse never had.
      //
      // Side effect worth knowing: 'ready_for_triage' is now written exactly
      // once, by the workflow's recordSuggestion step, instead of twice.
      //
      // The maintenance_ticket / lease_application path below is untouched —
      // that bug's blast radius is this kind only, and those flows depend on
      // raw_text landing synchronously before their workflows start.
      const run = await start(leaseDigitizationWorkflow, [documentId]);
      await supabase
        .from("documents")
        .update({ workflow_run_id: run.runId })
        .eq("id", documentId);
      return;
    }

    try {
      // A photo carries no extractable text (extractText correctly returns
      // null for image/*) — but a tenant who attaches one usually also typed
      // what's wrong. Prefer that description over losing it silently.
      const rawText =
        file.type.startsWith("image/") && typeof description === "string" && description.trim()
          ? description.trim()
          : await extractText(bytes, file.type);
      await supabase
        .from("documents")
        .update({
          raw_text: rawText,
          status: "ready_for_triage",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);
    } catch (error) {
      console.error(`documents.${documentId} extraction failed`, error);
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "extraction failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);
      return;
    }

    if (typeof localeId === "string") {
      const run =
        kind === "maintenance_ticket"
          ? await start(diegoTriageWorkflow, [documentId, localeId])
          : await start(marianaScreeningWorkflow, [documentId, localeId]);
      await supabase
        .from("documents")
        .update({ workflow_run_id: run.runId })
        .eq("id", documentId);
    }
  });

  return NextResponse.json({ documentId }, { status: 202 });
}
