import { fetchPortfolio } from "@/lib/data/portfolio.server";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

export type RentTimelineEvent = {
  localeId: string;
  unitCode: string;
  tenantEntity: string;
  tradeName: string | null;
  changedAt: string;
  oldRent: number | null;
  newRent: number;
};

export type EscalationLeaseRow = {
  localeId: string;
  unitCode: string;
  tenantEntity: string;
  tradeName: string | null;
  escalationPct: number | null;
  escalationMethod: string | null;
  overdue: boolean;
  dueDate: string | null;
};

export type EscalationMonthBucket = {
  month: number;
  monthName: string;
  leases: EscalationLeaseRow[];
};

export type MoneyOverTimeData = {
  /** Today's total contracted rent, portfolio-wide (Portfolio.contractedRent
   *  — the same figure the Rent Roll header card shows). An anchor point,
   *  not a trend by itself. */
  contractedRentTotal: number;
  activeLeaseCount: number;
  /** Every recorded rent change, portfolio-wide, newest first — real events
   *  from lease_rent_history, not a reconstructed monthly series. That
   *  table only started capturing changes on 2026-09-03 (see its own
   *  migration comment), so this can legitimately be short or empty on a
   *  fresh engagement; it grows honestly as real changes happen, rather
   *  than backfilling a "before" value this system can't verify. */
  rentEvents: RentTimelineEvent[];
  /** 12 buckets, January through December, grouping every active lease by
   *  the calendar month its annual escalation falls due — independent of
   *  year, since the audit itself (computeEscalationAudit) already
   *  resolves "was THIS year's bump applied" per lease. */
  escalationByMonth: EscalationMonthBucket[];
  /** Leases with no escalationMonth committed at all — not overdue (there's
   *  nothing to be overdue against), but a real gap: nobody has confirmed
   *  when this lease's rent is supposed to step up. */
  leasesWithoutSchedule: EscalationLeaseRow[];
  overdueCount: number;
};

/**
 * Backs /consola/finanzas — the honest slice of root claude.md's #3
 * frontend priority ("money over time"). Collections-vs-expected,
 * delinquency aging, and CAM recovery rate all need data this engagement
 * doesn't have (no invoicing/payments/AR table exists anywhere in this
 * schema — see real-estate/claude.md's rent_due_notifier note, and
 * landlord-dashboard.tsx's own doc comment on why "Renta Cobrada" was
 * dropped from the Rent Roll header). What's built here is what's real:
 * the portfolio's actual recorded rent-change history, and an escalation-
 * due calendar built from data every lease already carries. No query here
 * is new — both feeds already exist on fetchPortfolio()'s LeaseDetail[],
 * this just re-aggregates them portfolio-wide instead of per-lease.
 */
export async function fetchMoneyOverTimeData(): Promise<MoneyOverTimeData> {
  const portfolio = await fetchPortfolio();

  const rentEvents: RentTimelineEvent[] = portfolio.leases
    .flatMap((l) =>
      l.rentHistory.map((r) => ({
        localeId: l.id,
        unitCode: l.unitCode,
        tenantEntity: l.tenantEntity,
        tradeName: l.tradeName,
        changedAt: r.changedAt,
        oldRent: r.oldRent,
        newRent: r.newRent,
      })),
    )
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt));

  const escalationByMonth: EscalationMonthBucket[] = MONTH_NAMES.map((monthName, i) => ({
    month: i + 1,
    monthName,
    leases: [],
  }));
  const leasesWithoutSchedule: EscalationLeaseRow[] = [];
  let overdueCount = 0;

  for (const l of portfolio.leases) {
    const row: EscalationLeaseRow = {
      localeId: l.id,
      unitCode: l.unitCode,
      tenantEntity: l.tenantEntity,
      tradeName: l.tradeName,
      escalationPct: l.escalationPct,
      escalationMethod: l.escalationMethod,
      overdue: l.escalationOverdue,
      dueDate: l.escalationDueDate,
    };
    if (l.escalationOverdue) overdueCount++;
    if (l.escalationMonth === null) {
      leasesWithoutSchedule.push(row);
    } else {
      escalationByMonth[l.escalationMonth - 1].leases.push(row);
    }
  }
  for (const bucket of escalationByMonth) {
    bucket.leases.sort((a, b) => (a.overdue === b.overdue ? 0 : a.overdue ? -1 : 1));
  }

  return {
    contractedRentTotal: portfolio.contractedRent,
    activeLeaseCount: portfolio.leases.length,
    rentEvents,
    escalationByMonth,
    leasesWithoutSchedule,
    overdueCount,
  };
}
