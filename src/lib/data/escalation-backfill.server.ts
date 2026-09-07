import "server-only";
import { fetchPortfolio } from "@/lib/data/portfolio.server";

export type EscalationBackfillCandidate = {
  leaseRowId: string;
  localeId: string;
  unitCode: string;
  tenantEntity: string;
  tradeName: string | null;
  rentMonthly: number;
  startDate: string;
  /** From findEscalationClause, mined at digitization from the source
   *  contract's own special_clauses — null when the contract wasn't
   *  digitized, or was but stated no escalation clause Mariana's keyword
   *  match could find. Landlord counsel should still confirm either way;
   *  this is a starting point, not a legal reading. */
  suggestedPct: number | null;
  suggestedClauseText: string | null;
  /** startDate's own calendar month — the anniversary default. A lease
   *  starting mid-month still escalates in that same month; only the day
   *  is approximated to the 1st (same convention computeEscalationAudit
   *  already uses for every due date). */
  suggestedMonth: number;
  /** Whether suggestedPct exists AND suggestedMonth is unambiguous (always
   *  true — startDate always has a month) — the bulk-confirm eligibility
   *  bar. Named explicitly rather than inlining `suggestedPct !== null` at
   *  every call site, since the second half of "unambiguous" is a real
   *  future consideration (e.g. a lease mid-renewal with a disputed start
   *  date), not just today's trivial case. */
  bulkConfirmEligible: boolean;
};

export type EscalationBackfillData = {
  candidates: EscalationBackfillCandidate[];
  totalActiveLeases: number;
  reviewedCount: number;
};

/**
 * Backs /consola/escalaciones — the worklist that turns
 * money-over-time.server.ts's "0/23 reviewed" coverage stat into something
 * a landlord can actually close out. Every candidate here is a lease with
 * no escalationMonth committed and not escalationConfirmedNone (the exact
 * MoneyOverTimeData.leasesWithoutSchedule set), pre-filled from
 * fetchPortfolio()'s own suggestedEscalationPct/suggestedEscalationClauseText
 * (already mined by findEscalationClause at digitization time — no new
 * extraction here). Nothing is auto-applied; every row needs an explicit
 * landlord action (confirmEscalationScheduleAction /
 * confirmNoEscalationAction in escalation-backfill-actions.ts).
 */
export async function fetchEscalationBackfillData(): Promise<EscalationBackfillData> {
  const portfolio = await fetchPortfolio();

  const candidates: EscalationBackfillCandidate[] = [];
  let reviewedCount = 0;

  for (const l of portfolio.leases) {
    if (l.escalationMonth !== null || l.escalationConfirmedNone) {
      reviewedCount++;
      continue;
    }
    const [, month] = l.startDate.split("-");
    const suggestedMonth = Number(month) || 1;
    candidates.push({
      leaseRowId: l.leaseRowId,
      localeId: l.id,
      unitCode: l.unitCode,
      tenantEntity: l.tenantEntity,
      tradeName: l.tradeName,
      rentMonthly: l.rentMonthly,
      startDate: l.startDate,
      suggestedPct: l.suggestedEscalationPct,
      suggestedClauseText: l.suggestedEscalationClauseText,
      suggestedMonth,
      bulkConfirmEligible: l.suggestedEscalationPct !== null,
    });
  }

  candidates.sort((a, b) => (a.bulkConfirmEligible ? 0 : 1) - (b.bulkConfirmEligible ? 0 : 1));

  return {
    candidates,
    totalActiveLeases: portfolio.leases.length,
    reviewedCount,
  };
}
