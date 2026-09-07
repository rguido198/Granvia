"use server";

import { fetchPortfolio, type ApprovedApplication, type LeaseDetail } from "@/lib/data/portfolio.server";
import { fetchDiegoTickets, type DiegoTicket } from "@/lib/data/diego-tickets.server";
import { fetchPendingLeaseApplications, type PendingLeaseApplication } from "@/lib/data/approval-queue.server";

export type CommandPaletteIndex = {
  leases: LeaseDetail[];
  tickets: DiegoTicket[];
  pendingApplications: PendingLeaseApplication[];
  /** Approved by a landlord but not yet promoted to a real lease row
   *  (Portfolio.approvedApplications — the same list "+ Agregar desde
   *  Mariana IA" already reads). Distinct from a pending application (still
   *  needs_landlord_review) and from one that became a lease (findable
   *  instead via LeaseDetail.sourceApplicationNumber). */
  approvedApplications: ApprovedApplication[];
};

/**
 * The ⌘K command palette's only data dependency — a Server Action rather
 * than a page-level fetch because the palette itself lives in
 * consola/layout.tsx, mounted once for every /consola/* route, most of
 * which don't otherwise need this data at all (no point re-fetching the
 * full portfolio on every navigation to /consola/finanzas just because the
 * palette that route also renders MIGHT be opened). Called once per palette
 * open instead, so results stay current with whatever the landlord just
 * confirmed elsewhere.
 *
 * No new queries: fetchPortfolio/fetchDiegoTickets/fetchPendingLeaseApplications
 * are the exact same loaders consola/page.tsx already calls — renewals and
 * clauses the palette searches are already embedded per-lease on
 * LeaseDetail (.renewals, .clauses), so nothing extra is fetched or
 * re-derived here. Protected the same way every other /consola/* data load
 * is: middleware.ts's requireRole gate covers a Server Action's invoking
 * POST identically to a page GET, since both hit the same /consola/*
 * path — no separate auth check needed here, matching fetchPortfolio()'s
 * own convention of trusting the route, not re-checking per call.
 */
export async function fetchCommandPaletteIndexAction(): Promise<CommandPaletteIndex> {
  const [portfolio, ticketData, pendingApplications] = await Promise.all([
    fetchPortfolio(),
    fetchDiegoTickets(),
    fetchPendingLeaseApplications(),
  ]);

  return {
    leases: portfolio.leases,
    tickets: ticketData.tickets,
    pendingApplications,
    approvedApplications: portfolio.approvedApplications,
  };
}
