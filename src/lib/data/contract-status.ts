/**
 * Pure lease-status/aggregation logic, deliberately split out of
 * portfolio.server.ts: that module is marked "server-only" (it talks to
 * Supabase), and `server-only`'s actual implementation throws unconditionally
 * on import outside a Next.js server bundle — including a plain vitest run.
 * The functions here have no DB dependency at all, so they live in a plain
 * module that both portfolio.server.ts and a test file can import.
 */

export type LeaseDetail = {
  id: string;
  unitCode: string;
  tenantEntity: string;
  /** The tenant's operating brand/DBA name when the digitized contract
   *  states one distinct from tenantEntity (its registered legal name) —
   *  e.g. tenantEntity "Restaurantes del Noroeste, S.A. de C.V.", tradeName
   *  "Cabanna". null when the contract doesn't distinguish one, or for a
   *  lease never digitized. */
  tradeName: string | null;
  sqm: number;
  rentMonthly: number;
  permittedUse: string | null;
  exclusiveUseClause: string | null;
  responsibilityMatrix: Record<string, string> | null;
  noticePeriodDays: number | null;
  startDate: string;
  endDate: string;
  renewalSoon: boolean;
  /** end_date has already passed with no renewal recorded — distinct from
   *  renewalSoon (0–6 months *remaining*), which silently returns false
   *  once that window goes negative rather than flagging it. */
  isExpired: boolean;
  /** documents.id of the digitized contract this lease's terms came from —
   *  null for a lease never touched by the lease-digitization pipeline (a
   *  hand-entered row, or one predating source_document_id). Lets the SSOT
   *  table offer "Ver documento" from a lease's own expanded row instead of
   *  only from the Legal tab's digitization queue. */
  sourceDocumentId: string | null;
  /** application_number of the Mariana screening (lease_applications) that
   *  led to this lease, via lease_applications.promoted_lease_id — null when
   *  this tenant was never screened through Mariana (walked in directly, or
   *  predates the screening pipeline). Lets the SSOT table and Copiloto trace
   *  a lease back to the risk assessment that approved it, without either
   *  table ever restating the other's facts. */
  sourceApplicationNumber: string | null;
  /** The real `leases.id` — distinct from `id` above, which (existing
   *  convention in this file) is actually the *locale's* id. The
   *  lease-renewal trigger needs the real row id; reusing `id` here would
   *  repeat the exact mismatch bug already found once in landlord-dashboard
   *  .tsx (PortfolioRow.leaseId vs LeaseDetail.id). */
  leaseRowId: string;
  /** Renewal drafts (lease_renewals) for this lease, most recent first —
   *  empty until "Redactar Renovación" is used. */
  renewals: LeaseRenewalSummary[];
  /** A rent-escalation term found in the original contract's own special
   *  clauses (see findEscalationClause below) — null when the source
   *  contract states none, or was never digitized. Pre-fills the renewal
   *  form's percentage field; the landlord can still override it. */
  suggestedEscalationPct: number | null;
  suggestedEscalationClauseText: string | null;
};

export type SpecialClause = { label: string; text: string };

const ESCALATION_KEYWORDS = [
  "incremento",
  "escalaci",
  "ajuste anual",
  "aumento anual",
  "inpc",
  "índice nacional de precios",
  "revisión anual",
];

/** Scans a digitized contract's special_clauses for a stated rent-escalation
 *  term — e.g. "incremento anual del 5% conforme al INPC" — so the renewal
 *  form can pre-fill from the original contract's own words instead of
 *  asking the landlord to recall or re-derive it every time. Deliberately
 *  conservative: requires both an escalation-shaped keyword AND a percentage
 *  figure in the SAME clause. A late-payment interest clause states a %
 *  too, but has none of these keywords, so it correctly doesn't match —
 *  confirmed against MINT Boutique's real digitized contract, which has a
 *  5.5% moratory-interest clause and no escalation clause at all. */
export function findEscalationClause(clauses: SpecialClause[] | null): { pct: number; clauseText: string } | null {
  if (!clauses) return null;
  for (const clause of clauses) {
    const haystack = `${clause.label} ${clause.text}`.toLowerCase();
    if (!ESCALATION_KEYWORDS.some((k) => haystack.includes(k))) continue;
    const match = clause.text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (!match) continue;
    return { pct: Number(match[1]), clauseText: clause.text };
  }
  return null;
}

/** One row of Mariana's renewal-drafting pipeline (lease-renewal.ts) — a
 *  Convenio Modificatorio draft awaiting landlord approval, or already
 *  resolved. Mirrors LeaseDocumentRow's role for the digitization pipeline:
 *  the thing the UI renders and acts on, not the lease it would produce. */
