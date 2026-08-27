import { describe, it, expect } from "vitest";
import { computeContractAggregates, contractStatusLabel, findEscalationClause, type LeaseDetail } from "./contract-status";

function makeLease(overrides: Partial<LeaseDetail>): LeaseDetail {
  return {
    id: "loc-1",
    unitCode: "A-01",
    tenantEntity: "Test Tenant",
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

describe("contractStatusLabel", () => {
  it("prioritizes isExpired over renewalSoon", () => {
    expect(contractStatusLabel({ isExpired: true, renewalSoon: true })).toBe("Vencido");
  });

  it("falls back to renewalSoon when not expired", () => {
    expect(contractStatusLabel({ isExpired: false, renewalSoon: true })).toBe("Renovación Próxima");
  });

  it("defaults to Vigente when neither applies", () => {
    expect(contractStatusLabel({ isExpired: false, renewalSoon: false })).toBe("Vigente");
  });
});

describe("computeContractAggregates", () => {
  it("regression: the exact live scenario this was built for — 'how many contracts are due this year' and 'how many tenants have HVAC clauses'", () => {
    const leases: LeaseDetail[] = [
      makeLease({ id: "loc-1", endDate: "2026-01-15", isExpired: true, responsibilityMatrix: { hvac: "tenant", roof: "landlord", plumbing: "tenant", electrical: "tenant", storefront_glass: "tenant" } }),
      makeLease({ id: "loc-2", endDate: "2026-09-01", renewalSoon: true, responsibilityMatrix: { hvac: "landlord", roof: "landlord", plumbing: "shared", electrical: "tenant", storefront_glass: "tenant" } }),
      // Not digitized — no matrix, shouldn't contribute to responsabilidadPorSistema.
      makeLease({ id: "loc-3", endDate: "2028-07-31" }),
    ];

    const result = computeContractAggregates(leases);

    expect(result.totalContratos).toBe(3);
    expect(result.contratosDigitalizados).toBe(2);
    expect(result.porEstatus).toEqual({ vigente: 1, renovacionProxima: 1, vencido: 1 });
    expect(result.porAnioVencimiento).toEqual({ "2026": 2, "2028": 1 });
    expect(result.responsabilidadPorSistema.hvac).toEqual({ landlord: 1, tenant: 1, shared: 0 });
    expect(result.responsabilidadPorSistema.roof).toEqual({ landlord: 2, tenant: 0, shared: 0 });
    expect(result.responsabilidadPorSistema.plumbing).toEqual({ landlord: 0, tenant: 1, shared: 1 });
  });

  it("returns all-zero aggregates for an empty portfolio rather than throwing", () => {
    const result = computeContractAggregates([]);
    expect(result.totalContratos).toBe(0);
    expect(result.contratosDigitalizados).toBe(0);
    expect(result.porEstatus).toEqual({ vigente: 0, renovacionProxima: 0, vencido: 0 });
    expect(result.porAnioVencimiento).toEqual({});
    expect(result.responsabilidadPorSistema.hvac).toEqual({ landlord: 0, tenant: 0, shared: 0 });
  });
});

describe("findEscalationClause", () => {
  it("returns null when there are no clauses", () => {
    expect(findEscalationClause(null)).toBeNull();
    expect(findEscalationClause([])).toBeNull();
  });

  it("finds an escalation clause and extracts its percentage", () => {
    const result = findEscalationClause([
      { label: "Cláusula de renta", text: "La renta se pagará puntualmente cada mes." },
      { label: "Incremento anual", text: "La renta se incrementará anualmente conforme al INPC más 2.5%." },
    ]);
    expect(result).toEqual({ pct: 2.5, clauseText: "La renta se incrementará anualmente conforme al INPC más 2.5%." });
  });

  it("does not match a late-payment interest clause, even though it states a percentage — the exact MINT Boutique regression this was built against", () => {
    const result = findEscalationClause([
      {
        label: "Intereses moratorios (Cláusula Octava)",
        text: "Falta de pago de rentas o cuotas CAM genera interés moratorio mensual del 5.5% acumulativo sobre saldos insolutos.",
      },
    ]);
    expect(result).toBeNull();
  });

  it("does not match an escalation-shaped keyword with no percentage in the same clause", () => {
    const result = findEscalationClause([
      { label: "Ajuste anual", text: "La renta se ajustará anualmente según lo que determinen las partes de mutuo acuerdo." },
    ]);
    expect(result).toBeNull();
  });
});
