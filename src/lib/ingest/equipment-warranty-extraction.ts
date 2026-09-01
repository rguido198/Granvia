import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { CANONICAL_CLAUDE_MODEL } from "@/lib/llm/provider";
import {
  EquipmentWarrantyExtractedFieldsSchema,
  type EquipmentWarrantyExtractedFields,
} from "./equipment-warranty-extraction-schema";

const SYSTEM_PROMPT = `Extraes datos estructurados de una póliza de garantía, certificado técnico o manual de mantenimiento de equipos de infraestructura comercial.

Analiza el texto y extrae:
- equipment_name: Nombre comercial o descriptivo del equipo o sistema.
- category: Selecciona exactamente una de las siguientes categorías de infraestructura: "HVAC", "ELEVATOR", "POWER", "ROOF", "FIRE", "SOLAR", "SECURITY", "PLANT", "GENERAL".
- make: Marca o fabricante del equipo.
- model: Modelo o especificación técnica.
- serial_number: Número de serie, capacidad o identificador único.
- service_contract_provider: Empresa o proveedor autorizado de servicio/mantenimiento.
- coverage_summary: Resumen conciso de los términos de cobertura de la garantía.
- install_date: Fecha de instalación o inicio en formato "YYYY-MM-DD" (o null si no figura).
- warranty_expiry_date: Fecha de vencimiento de la garantía o póliza en formato "YYYY-MM-DD" (o null si no figura).`;

export async function extractEquipmentWarrantyFromText(rawText: string): Promise<EquipmentWarrantyExtractedFields> {
  const client = new Anthropic();

  const response = await client.messages.parse({
    model: CANONICAL_CLAUDE_MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Texto de la póliza o manual de garantía:\n${rawText}` }],
    output_config: { format: zodOutputFormat(EquipmentWarrantyExtractedFieldsSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("La extracción de la garantía no devolvió resultados estructurados.");
  }

  return response.parsed_output;
}
