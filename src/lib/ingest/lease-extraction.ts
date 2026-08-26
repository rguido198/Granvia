import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { LeaseExtractedFieldsSchema, type LeaseExtractedFields } from "./lease-extraction-schema";
import { checkLegibility } from "./legibility-check";

const EXTRACTION_SYSTEM_PROMPT = `Extraes datos estructurados de un contrato de arrendamiento comercial mexicano.

tenant_entity: el nombre legal completo del ARRENDATARIO tal como aparece en el contrato (p. ej. "MINT Boutique, S.A. de C.V."), no un apodo ni el giro comercial.

start_date y end_date: fecha de inicio y de vencimiento del plazo forzoso, en formato ISO "YYYY-MM-DD".

base_rent_monthly: renta base mensual como número plano, sin símbolo de moneda ni separadores de miles (p. ej. 48250.50). Si el contrato no declara una renta fija en pesos (p. ej. renta variable pura, o el dato simplemente no aparece), usa null en vez de adivinar.

Para la matriz de responsabilidad de mantenimiento, clasifica cada uno de estos cinco sistemas como "landlord" (Arrendador), "tenant" (Arrendatario), o "shared" según lo que diga el contrato — si el contrato no lo especifica para un sistema, usa "shared" y anótalo en special_clauses en vez de adivinar:
- hvac (climatización)
- roof (techo / impermeabilización)
- plumbing (plomería)
- electrical (instalación eléctrica)
- storefront_glass (cristal de fachada)

notice_period_days: días de aviso previo requeridos para terminación anticipada, según el contrato.

special_clauses: cualquier cláusula fuera de lo estándar (uso de suelo específico, señalización, estacionamiento, restricciones de giro, elementos específicos de cocina/restaurante como trampa de grasa o campana de extracción, etc.) — no fuerces estos elementos en la matriz de responsabilidad universal, van aquí.

Responde solo con los campos estructurados solicitados.`;

export async function extractFromText(rawText: string): Promise<LeaseExtractedFields> {
  const client = new Anthropic();

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4000,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Texto del contrato:\n${rawText}` }],
    output_config: { format: zodOutputFormat(LeaseExtractedFieldsSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("lease extraction (text path) returned no parsed output");
  }

  // The legibility gate is not vision-only. pdf-parse can return a native text
  // layer that is mojibake or otherwise garbled (broken embedded encoding,
  // CID fonts with no ToUnicode map) — non-empty, so it passes the
  // `hasNativeText` word-count test in the workflow, and until now went
  // straight into extraction with no gate at all. Run the same deterministic
  // check the vision path runs, on the same kind of input (text already in
  // hand), and fail the same way: throw, so leaseDigitizationWorkflow marks
  // the document `failed` with a legible reason instead of promoting
  // confidently-shaped nonsense onto a `leases` row.
  const legibility = checkLegibility(rawText);
  if (!legibility.passed) {
    throw new Error(`illegible native text layer: ${legibility.reason}`);
  }

  return response.parsed_output;
}

const VisionExtractionSchema = z.object({
  transcribed_text: z.string(),
  fields: LeaseExtractedFieldsSchema,
});

const VISION_SYSTEM_PROMPT = `${EXTRACTION_SYSTEM_PROMPT}

Antes de extraer los campos, transcribe el texto completo del documento tal como aparece — esta transcripción se usa para verificar la calidad de la lectura, así que debe ser fiel al documento, no un resumen.`;

export async function extractFromVision(
  bytes: Uint8Array,
  mimeType: string,
): Promise<{ rawText: string; extractedFields: LeaseExtractedFields }> {
  if (mimeType !== "application/pdf") {
    throw new Error(`extractFromVision only supports application/pdf, got ${mimeType}`);
  }

  const client = new Anthropic();
  const base64 = Buffer.from(bytes).toString("base64");

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 6000,
    system: VISION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: mimeType as "application/pdf", data: base64 },
          },
          { type: "text", text: "Transcribe y extrae los campos de este contrato." },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(VisionExtractionSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("lease extraction (vision path) returned no parsed output");
  }

  const { transcribed_text, fields } = response.parsed_output;
  const legibility = checkLegibility(transcribed_text);
  if (!legibility.passed) {
    throw new Error(`illegible scan: ${legibility.reason}`);
  }

  return { rawText: transcribed_text, extractedFields: fields };
}
