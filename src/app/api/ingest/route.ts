import { randomUUID } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { start } from "workflow/api";

import { extractText } from "@/lib/ingest/extract-text";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { diegoTriageWorkflow } from "@/workflows/diego-triage";
import { marianaScreeningWorkflow } from "@/workflows/mariana-screening";

export const runtime = "nodejs"; // pdf-parse needs Node's Buffer, not the Edge runtime

const ALLOWED_KINDS = ["maintenance_ticket", "lease_application"] as const;
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
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `unsupported file type: ${file.type}` },
      { status: 400 },
    );
  }
  if (typeof localeId !== "string") {
    // Both kinds need one: Diego's ticket is about an existing occupied
    // unit, and Mariana's application names a target local too —
    // lease-screener/SKILL.md §2A lists "target local" as a required
    // intake field, not something resolved later.
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
