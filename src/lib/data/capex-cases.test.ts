import { describe, it, expect, vi } from "vitest";
import { computeCapexKpis, type CapexCase } from "./capex-cases.server";

// Mock server-only to allow Vitest execution outside Next.js server context
vi.mock("server-only", () => ({}));

function makeCase(overrides: Partial<CapexCase>): CapexCase {
  return {
    id: "ticket-1",
    ticketNumber: "MT-0001",
    tenant: "Test Tenant",
    expenseType: "Test Asset",
    amount: 1000,
    isQuestionable: false,
    verdict: "APROBADO_COSTO_ARRENDADOR",
    details: "",
    equipmentModel: "—",
    serialNumber: "—",
    ...overrides,
  };
}

describe("computeCapexKpis", () => {
  it("sums RECHAZADO and GARANTIA verdicts as protected from P&L", () => {
    const cases = [
      makeCase({ verdict: "RECHAZADO_RESPONSABILIDAD_INQUILINO", amount: 78000 }),
      makeCase({ verdict: "APROBADO_GARANTIA_COSTO_CERO", amount: 145000 }),
    ];
    expect(computeCapexKpis(cases).protectedFromPL).toBe(223000);
  });

  it("excludes APROBADO_PRORRATEO_CAM — that cost is paid by the CAM pool, not avoided by the landlord", () => {
    const cases = [makeCase({ verdict: "APROBADO_PRORRATEO_CAM", amount: 52000 })];
    expect(computeCapexKpis(cases).protectedFromPL).toBe(0);
  });

  it("excludes APROBADO_COSTO_ARRENDADOR — real landlord spend, not something protected", () => {
    const cases = [makeCase({ verdict: "APROBADO_COSTO_ARRENDADOR", amount: 90000 })];
    expect(computeCapexKpis(cases).protectedFromPL).toBe(0);
  });

  it("returns 0 for an empty case list", () => {
    expect(computeCapexKpis([]).protectedFromPL).toBe(0);
  });
});
