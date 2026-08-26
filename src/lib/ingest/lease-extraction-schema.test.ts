import { describe, it, expect } from "vitest";
import { LeaseExtractedFieldsSchema } from "./lease-extraction-schema";

describe("LeaseExtractedFieldsSchema", () => {
  it("accepts a well-formed extraction", () => {
    const result = LeaseExtractedFieldsSchema.safeParse({
      tenant_entity: "MINT Boutique, S.A. de C.V.",
      start_date: "2024-01-15",
      end_date: "2026-01-15",
      base_rent_monthly: 48250.5,
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

  it("accepts a null base_rent_monthly when the contract states no fixed rent", () => {
    const result = LeaseExtractedFieldsSchema.safeParse({
      tenant_entity: "MINT Boutique, S.A. de C.V.",
      start_date: "2024-01-15",
      end_date: "2026-01-15",
      base_rent_monthly: null,
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