export type LeaseRenewalSummary = {
  id: string;
  renewalNumber: string;
  status: "needs_landlord_review" | "approved" | "rejected";
  currentEndDate: string;
  newStartDate: string;
  newEndDate: string;
  currentBaseRentMonthly: number | null;
  newBaseRentMonthly: number;
  escalationPct: number | null;
  escalationMethod: string;
  draftMarkdown: string;
  skepticFlagged: boolean;
  skepticConcerns: string[];
};

function monthsUntil(dateStr: string): number {
  const end = new Date(dateStr);
  const now = new Date();
  return (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
}

export function isRenewalSoon(endDate: string): boolean {
  const months = monthsUntil(endDate);
  return months >= 0 && months <= 6;
}

/** A lease whose end_date has already passed with no renewal recorded —
 *  previously indistinguishable from "Vigente" in the SSOT table, since
 *  isRenewalSoon only flags 0–6 months *remaining* and silently returns
 *  false once that window is negative. Found live: a digitized contract's
 *  real end_date landed in the past relative to today. */
export function isExpired(endDate: string): boolean {
  return monthsUntil(endDate) < 0;
}

/** The same three-way precedence the SSOT table's status column renders
 *  (landlord-dashboard.tsx: isExpired, then renewalSoon, else "Vigente") —
 *  exported so a consumer that isn't rendering the table itself (Copiloto's
 *  route) doesn't have to reimplement the date math and risk drifting from
 *  what the table actually shows for the same lease. */
export function contractStatusLabel(lease: Pick<LeaseDetail, "isExpired" | "renewalSoon">): string {
  if (lease.isExpired) return "Vencido";
  if (lease.renewalSoon) return "Renovación Próxima";
  return "Vigente";
}

// Same five keys LeaseExtractedFieldsSchema's responsibility_matrix uses
// (lease-extraction-schema.ts) and legal-documents-panel.tsx's Gate 2 form
// renders — not imported from either (one's a Zod shape, the other a
// "use client" component), so kept as the same literal list, matching how
// this codebase already handles it rather than introducing a new shared
// module for five strings.
const RESPONSIBILITY_SYSTEMS = ["hvac", "roof", "plumbing", "electrical", "storefront_glass"] as const;
type ResponsibilityParty = "landlord" | "tenant" | "shared";

export type ContractAggregates = {
  totalContratos: number;
  /** Leases with a responsibility matrix on file — i.e. actually
   *  digitized/confirmed, not just seed data. The system-by-party counts
   *  below are only meaningful against this denominator, not totalContratos:
   *  most of this plaza's leases have never been digitized and simply carry
   *  no matrix at all. */
  contratosDigitalizados: number;
  porEstatus: Record<"vigente" | "renovacionProxima" | "vencido", number>;
  /** Count of leases per calendar year of end_date — "how many contracts
   *  are due this year" is a lookup against this, not something the model
   *  should tally itself from 85 raw endDate strings. */
  porAnioVencimiento: Record<string, number>;
  /** Per system, per responsible party, count of leases whose matrix
   *  assigns that party — only leases in contratosDigitalizados contribute
   *  here, since a null matrix has no assignment to count. */
  responsabilidadPorSistema: Record<(typeof RESPONSIBILITY_SYSTEMS)[number], Record<ResponsibilityParty, number>>;
};

/**
 * Precomputed once per Copiloto request rather than left for the model to
 * tally from the raw per-lease array — an LLM reading dozens of JSON
 * records and counting matches is exactly the kind of task that can drift
 * (silently miscounting a subset) even though it "usually" gets it right.
 * Deterministic code can't drift the same way, so any question shaped like
 * "how many X" gets answered from this instead.
 */
export function computeContractAggregates(leases: LeaseDetail[]): ContractAggregates {
  const porEstatus = { vigente: 0, renovacionProxima: 0, vencido: 0 };
  const porAnioVencimiento: Record<string, number> = {};
  const responsabilidadPorSistema = Object.fromEntries(
    RESPONSIBILITY_SYSTEMS.map((system) => [system, { landlord: 0, tenant: 0, shared: 0 }]),
  ) as ContractAggregates["responsabilidadPorSistema"];

  let contratosDigitalizados = 0;

  for (const lease of leases) {
    if (lease.isExpired) porEstatus.vencido++;
    else if (lease.renewalSoon) porEstatus.renovacionProxima++;
    else porEstatus.vigente++;

    const year = lease.endDate.slice(0, 4);
    porAnioVencimiento[year] = (porAnioVencimiento[year] ?? 0) + 1;

    if (lease.responsibilityMatrix) {
      contratosDigitalizados++;
      for (const system of RESPONSIBILITY_SYSTEMS) {
        const party = lease.responsibilityMatrix[system] as ResponsibilityParty | undefined;
        if (party && party in responsabilidadPorSistema[system]) {
          responsabilidadPorSistema[system][party]++;
        }
      }
    }
  }

  return {
    totalContratos: leases.length,
    contratosDigitalizados,
    porEstatus,
    porAnioVencimiento,
    responsabilidadPorSistema,
  };
}
