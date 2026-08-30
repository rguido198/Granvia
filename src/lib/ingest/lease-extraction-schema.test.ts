import { describe, it, expect } from "vitest";
import { LeaseExtractedFieldsSchema } from "./lease-extraction-schema";

describe("LeaseExtractedFieldsSchema", () => {
  it("accepts a well-formed extraction", () => {
    const result = LeaseExtractedFieldsSchema.safeParse({
      tenant_entity: "MINT Boutique, S.A. de C.V.",
      trade_name: null,
      start_date: "2024-01-15",
      end_date: "2026-01-15",
      base_rent_monthly: 48250.5,
      area_sqm: 95,
      exclusive_use_clause: "Exclusividad absoluta para venta de ropa de diseño importado para dama.",
      permitted_use: "Comercialización y venta de prendas de vestir, accesorios de diseñador y alta costura femenina.",
      responsibility_matrix: {
        hvac: "landlord",
        roof: "landlord",
        plumbing: "tenant",
        electrical: "tenant",
        storefront_glass: "tenant",
      },
      notice_period_days: 90,
      special_clauses: [{ label: "señalización exterior", text: "..." }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts null base_rent_monthly/area_sqm/exclusive_use_clause/permitted_use when the contract doesn't state them", () => {
    const result = LeaseExtractedFieldsSchema.safeParse({
      tenant_entity: "MINT Boutique, S.A. de C.V.",
      trade_name: null,
      start_date: "2024-01-15",
      end_date: "2026-01-15",
      base_rent_monthly: null,
      area_sqm: null,
      exclusive_use_clause: null,
      permitted_use: null,
      responsibility_matrix: {
        hvac: "landlord",
        roof: "landlord",
        plumbing: "tenant",
        electrical: "tenant",
        storefront_glass: "tenant",
      },
      notice_period_days: 90,
      special_clauses: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a non-null trade_name distinct from tenant_entity", () => {
    const result = LeaseExtractedFieldsSchema.safeParse({
      tenant_entity: "Restaurantes del Noroeste, S.A. de C.V.",
      trade_name: "Cabanna",
      start_date: "2024-01-15",
      end_date: "2026-01-15",
      base_rent_monthly: null,
      area_sqm: null,
      exclusive_use_clause: null,
      permitted_use: null,
      responsibility_matrix: {
        hvac: "landlord",
        roof: "landlord",
        plumbing: "tenant",
        electrical: "tenant",
        storefront_glass: "tenant",
      },
      notice_period_days: 90,
      special_clauses: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a responsibility value outside the enum", () => {
    const result = LeaseExtractedFieldsSchema.safeParse({
      responsibility_matrix: {
        hvac: "nobody", // not landlord | tenant | shared
        roof: "landlord",
        plumbing: "tenant",
        electrical: "tenant",
        storefront_glass: "tenant",
      },
      notice_period_days: 90,
      special_clauses: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a matrix missing one of the five required systems", () => {
    const result = LeaseExtractedFieldsSchema.safeParse({
      responsibility_matrix: {
        hvac: "landlord",
        roof: "landlord",
        plumbing: "tenant",
        electrical: "tenant",
        // storefront_glass omitted
      },
      notice_period_days: 90,
      special_clauses: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts the eight named clause fields when present or explicitly null", () => {
    const result = LeaseExtractedFieldsSchema.safeParse({
      tenant_entity: "MINT Boutique, S.A. de C.V.",
      trade_name: null,
      start_date: "2024-01-15",
      end_date: "2026-01-15",
      base_rent_monthly: null,
      area_sqm: null,
      exclusive_use_clause: null,
      permitted_use: null,
      parking_clause: "El Arrendatario tiene derecho a dos cajones reservados frente al Local.",
      directory_advertising_clause: null,
      expansion_option_clause: null,
      extended_hours_clause: null,
      signage_clause: null,
      pets_clause: null,
      sublease_restriction_clause: null,
      remodeling_clause: null,
      responsibility_matrix: {
        hvac: "landlord",
        roof: "landlord",
        plumbing: "tenant",
        electrical: "tenant",
        storefront_glass: "tenant",
      },
      notice_period_days: 90,
      special_clauses: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a payload predating the eight named clause fields (all omitted)", () => {
    // Same class of bug trade_name's .optional() already guards against: a
    // document extracted under the pre-this-change schema has extracted_fields
    // JSON with none of these keys at all, and .strict() must not reject it
    // over missing (not merely null) keys.
    const result = LeaseExtractedFieldsSchema.safeParse({
      tenant_entity: "MINT Boutique, S.A. de C.V.",
      trade_name: null,
      start_date: "2024-01-15",
      end_date: "2026-01-15",
      base_rent_monthly: null,
      area_sqm: null,
      exclusive_use_clause: null,
      permitted_use: null,
      responsibility_matrix: {
        hvac: "landlord",
        roof: "landlord",
        plumbing: "tenant",
        electrical: "tenant",
        storefront_glass: "tenant",
      },
      notice_period_days: 90,
      special_clauses: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an arbitrary hallucinated top-level key", () => {
    const result = LeaseExtractedFieldsSchema.safeParse({
      responsibility_matrix: {
        hvac: "landlord",
        roof: "landlord",
        plumbing: "tenant",
        electrical: "tenant",
        storefront_glass: "tenant",
      },
      notice_period_days: 90,
      special_clauses: [],
      deposit_amount_mxn: 50000, // not in the schema
    });
    expect(result.success).toBe(false);
  });
});
