import { fetchPortfolio } from "@/lib/data/portfolio.server";
import { fetchDiegoTickets } from "@/lib/data/diego-tickets.server";
import {
  computeDaysRemaining,
  LEASE_RENT_HISTORY_SINCE,
  tierForDays,
  type EscalationMethod,
  type ExpirationTierKey,
} from "@/lib/data/contract-status";

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
  escalationMethod: EscalationMethod | null;
  overdue: boolean;
  dueDate: string | null;
};

export type EscalationMonthBucket = {
  month: number;
  monthName: string;
  leases: EscalationLeaseRow[];
};

export type RentProjectionPoint = {
  monthsAhead: number;
  label: string;
  contractedRentTotal: number;
};

/**
 * One lease with a confirmed-not-applied escalation (computeEscalationAudit
 * says `overdue: true`) — split further by whether lease_rent_history could
 * actually have caught it. monthlyDelta/totalOwed are null when
 * escalationPct isn't on file, since there's nothing to multiply.
 */
export type EscalationAuditRow = {
  localeId: string;
  unitCode: string;
  tenantEntity: string;
  tradeName: string | null;
  escalationPct: number | null;
  escalationMethod: EscalationMethod | null;
  dueDate: string;
  monthsElapsed: number;
  monthlyDelta: number | null;
  totalOwed: number | null;
};

export type ExpirationMonthBucket = {
  monthsAhead: number;
  label: string;
  leases: {
    localeId: string;
    unitCode: string;
    tenantEntity: string;
    tradeName: string | null;
    endDate: string;
    rentMonthly: number;
    tier: ExpirationTierKey;
  }[];
};

export type RentBenchmarkRow = {
  localeId: string;
  unitCode: string;
  tenantEntity: string;
  tradeName: string | null;
  sqm: number;
  rentMonthly: number;
  rentPerSqm: number;
  deltaFromMedianPct: number;
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
  /** Leases with no escalationMonth AND not escalationConfirmedNone — the
   *  real, actionable gap: nobody has confirmed whether this lease even has
   *  an escalation clause, let alone when it steps up. See
   *  /consola/escalaciones (the backfill flow) — this is exactly its
   *  worklist. */
  leasesWithoutSchedule: EscalationLeaseRow[];
  /** Leases reviewed and confirmed to have no escalation clause — covered,
   *  not a gap, just nothing to put on a calendar. Feeds the coverage stat
   *  alongside leasesWithoutSchedule/escalationByMonth. */
  confirmedNoneCount: number;
  /** 24 months forward from the current month, month 0 = today's
   *  contractedRentTotal exactly (no assumption applied to the present). A
   *  lease drops out of every month past its own endDate — no renewal is
   *  assumed, ever. A lease with escalationMonth+escalationPct on file
   *  compounds at each future occurrence of that month; one without either
   *  stays flat. Pure lease-term math, nothing from a bank feed. */
  rentProjection24mo: RentProjectionPoint[];
  /**
   * The escalation audit, three states, per CYCLE (a lease with two missed
   * years contributes two rows, not one) — see computeEscalationAudit's
   * "presence check, not a percentage match" caveat, which applies to all
   * three.
   *
   * - verified: cycle's dueDate falls on/after LEASE_RENT_HISTORY_SINCE and
   *   no increase was found in that cycle's own window — the table could
   *   have caught it and didn't. Real, actionable. Money is summed only
   *   here.
   * - unverifiable: cycle's dueDate falls before LEASE_RENT_HISTORY_SINCE —
   *   no increase found, but there's also no ledger to have caught one in.
   *   Listed, demoted, no dollar figure attached.
   * - onScheduleCount: a cycle whose window had an increase recorded —
   *   quiet, just counted.
   */
  missedEscalation: {
    verified: { rows: EscalationAuditRow[]; monthlyTotal: number; totalOwedAllTime: number };
    unverifiable: { rows: EscalationAuditRow[] };
    onScheduleCount: number;
  };
  /** Same 24-month window as rentProjection24mo, this time bucketing by
   *  each lease's actual endDate (year+month, not calendar month) — when
   *  contracts really come up for renewal, not a stripped-of-year repeat
   *  like escalationByMonth. */
  expirationLadder24mo: ExpirationMonthBucket[];
  /** rentMonthly / sqm per lease, benchmarked against the portfolio's own
   *  median — no external comparable data, no market-rate claim. */
  rentBenchmark: {
    medianRentPerSqm: number;
    rows: RentBenchmarkRow[];
  };
  /** Sharpens the CAM locked roadmap card with two real numbers — both
   *  reused straight from fetchCamData(), no new computation — instead of
   *  a bare "requires cam-allocator" note. Neither number is an allocation:
   *  a lease count and a ledger sum, same boundary cam.server.ts holds. */
  camSummary: {
    leasesWithTermsCount: number;
    totalActiveLeases: number;
    totalAttributedExpense: number;
  };
};

