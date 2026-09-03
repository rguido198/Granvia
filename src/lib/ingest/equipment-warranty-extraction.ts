import "server-only";
import { callStructuredWithFallback } from "@/lib/llm/provider";
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
  return callStructuredWithFallback(
    SYSTEM_PROMPT,
    `Texto de la póliza o manual de garantía:\n${rawText}`,
    EquipmentWarrantyExtractedFieldsSchema,
    4000
  );
}
