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
  /** Eight clause types promoted out of special_clauses into their own
   *  columns — see lease-extraction-schema.ts for the frequency data behind
   *  this list. null when the contract doesn't grant/mention that clause. */
  parkingClause: string | null;
  directoryAdvertisingClause: string | null;
  expansionOptionClause: string | null;
  extendedHoursClause: string | null;
  signageClause: string | null;
  petsClause: string | null;
  subleaseRestrictionClause: string | null;
  remodelingClause: string | null;
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
  /** The active lease's own committed escalation schedule — distinct from
   *  suggestedEscalationPct above (a *suggestion* mined from the source
   *  document's special_clauses) and from LeaseRenewalSummary.escalationPct
   *  (a *proposed renewal's* terms). null until a landlord confirms one. */
  escalationPct: number | null;
  escalationMethod: EscalationMethod | null;
  escalationMonth: number | null;
  /** Landlord reviewed this lease's backfill row and confirmed the source
   *  contract has no escalation clause — distinct from escalationMonth
   *  simply being null, which alone can't tell "never reviewed" apart from
   *  "reviewed, genuinely none." See the escalation_confirmed_none
   *  migration's own comment. */
  escalationConfirmedNone: boolean;
  /** The contract's stated CAM allocation basis (e.g. "GLA share") — free
   *  text, landlord-entered, null until confirmed. Current pro-rata math
   *  everywhere else in this codebase assumes raw GLA share for every
   *  tenant; this is the one place that assumption could be contractually
   *  wrong, and nothing reads it yet. */
  camShareBasis: string | null;
  /** Cap on controllable CAM expenses passed through to this tenant, as a
   *  percentage — a negotiated protection against overage billing. Ignored
   *  everywhere today. */
  camCapControllablePct: number | null;
  /** CAM administration fee, as a percentage of the allocated base — never
   *  applied anywhere in this codebase, so it's revenue not being billed. */
  adminFeePct: number | null;
  /** Free-text CAM/maintenance clause from the source contract — the
   *  provenance for the three fields above. null for a lease never
   *  digitized, or digitized before this field existed. */
  maintenanceClause: string | null;
  /** Confirmed absent from this schema until 2026-09-03 — see
   *  portfolio.server.ts's fetchPortfolio doc comment history. null until a
   *  landlord backfills it. */
  securityDepositAmount: number | null;
  securityDepositStatus: string | null;
  agentNotes: string | null;
  /** Convenience mirror of escalationCycles' last entry — see
   *  computeEscalationAudit's doc comment for what "overdue" means and its
   *  one known limitation (no visibility before lease_rent_history
   *  existed). false whenever escalationMonth is unset. */
  escalationOverdue: boolean;
  escalationDueDate: string | null;
  /** Every annual escalation cycle from lease start through the most
   *  recent due date, each independently audited — the full history behind
   *  escalationOverdue/escalationDueDate's single-cycle convenience view.
   *  Empty whenever escalationMonth is unset. */
  escalationCycles: EscalationCycle[];
  /** Empty for a lease never digitized, or digitized before this ledger
   *  existed (2026-09-03) — no backfill for prior extractions. */
  clauses: LeaseClause[];
  /** Every recorded rent change for this lease (lease_rent_history), oldest
   *  first — the same events computeEscalationAudit already reads, exposed
   *  raw here for the lease detail page's payment-history column. Empty for
   *  a lease with no change recorded since the table started logging
   *  (2026-09-03) — see that migration's own "starts empty" note. */
  rentHistory: RentChangeEvent[];
};

export type SpecialClause = { label: string; text: string };

export type LeaseClauseReviewStatus = "needs_counsel" | "awaiting_reading" | "up_to_date" | "ready_to_redo";

/** One row of Mariana's clause ledger (lease_clauses.server.ts) — auto-generated
 *  at digitization from the same extraction that writes the named-clause
 *  columns and exclusive_use_clause (kept, per the 2026-09-03 "coexist"
 *  decision — this is the separate, granular audit view, not a replacement). */
