import { fetchPortfolio } from "@/lib/data/portfolio.server";
import { fetchDiegoTickets, type DiegoTicket } from "@/lib/data/diego-tickets.server";
import type { LeaseDetail } from "@/lib/data/contract-status";

export type LeaseDetailPageData = {
  lease: LeaseDetail;
  /** Every Diego ticket ever logged for this locale, newest first —
   *  the page itself splits open vs. closed for the "open claims" view. */
  tickets: DiegoTicket[];
};

/**
 * Backs /consola/locales/[id] — the single-lease landing page (root
 * claude.md's #2 frontend priority: "there's no place to land when you
 * click a row"). Reuses fetchPortfolio() and fetchDiegoTickets() rather
 * than bespoke queries, same reasoning as fetchRenewalDetail: the fields
 * this page shows are exactly what those two already compute for the
 * SSOT table and the Diego triage queue, and a third query path would
 * risk drifting from both.
 */
export async function fetchLeaseDetailPage(localeId: string): Promise<LeaseDetailPageData | null> {
  const [portfolio, { tickets: allTickets }] = await Promise.all([fetchPortfolio(), fetchDiegoTickets()]);

  const lease = portfolio.leases.find((l) => l.id === localeId);
  if (!lease) return null;

  const tickets = allTickets
    .filter((t) => t.localeId === localeId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { lease, tickets };
}
