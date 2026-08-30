import { describe, it, expect, vi } from "vitest";
import { computeDaysRemaining, computeExpirationTiers, computeCategoryMix } from "./rent-roll-report.server";
import type { LeaseDetail } from "@/lib/data/contract-status";

// Mock server-only to allow Vitest execution outside Next.js server context
vi.mock("server-only", () => ({}));

function makeLease(overrides: Partial<LeaseDetail>): LeaseDetail {
  return {
    id: "loc-1",
    unitCode: "A-01",
    tenantEntity: "Test Tenant",
    tradeName: null,
    sqm: 100,
    rentMonthly: 10000,
    permittedUse: null,
    exclusiveUseClause: null,
    responsibilityMatrix: null,
    noticePeriodDays: null,
    startDate: "2024-01-01",
    endDate: "2027-01-01",
    renewalSoon: false,
    isExpired: false,
    sourceDocumentId: null,
    sourceApplicationNumber: null,
    leaseRowId: "loc-1",
    renewals: [],
    suggestedEscalationPct: null,
    suggestedEscalationClauseText: null,
    ...overrides,
  };
}

describe("rent-roll-report logic", () => {
  const refDate = new Date("2026-08-01T00:00:00Z");

  describe("computeDaysRemaining", () => {
    it("computes positive calendar day differences correctly", () => {
      expect(computeDaysRemaining("2026-08-31", refDate)).toBe(30);
    });

    it("computes negative calendar day differences for expired dates", () => {
      expect(computeDaysRemaining("2026-07-31", refDate)).toBe(-1);
    });
  });

  describe("computeExpirationTiers", () => {
    it("correctly buckets leases into 30/60/90/180/180+ and expired tiers", () => {
      const leases = [
        makeLease({ id: "loc-exp", tenantEntity: "Expired Co", endDate: "2026-07-01" }), // expired
        makeLease({ id: "loc-30", tenantEntity: "30-day Co", endDate: "2026-08-20" }), // 19 days -> d30
        makeLease({ id: "loc-60", tenantEntity: "60-day Co", endDate: "2026-09-20" }), // 50 days -> d60
        makeLease({ id: "loc-90", tenantEntity: "90-day Co", endDate: "2026-10-20" }), // 80 days -> d90
        makeLease({ id: "loc-180", tenantEntity: "180-day Co", endDate: "2026-12-20" }), // 141 days -> d180
        makeLease({ id: "loc-plus", tenantEntity: "Far Future Co", endDate: "2027-08-01" }), // 365 days -> plus180
      ];

      const tiers = computeExpirationTiers(leases, refDate);

      const expiredGroup = tiers.find((t) => t.key === "expired");
      const d30Group = tiers.find((t) => t.key === "d30");
      const d60Group = tiers.find((t) => t.key === "d60");
      const d90Group = tiers.find((t) => t.key === "d90");
      const d180Group = tiers.find((t) => t.key === "d180");
      const plus180Group = tiers.find((t) => t.key === "plus180");

      expect(expiredGroup?.count).toBe(1);
      expect(expiredGroup?.leases[0].tenantEntity).toBe("Expired Co");

      expect(d30Group?.count).toBe(1);
      expect(d30Group?.leases[0].tenantEntity).toBe("30-day Co");

      expect(d60Group?.count).toBe(1);
      expect(d60Group?.leases[0].tenantEntity).toBe("60-day Co");

      expect(d90Group?.count).toBe(1);
      expect(d90Group?.leases[0].tenantEntity).toBe("90-day Co");

      expect(d180Group?.count).toBe(1);
      expect(d180Group?.leases[0].tenantEntity).toBe("180-day Co");

      expect(plus180Group?.count).toBe(1);
      expect(plus180Group?.leases[0].tenantEntity).toBe("Far Future Co");
    });
  });

  describe("computeCategoryMix", () => {
    it("maps exact and fuzzy tenant names to pillar categories and computes sqm percentages", () => {
      const leases = [
        makeLease({ tenantEntity: "260 Grill & Bar", sqm: 200 }), // prueba
        makeLease({ tenantEntity: "Derma Club Farmacia Dermatológica", sqm: 100 }), // consiente
        makeLease({ tenantEntity: "Banorte", sqm: 300 }), // servicios
        makeLease({ tenantEntity: "Unknown Local Store", sqm: 400 }), // sin_categorizar
      ];

      const mix = computeCategoryMix(leases);
      const totalSqm = 1000;

      const pruebaItem = mix.find((m) => m.pillar === "prueba");
      const consienteItem = mix.find((m) => m.pillar === "consiente");
      const serviciosItem = mix.find((m) => m.pillar === "servicios");
      const uncatItem = mix.find((m) => m.pillar === "sin_categorizar");

      expect(pruebaItem?.count).toBe(1);
      expect(pruebaItem?.sqmTotal).toBe(200);
      expect(pruebaItem?.sqmPercentOfLeased).toBe((200 / totalSqm) * 100);

      expect(consienteItem?.count).toBe(1);
      expect(consienteItem?.sqmTotal).toBe(100);
      expect(consienteItem?.sqmPercentOfLeased).toBe((100 / totalSqm) * 100);

      expect(serviciosItem?.count).toBe(1);
      expect(serviciosItem?.sqmTotal).toBe(300);

      expect(uncatItem?.count).toBe(1);
      expect(uncatItem?.sqmTotal).toBe(400);
    });
  });
});
