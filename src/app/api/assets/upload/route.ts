import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { extractText } from "@/lib/ingest/extract-text";
import { matchesDeclaredType } from "@/lib/ingest/file-signature";
import { extractEquipmentWarrantyFromText } from "@/lib/ingest/equipment-warranty-extraction";
import type { EquipmentWarrantyExtractedFields } from "@/lib/ingest/equipment-warranty-extraction-schema";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "landlord") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "file exceeds 25MB limit" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uint8Array = new Uint8Array(buffer);
    if (!matchesDeclaredType(file.type, uint8Array)) {
      return NextResponse.json({ error: "file content does not match declared type" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const documentId = randomUUID();
    const storagePath = `warranties/${documentId}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) {
      console.error("Storage upload error:", uploadError.message);
      return NextResponse.json({ error: "storage upload failed" }, { status: 500 });
    }

    // Extract raw text from uploaded PDF/text file
    let rawText = "";
    try {
      const text = await extractText(uint8Array, file.type);
      rawText = text ?? "";
    } catch {
      rawText = `Manual de Garantía ${file.name}`;
    }

    // Store in documents table
    await supabase.from("documents").insert({
      id: documentId,
      kind: "maintenance_ticket",
      file_path: storagePath,
      mime_type: file.type,
      file_size_bytes: file.size,
      raw_text: rawText,
    });

    // Run AI Extraction for equipment warranty specs
    let extracted: EquipmentWarrantyExtractedFields = {
      equipment_name: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
      category: "GENERAL",
      make: null,
      model: null,
      serial_number: null,
      service_contract_provider: null,
      coverage_summary: "Póliza de Garantía Indexada",
      install_date: null,
      warranty_expiry_date: null,
    };

    if (rawText && rawText.length > 50) {
      try {
        extracted = await extractEquipmentWarrantyFromText(rawText);
      } catch (err) {
        console.warn("AI extraction warning:", err);
      }
    }

    // Get default locale for plaza
    const { data: locales } = await supabase.from("locales").select("id").limit(1);
    const localeId = locales?.[0]?.id ?? "00000000-0000-0000-0000-000000000000";

    const expiryStr = extracted.warranty_expiry_date ?? "";
    const isExpiryActive = Boolean(expiryStr && expiryStr > new Date().toISOString().slice(0, 10));

    // Insert new asset into PostgreSQL
    const newAssetObj = {
      locale_id: localeId,
      make: extracted.make || "General",
      model: extracted.model || extracted.equipment_name,
      install_date: extracted.install_date,
      warranty_expiry: extracted.warranty_expiry_date,
      service_contract_provider: extracted.service_contract_provider,
      manual_url: JSON.stringify({
        name: extracted.equipment_name,
        category: extracted.category,
        serialNumber: extracted.serial_number,
        coverage: extracted.coverage_summary,
        docName: file.name,
        sourceDocumentId: documentId,
        statusBadge: isExpiryActive ? "Garantía Activa ✓" : "Póliza Indexada",
        subtext: "Manual & Garantía Extraído por IA",
      }),
    };

    const { data: asset, error: assetErr } = await supabase.from("assets").insert(newAssetObj).select().single();
    if (assetErr) {
      console.error("Asset insert error:", assetErr.message);
      return NextResponse.json({ error: "failed to save asset record" }, { status: 500 });
    }

    return NextResponse.json({ success: true, assetId: asset.id, documentId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error in /api/assets/upload:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
