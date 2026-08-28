import { describe, it, expect } from "vitest";
import { isLeaseRelevantToQuestion } from "./relevance";

const MINT = { tenantEntity: "MINT Boutique, S.A. de C.V.", unitCode: "Local 66" };
const SUSHI = { tenantEntity: "Sushi Central, S.A. de C.V.", unitCode: "L - 181" };

describe("isLeaseRelevantToQuestion", () => {
  it("matches when the question names the tenant, suffix and all", () => {
    expect(isLeaseRelevantToQuestion("Does MINT Boutique have fashion exclusivity?", MINT)).toBe(true);
  });

  it("matches when the tenant's legal suffix isn't in the question", () => {
    // normalize() strips "S.A. de C.V." from the candidate before comparing —
    // the question shouldn't need to carry it too.
    expect(isLeaseRelevantToQuestion("What's MINT Boutique's notice period?", MINT)).toBe(true);
  });

  it("matches on the unit code even without the tenant name", () => {
    expect(isLeaseRelevantToQuestion("How many tickets does Local 66 have open?", MINT)).toBe(true);
  });

  it("is accent/case-insensitive", () => {
    expect(isLeaseRelevantToQuestion("¿MINT BOUTIQUE tiene garantía en su HVAC?", MINT)).toBe(true);
  });

  it("does not match an unrelated question", () => {
    expect(isLeaseRelevantToQuestion("How many contracts expire this year?", MINT)).toBe(false);
  });

  it("does not cross-match a different tenant's lease", () => {
    expect(isLeaseRelevantToQuestion("Does MINT Boutique have fashion exclusivity?", SUSHI)).toBe(false);
  });

  it("matches Sushi Central by name", () => {
    expect(isLeaseRelevantToQuestion("What's Sushi Central's exclusivity clause?", SUSHI)).toBe(true);
  });
});