/** "sep 2026" — same lowercase-abbreviation register as
 *  lease-renewal-panel.tsx's formatSpanishDate, just month+year instead of
 *  day+month+year. */
function monthYearLabel(date: Date): string {
  const abbrevs = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${abbrevs[date.getMonth()]} ${date.getFullYear()}`;
}

/** First-of-month ISO string for a given offset from `from` — safe to
 *  string-compare against a lease's endDate/startDate (both YYYY-MM-DD). */
function firstOfMonthIso(from: Date, monthsAhead: number): string {
  const d = new Date(from.getFullYear(), from.getMonth() + monthsAhead, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Backs /consola/finanzas — deliberately named "Renta Programada", not
 * "Cobranza" or "Collections": every number on this page derives from lease
 * terms already on file, none of it from cash actually received. This
 * engagement has no invoicing/payments/AR table anywhere in its schema (see
 * real-estate/claude.md's rent_due_notifier note, and landlord-dashboard
 * .tsx's own doc comment on why "Renta Cobrada" was dropped from the Rent
 * Roll header) — so collected-vs-expected, delinquency aging, and CAM
 * recovery rate are surfaced in the UI as named, locked roadmap slots (what
 * connecting a bank feed / ERP would unlock), never as invented figures.
 * No query here is new — every feed already exists on fetchPortfolio()'s
 * LeaseDetail[]; this re-aggregates and projects it portfolio-wide.
 */
export async function fetchMoneyOverTimeData(): Promise<MoneyOverTimeData> {
  const [portfolio, ticketData] = await Promise.all([fetchPortfolio(), fetchDiegoTickets()]);

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
  let confirmedNoneCount = 0;

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
    if (l.escalationMonth !== null) {
      escalationByMonth[l.escalationMonth - 1].leases.push(row);
    } else if (l.escalationConfirmedNone) {
      // Reviewed, genuinely no escalation clause — covered, not a gap, and
      // nothing to put on a calendar. Counted for the coverage stat only.
      confirmedNoneCount++;
    } else {
      leasesWithoutSchedule.push(row);
    }
  }
  for (const bucket of escalationByMonth) {
    bucket.leases.sort((a, b) => (a.overdue === b.overdue ? 0 : a.overdue ? -1 : 1));
  }

  const now = new Date();

  // 24-month forward projection — compounds each lease's own escalation
  // term at each future occurrence of its escalationMonth, drops a lease
  // out entirely once its endDate has passed (no renewal assumed).
  const rentProjection24mo: RentProjectionPoint[] = [];
  for (let monthsAhead = 0; monthsAhead < 24; monthsAhead++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
    const targetIso = firstOfMonthIso(now, monthsAhead);
    let total = 0;
    for (const l of portfolio.leases) {
      if (l.endDate < targetIso) continue;
      if (l.escalationMonth === null || l.escalationPct === null) {
        total += l.rentMonthly;
        continue;
      }
      let occurrences = 0;
      for (let m = 1; m <= monthsAhead; m++) {
        const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
        if (d.getMonth() + 1 === l.escalationMonth) occurrences++;
      }
      total += l.rentMonthly * Math.pow(1 + l.escalationPct / 100, occurrences);
    }
    rentProjection24mo.push({ monthsAhead, label: monthYearLabel(targetDate), contractedRentTotal: Math.round(total) });
  }

  // Escalation audit — three states per CYCLE, see
  // MoneyOverTimeData.missedEscalation doc comment for why the split
  // matters (lease_rent_history is 4 days old; a raw overdue count would be
  // near-total and mostly unverifiable) and why it's per-cycle, not
  // per-lease (a lease that missed 2024 and 2025 owes for both, not just
  // whichever cycle is "most recent").
  const verifiedRows: EscalationAuditRow[] = [];
  const unverifiableRows: EscalationAuditRow[] = [];
  let onScheduleCount = 0;
  for (const l of portfolio.leases) {
    if (l.escalationMonth === null) continue; // counted in leasesWithoutSchedule instead
    for (const cycle of l.escalationCycles) {
      if (cycle.applied) {
        onScheduleCount++;
        continue;
      }
      const [dy, dm, dd] = cycle.dueDate.split("-").map(Number);
      const due = new Date(dy, dm - 1, dd);
      let monthsElapsed = (now.getFullYear() - due.getFullYear()) * 12 + (now.getMonth() - due.getMonth());
      if (now.getDate() < due.getDate()) monthsElapsed--;
      monthsElapsed = Math.max(1, monthsElapsed);
      const monthlyDelta = l.escalationPct === null ? null : Math.round(l.rentMonthly * (l.escalationPct / 100));
      const row: EscalationAuditRow = {
        localeId: l.id,
        unitCode: l.unitCode,
        tenantEntity: l.tenantEntity,
        tradeName: l.tradeName,
        escalationPct: l.escalationPct,
        escalationMethod: l.escalationMethod,
        dueDate: cycle.dueDate,
        monthsElapsed,
        monthlyDelta,
        totalOwed: monthlyDelta === null ? null : monthlyDelta * monthsElapsed,
      };
      if (cycle.dueDate >= LEASE_RENT_HISTORY_SINCE) {
        verifiedRows.push(row);
      } else {
        unverifiableRows.push(row);
      }
    }
  }
  verifiedRows.sort((a, b) => (b.totalOwed ?? 0) - (a.totalOwed ?? 0));
  unverifiableRows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const verifiedMonthlyTotal = verifiedRows.reduce((sum, r) => sum + (r.monthlyDelta ?? 0), 0);
  const verifiedTotalOwedAllTime = verifiedRows.reduce((sum, r) => sum + (r.totalOwed ?? 0), 0);

  // Expiration ladder — same 24-month window, bucketed by real year+month.
  const expirationLadder24mo: ExpirationMonthBucket[] = [];
  for (let monthsAhead = 0; monthsAhead < 24; monthsAhead++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
    expirationLadder24mo.push({ monthsAhead, label: monthYearLabel(targetDate), leases: [] });
  }
  for (const l of portfolio.leases) {
    const [y, m] = l.endDate.split("-").map(Number);
    if (!y || !m) continue;
    const monthsAhead = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth());
    if (monthsAhead < 0 || monthsAhead > 23) continue;
    expirationLadder24mo[monthsAhead].leases.push({
      localeId: l.id,
      unitCode: l.unitCode,
      tenantEntity: l.tenantEntity,
      tradeName: l.tradeName,
      endDate: l.endDate,
      rentMonthly: l.rentMonthly,
      tier: tierForDays(computeDaysRemaining(l.endDate)),
    });
  }

  // Rent/m² benchmark — portfolio-internal only, no external comp data.
  const benchmarkRows = portfolio.leases
    .filter((l) => l.sqm > 0)
    .map((l) => ({
      localeId: l.id,
      unitCode: l.unitCode,
      tenantEntity: l.tenantEntity,
      tradeName: l.tradeName,
      sqm: l.sqm,
      rentMonthly: l.rentMonthly,
      rentPerSqm: l.rentMonthly / l.sqm,
    }));
  const sortedPerSqm = [...benchmarkRows.map((r) => r.rentPerSqm)].sort((a, b) => a - b);
  const mid = Math.floor(sortedPerSqm.length / 2);
  const medianRentPerSqm =
    sortedPerSqm.length === 0
      ? 0
      : sortedPerSqm.length % 2 === 0
        ? (sortedPerSqm[mid - 1] + sortedPerSqm[mid]) / 2
        : sortedPerSqm[mid];
  const rentBenchmarkRows: RentBenchmarkRow[] = benchmarkRows
    .map((r) => ({
      ...r,
      deltaFromMedianPct: medianRentPerSqm > 0 ? ((r.rentPerSqm - medianRentPerSqm) / medianRentPerSqm) * 100 : 0,
    }))
    .sort((a, b) => a.deltaFromMedianPct - b.deltaFromMedianPct);

  // CAM summary — same boundary cam.server.ts holds: a lease count and a
  // ledger sum, never an allocation. Recomputed here rather than calling
  // fetchCamData() directly to avoid double-fetching portfolio (that
  // function calls fetchPortfolio() itself).
  const leasesWithTermsCount = portfolio.leases.filter((l) => l.camShareBasis !== null).length;
  const totalAttributedExpense = ticketData.tickets
    .filter((t) => t.costBucket === "CAM")
    .reduce((sum, t) => sum + (t.finalCost ?? t.estimatedCost ?? 0), 0);

  return {
    contractedRentTotal: portfolio.contractedRent,
    activeLeaseCount: portfolio.leases.length,
    rentEvents,
    escalationByMonth,
    leasesWithoutSchedule,
    confirmedNoneCount,
    rentProjection24mo,
    missedEscalation: {
      verified: { rows: verifiedRows, monthlyTotal: verifiedMonthlyTotal, totalOwedAllTime: verifiedTotalOwedAllTime },
      unverifiable: { rows: unverifiableRows },
      onScheduleCount,
    },
    expirationLadder24mo,
    rentBenchmark: {
      medianRentPerSqm,
      rows: rentBenchmarkRows,
    },
    camSummary: {
      leasesWithTermsCount,
      totalActiveLeases: portfolio.leases.length,
      totalAttributedExpense,
    },
  };
}
