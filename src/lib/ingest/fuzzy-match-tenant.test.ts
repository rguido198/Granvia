import { describe, it, expect } from "vitest";
import { extractTenantNameFromDocumentText, matchTenant } from "./fuzzy-match-tenant";

const CANDIDATES = [
  { id: "loc-1", tenantEntity: "Ashley Furniture" },
  { id: "loc-2", tenantEntity: "MINT Boutique" },
  { id: "loc-3", tenantEntity: "Derma Club" },
];

describe("matchTenant", () => {
  it("matches an exact name with confidence 1.0", () => {
    const result = matchTenant("Ashley Furniture", CANDIDATES);
    expect(result?.localeId).toBe("loc-1");
    expect(result?.confidence).toBe(1);
  });

  it("matches a case/accent/whitespace-different name with high confidence", () => {
    const result = matchTenant("  ashley   furniture ", CANDIDATES);
    expect(result?.localeId).toBe("loc-1");
    expect(result!.confidence).toBeGreaterThan(0.9);
  });

  it("matches a name with an OCR-typo with lower but non-trivial confidence", () => {
    const result = matchTenant("Ashiey Fumiture", CANDIDATES); // two character substitutions
    expect(result?.localeId).toBe("loc-1");
    expect(result!.confidence).toBeGreaterThan(0.5);
    expect(result!.confidence).toBeLessThan(1);
  });

  it("returns null when nothing is close enough to be a plausible suggestion", () => {
    const result = matchTenant("Completely Unrelated Business Name Inc", CANDIDATES);
    expect(result).toBeNull();
  });

  it("returns null on an empty candidate list", () => {
    const result = matchTenant("Ashley Furniture", []);
    expect(result).toBeNull();
  });
});

/**
 * This helper feeds two consumers that must never disagree: the workflow's
 * fuzzy match (what the confidence score was computed from) and Gate 1's
 * review form (what the landlord is shown). Its behavior on the awkward
 * inputs is therefore the contract, not an implementation detail.
 */
describe("extractTenantNameFromDocumentText", () => {
  it("pulls the name off a plain ARRENDATARIO line", () => {
    const text = "CONTRATO DE ARRENDAMIENTO\nARRENDATARIO: Derma Club 2\nCláusula 1. Objeto.";
    expect(extractTenantNameFromDocumentText(text)).toBe("Derma Club 2");
  });

  it("strips a label prefix instead of leaving it on the name", () => {
    const text = "EL ARRENDATARIO: Ashley Furniture";
    expect(extractTenantNameFromDocumentText(text)).toBe("Ashley Furniture");
  });

  it("cuts at the first label, not the last, when a line mentions it twice", () => {
    const text = "ARRENDATARIO: MINT Boutique y el ARRENDATARIO sustituto";
    expect(extractTenantNameFromDocumentText(text)).toBe(
      "MINT Boutique y el ARRENDATARIO sustituto",
    );
  });

  it("returns null when the document has no ARRENDATARIO line", () => {
    expect(extractTenantNameFromDocumentText("Cláusula 1. Objeto del contrato.")).toBeNull();
  });

  it("returns null for a label with nothing after it, not an empty string", () => {
    expect(extractTenantNameFromDocumentText("ARRENDATARIO:   ")).toBeNull();
  });

  it("returns null on null raw_text (a document whose extraction never ran)", () => {
    expect(extractTenantNameFromDocumentText(null)).toBeNull();
  });

  it("produces a name the matcher can actually score against the roster", () => {
    const name = extractTenantNameFromDocumentText("ARRENDATARIO: Derma Club");
    const match = matchTenant(name ?? "", CANDIDATES);
    expect(match?.localeId).toBe("loc-3");
    expect(match?.confidence).toBe(1);
  });
});