export type LeaseClause = {
  id: string;
  leaseId: string;
  sourceDocumentId: string | null;
  clauseNumber: number;
  clauseLabel: string;
  clauseText: string;
  reviewStatus: LeaseClauseReviewStatus;
  flagged: boolean;
  agentNote: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * The only two values ever written anywhere in this codebase — Mariana's
 * renewal-drafting default ("fixed_pct", a matched %) and the draft-renewal
 * route's flat-rate override ("landlord_specified"). Column was left free
 * text at first (20260903221148_lease_escalation_schedule.sql), which let
 * four different UI components each invent their own fallback string for
 * null. Constrained at the DB level (20260907130000_escalation_method_enum
 * .sql) once the live data confirmed nothing else was ever stored.
 */
export type EscalationMethod = "fixed_pct" | "landlord_specified";

export const ESCALATION_METHOD_LABEL: Record<EscalationMethod, string> = {
  fixed_pct: "% fijo",
  landlord_specified: "monto especificado por el arrendador",
};

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
  tenantEntity?: string;
  status: "needs_landlord_review" | "approved" | "rejected";
  currentEndDate: string;
  newStartDate: string;
  newEndDate: string;
  currentBaseRentMonthly: number | null;
  newBaseRentMonthly: number;
  escalationPct: number | null;
  escalationMethod: EscalationMethod;
  draftMarkdown: string;
  skepticFlagged: boolean;
  skepticConcerns: string[];
  createdAt: string;
  /** Set by /api/workflow/approve-lease-renewal when this draft was
   *  rejected — null for a pending or approved draft, and for a rejection
   *  recorded before this field existed. */
  rejectionReason: string | null;
  /** "valeria_ai" when Valeria's propose_renewal_edit → "Aplicar" flow last
   *  changed a field on this draft; null when the draft is exactly as
   *  Mariana's workflow first generated it. */
  lastEditedBy: string | null;
  lastEditedReasoning: string | null;
  /** A landlord's "request changes" note (requestRenewalChangesAction) —
   *  doesn't change status, just sits on the record for whoever redrafts. */
  landlordFeedback: string | null;
  /** Who actually clicked Aprobar/Rechazar (lease_renewals.reviewed_by,
   *  resolved to a name/email) and when — null while status is still
   *  needs_landlord_review. Root claude.md's #4 frontend priority ("agent
   *  trace / audit"): the other half of a defensible approval record,
   *  alongside the draft's own clause citations and skeptic concerns. */
  reviewedByName: string | null;
  reviewedAt: string | null;
};

/** Parses a bare "YYYY-MM-DD" calendar date directly from its components,
 *  in local time — not via `new Date(dateStr)`, which parses a date-only
 *  string as UTC midnight. Getting the year/month/day back out of that
 *  with the local-timezone accessors (.getFullYear() etc.) silently rolls
 *  the calendar date back a day (or a month, near a boundary) in any
 *  negative-UTC-offset timezone, including Mexicali's — this function runs
 *  both server-side (Node/Workers, UTC by default — no bug there) and
 *  client-side (the renewal workspace is "use client", real viewer
 *  timezone), so the client path was silently misclassifying which
 *  expiration tier a lease near a boundary falls into. */
function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthsUntil(dateStr: string): number {
  const end = parseDateOnly(dateStr);
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

export type RentChangeEvent = {
  changedAt: string;
  oldRent: number | null;
  newRent: number;
};

/** supabase/migrations/20260903230148_lease_rent_history.sql — the day
 *  lease_rent_history started logging. A cycle whose dueDate falls before
 *  this has no ledger to check against, so `applied: false` there means
 *  "unverifiable," not "confirmed missed." computeEscalationAudit doesn't
 *  bake that distinction into `applied` itself (it stays a pure presence
 *  check); a caller that needs "verified vs unverifiable" compares a
 *  cycle's own dueDate against this constant (money-over-time.server.ts's
 *  escalation audit section does exactly that). */
export const LEASE_RENT_HISTORY_SINCE = "2026-09-03";

export type EscalationCycle = {
  /** First-of-month due date for this annual cycle. */
  dueDate: string;
  /** Whether some rent increase (any amount — presence check, not a
   *  percentage match, since real-world negotiation can land anywhere near
   *  the stated pct) was recorded in lease_rent_history within this
   *  cycle's own window: [dueDate, next cycle's dueDate), or [dueDate, ∞)
   *  for the most recent cycle. Windowed so one bump can't silently clear
   *  an unrelated earlier cycle it wasn't meant for. */
  applied: boolean;
};

export type EscalationAudit = {
  /** Every annual due-date occurrence from the lease's own start_date
   *  through the most recent one that has already passed, oldest first —
   *  the fix for the single-most-recent-cycle blind spot: a lease that
   *  missed 2024 and 2025 but caught up last month now shows two missed
   *  cycles and one applied one, not "clean." Empty when escalationMonth is
   *  unset, or its first occurrence hasn't happened yet. */
  cycles: EscalationCycle[];
  /** Convenience mirror of the last entry in `cycles` — true when the most
   *  recent cycle wasn't applied. Kept for callers that only need "is
   *  anything overdue right now," not the full history. */
  overdue: boolean;
  dueDate: string | null;
};

/** Local-time YYYY-MM-DD — not `toISOString().slice(0,10)`, which parses
 *  the local Date's UTC-shifted instant and can roll the calendar date back
 *  a day (or a month, near a boundary) in a negative-UTC-offset timezone.
 *  Same class of bug parseDateOnly's own doc comment already documents for
 *  the client-side renewal workspace. */
function formatDateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Walks every annual escalation cycle a lease has had, from its own
 * start_date through the most recent one that's already due, and audits
 * each independently — the multi-year fix for the previous single-cycle
 * version, which only ever looked at the most recent due date and so read
 * a lease that missed 2024 and 2025 as "clean" the moment it caught up once.
 *
 * "Applied" means: some rent increase recorded in lease_rent_history within
 * that specific cycle's own window (see EscalationCycle's doc comment) —
 * still a presence check, not a percentage match.
 *
 * Known limitation, not a bug: lease_rent_history only captures changes
 * made on/after LEASE_RENT_HISTORY_SINCE. A cycle due before then reads
 * `applied: false` even if the escalation genuinely happened, because
 * there's no record either way — accepted tradeoff (2026-09-03) rather than
 * building a backfill for changes nobody logged. See that constant's own
 * doc comment for how a caller distinguishes "confirmed missed" from
 * "unverifiable" using this same `applied` flag.
 */
