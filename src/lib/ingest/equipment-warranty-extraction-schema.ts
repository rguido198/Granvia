import { z } from "zod";

export const EquipmentWarrantyExtractedFieldsSchema = z.object({
  equipment_name: z.string().describe("Nombre del equipo o sistema (p. ej. 'Chiller Centravac Trane 150 Ton')"),
  category: z.enum([
    "HVAC",
    "ELEVATOR",
    "POWER",
    "ROOF",
    "FIRE",
    "SOLAR",
    "SECURITY",
    "PLANT",
    "GENERAL",
  ]).describe("Categoría del equipo"),
  make: z.string().nullable().describe("Marca o fabricante (p. ej. 'Trane', 'Schneider Electric')"),
  model: z.string().nullable().describe("Modelo o referencia técnica"),
  serial_number: z.string().nullable().describe("Número de serie o capacidad (p. ej. 'Serie: TRN-2024-884')"),
  service_contract_provider: z.string().nullable().describe("Proveedor de servicio o mantenimiendo autorizado"),
  coverage_summary: z.string().describe("Resumen de la cobertura de la garantía (p. ej. '5 Años en Compresor, Condensador & Evaporador')"),
  install_date: z.string().nullable().describe("Fecha de instalación en formato YYYY-MM-DD"),
  warranty_expiry_date: z.string().nullable().describe("Fecha de vencimiento de la garantía en formato YYYY-MM-DD"),
});

export type EquipmentWarrantyExtractedFields = z.infer<typeof EquipmentWarrantyExtractedFieldsSchema>;
