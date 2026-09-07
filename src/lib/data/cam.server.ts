import "server-only";
import { fetchDiegoTickets, type DiegoTicket } from "@/lib/data/diego-tickets.server";
import { fetchPortfolio, type LeaseDetail } from "@/lib/data/portfolio.server";

export type CamExpenseLine = {
  ticketId: string;
  ticketNumber: string;
  unitCode: string;
  cost: number;
  /** Diego's own citation of which lease clause put this cost in the CAM
   *  bucket — the provenance that makes this line defensible, not just a
   *  number. Real trace, not an invented one: same field his ticket drawer
   *  already shows. */
  leaseClauseCitation: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
};

export type CamBackfillCandidate = {
  leaseRowId: string;
  localeId: string;
  unitCode: string;
  tenantEntity: string;
  tradeName: string | null;
  /** Evidence for the landlord to read before entering the three terms
   *  below — never mined/auto-suggested (unlike the escalation backfill):
   *  no keyword-based CAM-clause finder exists, and with 0/23 leases
   *  carrying these terms today there'd be nothing real to verify one
   *  against. Manual entry, evidence shown alongside it. */
  maintenanceClause: string | null;
};

export type CamData = {
  /**
   * The real CAM expense ledger — Diego's cost_bucket='CAM' tickets,
   * nothing else. `totalAttributed` is a SUM, deliberately never a
   * division: summing Diego's own attributed lines is presenting his data;
   * dividing that total by anything (a share basis, a cap, an admin fee)
   * is cam-allocator's (Renata's) deliverable, not built here, not
   * contracted for this engagement. See CamData.terms for the boundary
   * this file holds even once share/cap/admin-fee terms are on file.
   */
  ledger: {
    lines: CamExpenseLine[];
    totalAttributed: number;
  };
  /**
   * Contract terms — basis, cap, admin fee, evidence — with coverage
   * framing, same shape as the escalation backfill. Terms only, never a
   * peso figure derived from them: once a term is confirmed it's still
   * just displayed as a term ("basis: GLA share · cap 5% · admin fee 3%"),
   * not multiplied against the ledger total above. That multiplication is
   * exactly the line this file doesn't cross.
   */
  terms: {
    candidates: CamBackfillCandidate[];
    totalActiveLeases: number;
    /** Leases with camShareBasis set — the coverage numerator. Basis is
     *  the one of the three fields that's structurally required for the
     *  other two (cap, admin fee) to mean anything, so it's what "reviewed"
     *  tracks. */
    reviewedCount: number;
  };
};

function toExpenseLine(l: DiegoTicket): CamExpenseLine {
  return {
    ticketId: l.id,
    ticketNumber: l.ticketNumber,
    unitCode: l.unitNumber,
    cost: l.finalCost ?? l.estimatedCost ?? 0,
    leaseClauseCitation: l.leaseClauseCitation,
    approvedByName: l.approvedByName,
    approvedAt: l.approvedAt,
    createdAt: l.createdAt,
  };
}

function toBackfillCandidate(l: LeaseDetail): CamBackfillCandidate {
  return {
    leaseRowId: l.leaseRowId,
    localeId: l.id,
    unitCode: l.unitCode,
    tenantEntity: l.tenantEntity,
    tradeName: l.tradeName,
    maintenanceClause: l.maintenanceClause,
  };
}

/**
 * Backs /consola/cam. Bottom-up, not top-down: the expense side is
 * Diego's real attributed CAM tickets (no new query — fetchDiegoTickets()
 * is the same call consola/page.tsx already makes), and the terms side is
 * fetchPortfolio()'s existing LeaseDetail[] (same call every other
 * standalone page already makes). No allocation math anywhere in this
 * file — see CamData's own doc comments for exactly where that boundary
 * sits and why.
 */
export async function fetchCamData(): Promise<CamData> {
  const [portfolio, ticketData] = await Promise.all([fetchPortfolio(), fetchDiegoTickets()]);

  const camTickets = ticketData.tickets.filter((t) => t.costBucket === "CAM");
  const lines = camTickets.map(toExpenseLine).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const totalAttributed = lines.reduce((sum, l) => sum + l.cost, 0);

  const candidates = portfolio.leases.filter((l) => l.camShareBasis === null).map(toBackfillCandidate);
  const reviewedCount = portfolio.leases.length - candidates.length;

  return {
    ledger: { lines, totalAttributed },
    terms: {
      candidates,
      totalActiveLeases: portfolio.leases.length,
      reviewedCount,
    },
  };
}