export function computeEscalationAudit(
  lease: Pick<LeaseDetail, "startDate" | "escalationMonth">,
  rentHistory: RentChangeEvent[],
  referenceDate: Date = new Date(),
): EscalationAudit {
  if (lease.escalationMonth === null) return { cycles: [], overdue: false, dueDate: null };

  const start = parseDateOnly(lease.startDate);
  let due = new Date(start.getFullYear(), lease.escalationMonth - 1, 1);
  if (due < start) due = new Date(due.getFullYear() + 1, due.getMonth(), 1);

  const dueDates: Date[] = [];
  while (due <= referenceDate) {
    dueDates.push(due);
    due = new Date(due.getFullYear() + 1, due.getMonth(), 1);
  }

  const cycles: EscalationCycle[] = dueDates.map((d, i) => {
    const dueStr = formatDateOnly(d);
    const nextStr = i + 1 < dueDates.length ? formatDateOnly(dueDates[i + 1]) : null;
    const applied = rentHistory.some(
      (event) =>
        event.oldRent !== null &&
        event.newRent > event.oldRent &&
        event.changedAt >= dueStr &&
        (nextStr === null || event.changedAt < nextStr),
    );
    return { dueDate: dueStr, applied };
  });

  const last = cycles.length > 0 ? cycles[cycles.length - 1] : null;
  return {
    cycles,
    overdue: last !== null && !last.applied,
    dueDate: last !== null ? last.dueDate : null,
  };
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

export type ExpirationTierKey = "expired" | "d30" | "d60" | "d90" | "d180" | "plus180";

export const TIER_LABELS: Record<ExpirationTierKey, string> = {
  expired: "Vencidos",
  d30: "Próximos 30 días",
  d60: "31 a 60 días",
  d90: "61 a 90 días",
  d180: "91 a 180 días",
  plus180: "Más de 180 días",
};

/**
 * Calendar days remaining until endDate relative to referenceDate. Pure
 * date math, no DB dependency — moved here alongside tierForDays for the
 * same reason: the renewal workspace ("use client") needs it too, and
 * rent-roll-report.server.ts carries a `server-only` import that would
 * break importing it from client code.
 */
export function computeDaysRemaining(endDateStr: string, referenceDate: Date = new Date()): number {
  const end = parseDateOnly(endDateStr);
  if (Number.isNaN(end.getTime())) return 0;
  const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const refMidnight = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const diffMs = endMidnight.getTime() - refMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Single source of truth for the expiration-tier boundary decision —
 *  the rent-roll .xlsx export and the renewal workspace must never
 *  quietly disagree about what counts as "31-60 days." */
export function tierForDays(days: number): ExpirationTierKey {
  if (days < 0) return "expired";
  if (days <= 30) return "d30";
  if (days <= 60) return "d60";
  if (days <= 90) return "d90";
  if (days <= 180) return "d180";
  return "plus180";
}

// Same five keys LeaseExtractedFieldsSchema's responsibility_matrix uses
// (lease-extraction-schema.ts) and legal-documents-panel.tsx's Gate 2 form
// renders — not imported from either (one's a Zod shape, the other a
// "use client" component), so kept as the same literal list, matching how
// this codebase already handles it rather than introducing a new shared
// module for five strings.
const RESPONSIBILITY_SYSTEMS = ["hvac", "roof", "plumbing", "electrical", "storefront_glass"] as const;
type ResponsibilityParty = "landlord" | "tenant" | "shared";

// Same eight keys LeaseExtractedFieldsSchema's named clause fields use
// (lease-extraction-schema.ts) — kept as a literal list here rather than
// imported, same reasoning as RESPONSIBILITY_SYSTEMS above (one's a Zod
// shape, this module has no DB/schema dependency by design).
const NAMED_CLAUSES = [
  "parkingClause",
  "directoryAdvertisingClause",
  "expansionOptionClause",
  "extendedHoursClause",
  "signageClause",
  "petsClause",
  "subleaseRestrictionClause",
  "remodelingClause",
] as const satisfies readonly (keyof LeaseDetail)[];

export type ContractAggregates = {
  totalContratos: number;
  /** Leases with a responsibility matrix on file — i.e. actually
   *  digitized/confirmed, not just seed data. The system-by-party counts
   *  below are only meaningful against this denominator, not totalContratos:
   *  most of this plaza's leases have never been digitized and simply carry
   *  no matrix at all. */
  contratosDigitalizados: number;
  totalGlaM2: number;
  leasedGlaM2: number;
  totalRentaMensualMxn: number;
  porEstatus: Record<"vigente" | "renovacionProxima" | "vencido", number>;
  /** Count of leases per calendar year of end_date — "how many contracts
   *  are due this year" is a lookup against this, not something the model
   *  should tally itself from 85 raw endDate strings. */
  porAnioVencimiento: Record<string, number>;
  /** Per system, per responsible party, count of leases whose matrix
   *  assigns that party — only leases in contratosDigitalizados contribute
   *  here, since a null matrix has no assignment to count. */
  responsabilidadPorSistema: Record<(typeof RESPONSIBILITY_SYSTEMS)[number], Record<ResponsibilityParty, number>>;
  /** Count of leases whose contract grants each of the eight named clauses
   *  — answers "how many tenants have X" without the model re-reading every
   *  contract. Counted against totalContratos (a lease with no source
   *  document simply has null for all eight and doesn't contribute). */
  clausulasNombradasPresentes: Record<(typeof NAMED_CLAUSES)[number], number>;
};

/**
 * Precomputed once per Copiloto request rather than left for the model to
 * tally from the raw per-lease array — an LLM reading dozens of JSON
 * records and counting matches is exactly the kind of task that can drift
 * (silently miscounting a subset) even though it "usually" gets it right.
 * Deterministic code can't drift the same way, so any question shaped like
 * "how many X" gets answered from this instead.
 */
export function computeContractAggregates(leases: LeaseDetail[], masterPlazaGlaM2?: number): ContractAggregates {
  const porEstatus = { vigente: 0, renovacionProxima: 0, vencido: 0 };
  const porAnioVencimiento: Record<string, number> = {};
  const responsabilidadPorSistema = Object.fromEntries(
    RESPONSIBILITY_SYSTEMS.map((system) => [system, { landlord: 0, tenant: 0, shared: 0 }]),
  ) as ContractAggregates["responsabilidadPorSistema"];
  const clausulasNombradasPresentes = Object.fromEntries(
    NAMED_CLAUSES.map((clause) => [clause, 0]),
  ) as ContractAggregates["clausulasNombradasPresentes"];

  let contratosDigitalizados = 0;
  let leasedGlaM2 = 0;
  let totalRentaMensualMxn = 0;

  for (const lease of leases) {
    leasedGlaM2 += lease.sqm ?? 0;
    totalRentaMensualMxn += lease.rentMonthly ?? 0;

    if (lease.isExpired) porEstatus.vencido++;
    else if (lease.renewalSoon) porEstatus.renovacionProxima++;
    else porEstatus.vigente++;

    const year = lease.endDate.slice(0, 4);
    porAnioVencimiento[year] = (porAnioVencimiento[year] ?? 0) + 1;

    for (const clause of NAMED_CLAUSES) {
      if (lease[clause] !== null) clausulasNombradasPresentes[clause]++;
    }

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

  const totalGlaM2 = masterPlazaGlaM2 && masterPlazaGlaM2 > 0 ? masterPlazaGlaM2 : leasedGlaM2;

  return {
    totalContratos: leases.length,
    contratosDigitalizados,
    totalGlaM2,
    leasedGlaM2,
    totalRentaMensualMxn,
    porEstatus,
    porAnioVencimiento,
    responsabilidadPorSistema,
    clausulasNombradasPresentes,
  };
}
