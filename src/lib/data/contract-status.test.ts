import { describe, it, expect } from "vitest";
import {
  computeContractAggregates,
  computeEscalationAudit,
  contractStatusLabel,
  findEscalationClause,
  type LeaseDetail,
  type RentChangeEvent,
} from "./contract-status";

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
    parkingClause: null,
    directoryAdvertisingClause: null,
    expansionOptionClause: null,
    extendedHoursClause: null,
    signageClause: null,
    petsClause: null,
    subleaseRestrictionClause: null,
    remodelingClause: null,
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
    escalationPct: null,
    escalationMethod: null,
    escalationMonth: null,
    securityDepositAmount: null,
    securityDepositStatus: null,
    agentNotes: null,
    escalationOverdue: false,
    escalationDueDate: null,
    clauses: [],
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

describe("computeEscalationAudit", () => {
  const lease = makeLease({ startDate: "2024-01-01", escalationMonth: 9 });

  it("is never overdue when escalationMonth is unset", () => {
    const result = computeEscalationAudit(makeLease({ escalationMonth: null }), [], new Date("2026-10-01"));
    expect(result).toEqual({ overdue: false, dueDate: null });
  });

  it("flags overdue when the due month has passed with no recorded increase", () => {
    const result = computeEscalationAudit(lease, [], new Date("2026-10-01"));
    expect(result).toEqual({ overdue: true, dueDate: "2026-09-01" });
  });

  it("is not overdue when a rent increase was recorded at or after the due date", () => {
    const history: RentChangeEvent[] = [{ changedAt: "2026-09-05", oldRent: 95000, newRent: 100225 }];
    const result = computeEscalationAudit(lease, history, new Date("2026-10-01"));
    expect(result).toEqual({ overdue: false, dueDate: "2026-09-01" });
  });

  it("ignores a recorded change that isn't an increase (e.g. a correction down)", () => {
    const history: RentChangeEvent[] = [{ changedAt: "2026-09-05", oldRent: 95000, newRent: 90000 }];
    const result = computeEscalationAudit(lease, history, new Date("2026-10-01"));
    expect(result.overdue).toBe(true);
  });

  it("ignores an increase recorded before the due date (a prior cycle's, not this one's)", () => {
    const history: RentChangeEvent[] = [{ changedAt: "2025-09-05", oldRent: 90000, newRent: 95000 }];
    const result = computeEscalationAudit(lease, history, new Date("2026-10-01"));
    expect(result.overdue).toBe(true);
  });

  it("uses last year's occurrence when this year's due month hasn't arrived yet", () => {
    const result = computeEscalationAudit(lease, [], new Date("2026-03-01"));
    expect(result.dueDate).toBe("2025-09-01");
  });

  it("is not overdue when the due date predates the lease's own start", () => {
    const result = computeEscalationAudit(
      makeLease({ startDate: "2026-12-01", escalationMonth: 9 }),
      [],
      new Date("2026-10-01"),
    );
    expect(result).toEqual({ overdue: false, dueDate: null });
  });
});
