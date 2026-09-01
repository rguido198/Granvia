import { describe, expect, it } from "vitest";
import { EquipmentWarrantyExtractedFieldsSchema } from "./equipment-warranty-extraction-schema";

describe("EquipmentWarrantyExtractedFieldsSchema", () => {
  it("validates a complete equipment warranty JSON object", () => {
    const validData = {
      equipment_name: "Chiller Centravac Trane 150 Ton",
      category: "HVAC",
      make: "Trane",
      model: "Centravac 150 Ton",
      serial_number: "TRN-2024-884",
      service_contract_provider: "Climas de Mexicali S.A. de C.V.",
      coverage_summary: "5 Años en Compresor & Condensador",
      install_date: "2024-11-14",
      warranty_expiry_date: "2029-11-14",
    };

    const parsed = EquipmentWarrantyExtractedFieldsSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.equipment_name).toBe("Chiller Centravac Trane 150 Ton");
      expect(parsed.data.category).toBe("HVAC");
    }
  });

  it("handles nullable fields gracefully", () => {
    const minimalData = {
      equipment_name: "Bomba Hidráulica Grundfos",
      category: "PLANT",
      make: null,
      model: null,
      serial_number: null,
      service_contract_provider: null,
      coverage_summary: "Cobertura 3 años",
      install_date: null,
      warranty_expiry_date: "2028-05-10",
    };

    const parsed = EquipmentWarrantyExtractedFieldsSchema.safeParse(minimalData);
    expect(parsed.success).toBe(true);
  });
});
