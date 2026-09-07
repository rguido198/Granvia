import { fetchPortfolio } from "@/lib/data/portfolio.server";
import { fetchDiegoTickets, type DiegoTicket } from "@/lib/data/diego-tickets.server";

export type UncertainTicket = {
  localeId: string | null;
  ticketNumber: string;
  unitNumber: string;
  tenantEntity: string | null;
  concerns: string[];
};

export type UncertainRenewal = {
  renewalId: string;
  renewalNumber: string;
  unitCode: string;
  tenantEntity: string;
  concerns: string[];
};

export type MissingDocumentLease = {
  localeId: string;
  unitCode: string;
  tenantEntity: string;
  tradeName: string | null;
};

export type ReopenedTicket = {
  localeId: string | null;
  ticketNumber: string;
  unitNumber: string;
  tenantEntity: string | null;
  rawReport: string;
};

export type ExceptionStatesData = {
  uncertainTickets: UncertainTicket[];
  uncertainRenewals: UncertainRenewal[];
  missingDocumentLeases: MissingDocumentLease[];
  reopenedTickets: ReopenedTicket[];
};

/**
 * Backs /consola/excepciones — root claude.md's #4 frontend priority:
 * screens for when an agent is uncertain, a document is missing, or a
 * tenant pushes back — not the happy-path table again.
 *
 * One honest substitution from Roberto's own three examples: "a tenant
 * disputes a charge" (who pays, or how much) has no real mechanism in this
 * codebase — no cost-dispute flow exists on a ticket's cost_bucket/
 * estimated_cost, and building one would be new product scope, not a UI
 * state for an existing one. What IS real is a tenant reporting a repair
 * didn't hold (tickets.status = 'reopened', via /api/tickets/[id]/reopen —
 * tenant-portal.tsx's "Reportar que Sigue Mal") — the closest genuine
 * "tenant pushed back" signal this system actually has, used here instead.
 *
 * Every other section reuses real flags that already exist and are read
 * elsewhere (skeptic_flagged/concerns on tickets and renewals,
 * sourceDocumentId nullability on leases) — no new columns, no new
 * queries beyond fetchPortfolio()/fetchDiegoTickets(), which every other
 * console screen already calls.
 */
export async function fetchExceptionStates(): Promise<ExceptionStatesData> {
  const [portfolio, { tickets }] = await Promise.all([fetchPortfolio(), fetchDiegoTickets()]);

  const uncertainTickets: UncertainTicket[] = tickets
    .filter((t) => t.skepticFlagged && t.skepticConcerns.length > 0)
    .map((t) => ({
      localeId: t.localeId,
      ticketNumber: t.ticketNumber,
      unitNumber: t.unitNumber,
      tenantEntity: t.tenantEntity,
      concerns: t.skepticConcerns,
    }));

  const uncertainRenewals: UncertainRenewal[] = portfolio.leases.flatMap((l) =>
    l.renewals
      .filter((r) => r.skepticFlagged && r.skepticConcerns.length > 0)
      .map((r) => ({
        renewalId: r.id,
        renewalNumber: r.renewalNumber,
        unitCode: l.unitCode,
        tenantEntity: l.tenantEntity,
        concerns: r.skepticConcerns,
      })),
  );

  const missingDocumentLeases: MissingDocumentLease[] = portfolio.leases
    .filter((l) => !l.sourceDocumentId)
    .map((l) => ({ localeId: l.id, unitCode: l.unitCode, tenantEntity: l.tenantEntity, tradeName: l.tradeName }));

  const reopenedTickets: ReopenedTicket[] = tickets
    .filter((t): t is DiegoTicket & { status: "reopened" } => t.status === "reopened")
    .map((t) => ({
      localeId: t.localeId,
      ticketNumber: t.ticketNumber,
      unitNumber: t.unitNumber,
      tenantEntity: t.tenantEntity,
      rawReport: t.rawReport,
    }));

  return { uncertainTickets, uncertainRenewals, missingDocumentLeases, reopenedTickets };
}
