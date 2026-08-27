import { describe, it, expect } from "vitest";
import { matchTenant } from "./fuzzy-match-tenant";

const CANDIDATES = [
  { id: "loc-1", tenantEntity: "Ashley Furniture" },
  { id: "loc-2", tenantEntity: "MINT Boutique" },
  { id: "loc-3", tenantEntity: "Derma Club" },
];

// This plaza's own roster is inconsistent about carrying legal-entity
// suffixes: some rows are bare, some carry their own "S.A. de C.V." —
// mirrors the mix actually seen live (MINT Boutique bare, a decoy with it).
const CANDIDATES_MIXED_SUFFIXES = [
  { id: "loc-2", tenantEntity: "MINT Boutique" },
  { id: "loc-4", tenantEntity: "Cafetería El Puente S.A. de C.V." },
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

  it("matches a full legal name against a bare roster entry at full confidence", () => {
    // Regression for the live incident: extraction correctly reads "MINT
    // Boutique, S.A. de C.V." (extractTenantNameFromDocumentText's actual
    // output), but the roster's own MINT Boutique row is bare. Before
    // stripping punctuation/suffixes, this scored under MIN_CONFIDENCE.
    const result = matchTenant("MINT Boutique, S.A. de C.V.", CANDIDATES);
    expect(result?.localeId).toBe("loc-2");
    expect(result?.confidence).toBe(1);
  });

  it("does not let a shared corporate suffix outrank the real match", () => {
    // Live incident: against this exact candidate pair, the unstripped
    // comparison put "Cafetería El Puente S.A. de C.V." at ~50% confidence
    // (just over the floor, on shared "S.A. de C.V." alone) while the real
    // match, MINT Boutique with no suffix in the roster, scored under it.
    const result = matchTenant("MINT Boutique, S.A. de C.V.", CANDIDATES_MIXED_SUFFIXES);
    expect(result?.localeId).toBe("loc-2");
    expect(result!.confidence).toBeGreaterThan(0.9);
  });
});
