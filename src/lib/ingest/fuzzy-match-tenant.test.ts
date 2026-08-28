import { describe, it, expect } from "vitest";
import { isSameTenant, matchTenant } from "./fuzzy-match-tenant";

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

  it("matches a short brand name against the document's full legal name", () => {
    // Live incident: PETCO's roster entry is the bare brand name, but the
    // digitized contract's declarative section states the full legal name.
    // Whole-string Levenshtein similarity between "petco" and "petco animal
    // supplies de mexico" scores well under MIN_CONFIDENCE (~16%) even after
    // suffix-stripping — this needs the prefix-containment path, not the
    // edit-distance one, to clear the floor at all.
    const candidates = [{ id: "loc-72", tenantEntity: "PETCO" }];
    const result = matchTenant("PETCO Animal Supplies de México, S.A. de C.V.", candidates);
    expect(result?.localeId).toBe("loc-72");
    expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("does not treat a merely similar-looking unrelated tenant as a match", () => {
    // "PET Supplies Plus" and "PETCO" share their first three letters, but
    // the fourth character diverges (a space vs. "c") — the containment
    // check requires the shorter name to end at a real word boundary inside
    // the longer one, not just share a common prefix of characters.
    const candidates = [{ id: "loc-1", tenantEntity: "PET Supplies Plus" }];
    const result = matchTenant("PETCO", candidates);
    expect(result).toBeNull();
  });

  it("matches on trade name when the legal name shares nothing with the roster", () => {
    // Live case: roster carries "Cabanna" (the trade name), the contract's
    // declarative section names the legal entity "Restaurantes del
    // Noroeste, S.A. de C.V." — zero shared characters, no prefix
    // relationship either. Only findable via the extraction's own
    // trade_name field, not tenant_entity at all.
    const candidates = [{ id: "loc-18", tenantEntity: "Cabanna" }];
    const result = matchTenant("Restaurantes del Noroeste, S.A. de C.V.", candidates, "Cabanna");
    expect(result?.localeId).toBe("loc-18");
    expect(result!.confidence).toBe(1);
  });

  it("matches when the roster itself carries a trade name, not the extraction", () => {
    // The reverse direction — a roster row already split into
    // tenantEntity/tradeName (backfilled from an earlier document), matched
    // against a fresh extraction that only stated the legal name this time.
    const candidates = [{ id: "loc-18", tenantEntity: "Restaurantes del Noroeste, S.A. de C.V.", tradeName: "Cabanna" }];
    const result = matchTenant("Cabanna", candidates);
    expect(result?.localeId).toBe("loc-18");
    expect(result!.confidence).toBe(1);
  });

  it("ignores extraneous fields without a trade name and behaves exactly as before", () => {
    // Backward-compatibility check: the 2-arg call shape (no extractedTradeName,
    // candidates with no tradeName) must score identically to pre-trade-name
    // behavior — nothing about adding the feature should shift existing scores.
    const result = matchTenant("Ashley Furniture", CANDIDATES);
    expect(result?.localeId).toBe("loc-1");
    expect(result?.confidence).toBe(1);
  });
});

describe("isSameTenant", () => {
  it("treats a short brand name and its own full legal name as the same tenant", () => {
    expect(isSameTenant("PETCO", "PETCO Animal Supplies de México, S.A. de C.V.")).toBe(true);
  });

  it("treats an OCR-mangled spelling as the same tenant", () => {
    expect(isSameTenant("Ashley Furniture", "Ashiey Fumiture")).toBe(true);
  });

  it("treats two genuinely different tenants as different", () => {
    expect(isSameTenant("PETCO", "Sushi Central")).toBe(false);
  });

  it("is order-independent", () => {
    expect(isSameTenant("PETCO Animal Supplies de México, S.A. de C.V.", "PETCO")).toBe(true);
  });

  it("recognizes a legal name and an unrelated trade name as the same tenant", () => {
    // The Cabanna case: neither legal name alone (Levenshtein) nor prefix
    // containment finds this — only checking the trade name against the
    // other side's name does.
    expect(
      isSameTenant("Restaurantes del Noroeste, S.A. de C.V.", "Cabanna", "Cabanna", undefined),
    ).toBe(true);
  });

  it("does not let an unrelated trade name manufacture a false match", () => {
    expect(isSameTenant("Sushi Central", "Cabanna", "Not Sushi At All", "Cabanna")).toBe(false);
  });
});
