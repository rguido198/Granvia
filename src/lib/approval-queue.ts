import type { DiegoTicket } from "@/lib/data/diego-tickets.server";
import type { Portfolio, LeaseDocumentRow } from "@/lib/data/portfolio.server";
import type { PendingLeaseApplication } from "@/lib/data/approval-queue.server";
import { isDocumentActionable } from "@/lib/data/document-status";

/**
 * Pure aggregation over decisions that already exist in four other tables —
 * no new schema, no new source of truth. Deliberately a plain module (not
 * *.server.ts): the same buildApprovalQueue() call runs once server-side for
 * the initial consola/page.tsx render, and again client-side in
 * landlord-dashboard.tsx every time one of the live-polled inputs
 * (livePortfolio, liveActiveLeaseDocuments, liveDiegoTickets,
 * liveLeaseApplications) changes — one aggregation implementation, so the
 * two can't drift on what counts as "pending."
 *
 * v1 is read-only. Each item's deepLink names the existing review panel
 * (or, for lease_application, nothing — no such panel exists yet, see
 * approval-queue.server.ts's doc comment) where the actual approve/reject
 * still happens through the untouched /api/workflow/* routes.
 */

export type ApprovalQueueItemKind =
  | "ticket"
  | "lease_application"
  | "lease_renewal"
  | "lease_match"
  | "lease_extraction";

export type ApprovalQueueItem = {
  id: string;
  kind: ApprovalQueueItemKind;
  status: string;
  priority: "P1" | "P2" | "P3" | "P4" | "ALTO" | "MEDIO" | "BAJO" | null;
  subject: string;
  unit: string | null;
  createdAt: string;
  requiredAction: string;
  /** `target` is always present, even for lease_application — so a future
   *  Mariana review panel can wire up `tab`/`subTab` without this type, or
   *  any queue item already built against it, needing to change. Absence of
   *  `tab` (not a null value) is what the inbox UI reads as "no panel yet." */
  deepLink:
    | { tab: "maint" | "legal"; subTab?: string; target: { kind: ApprovalQueueItemKind; id: string } }
    | { target: { kind: "lease_application"; id: string } };
};

const PRIORITY_RANK: Record<string, number> = {
  P1: 0,
  P2: 1,
  P3: 2,
  P4: 3,
  ALTO: 4,
  MEDIO: 5,
  BAJO: 6,
};

// Anything with no priority at all — the two document-gate kinds, which
// carry no priority field, and a lease_renewal (lease_renewals has no
// urgency column) — sorts into this last bucket, oldest first. Not just the
// document gates: a renewal has nothing to rank it above or below them, so
// grouping it into the same catch-all is the only non-arbitrary reading of
// "then oldest first" as the tiebreak for everything without a priority.
const UNRANKED = 7;

function rankOf(priority: ApprovalQueueItem["priority"]): number {
  if (!priority) return UNRANKED;
  return PRIORITY_RANK[priority] ?? UNRANKED;
}

export function buildApprovalQueue(input: {
  diegoTickets: DiegoTicket[];
  portfolio: Portfolio;
  activeLeaseDocuments: LeaseDocumentRow[];
  leaseApplications: PendingLeaseApplication[];
}): ApprovalQueueItem[] {
  const items: ApprovalQueueItem[] = [];

  for (const t of input.diegoTickets) {
    if (t.status !== "needs_approval") continue;
    items.push({
      id: t.id,
      kind: "ticket",
      status: t.status,
      priority: t.priority,
      subject: t.tenantEntity ?? t.ticketNumber,
      unit: t.unitNumber,
      createdAt: t.createdAt,
      requiredAction: "Aprobar dispatch",
      deepLink: { tab: "maint", subTab: "triage", target: { kind: "ticket", id: t.id } },
    });
  }

  for (const lease of input.portfolio.leases) {
    for (const renewal of lease.renewals) {
      if (renewal.status !== "needs_landlord_review") continue;
      items.push({
        id: renewal.id,
        kind: "lease_renewal",
        status: renewal.status,
        priority: null,
        subject: lease.tenantEntity,
        unit: lease.unitCode,
        createdAt: renewal.createdAt,
        requiredAction: "Aprobar renovación (Convenio Modificatorio)",
        // target.id is the lease's id (== the locale id, per LeaseDetail's
        // own convention), not renewal.id — that's what inspectedContractId
        // in landlord-dashboard.tsx is keyed on, and it's the parent lease
        // row that expands to show the renewal panel.
        deepLink: {
          tab: "legal",
          subTab: "expedientes",
          target: { kind: "lease_renewal", id: lease.id },
        },
      });
    }
  }

  for (const doc of input.activeLeaseDocuments) {
    if (!isDocumentActionable(doc)) continue;
    const isGate1 = doc.status === "ready_for_triage";
    items.push({
      id: doc.id,
      kind: isGate1 ? "lease_match" : "lease_extraction",
      status: doc.status,
      priority: null,
      subject: doc.documentTenantName ?? doc.documentTradeName ?? doc.originalFilename,
      unit: isGate1 ? doc.suggestedLocaleUnit : (doc.localeUnit ?? doc.suggestedLocaleUnit),
      createdAt: doc.createdAt,
      requiredAction: isGate1
        ? "Confirmar local del contrato"
        : "Validar datos extraídos del contrato",
      deepLink: {
        tab: "legal",
        subTab: "expedientes",
        target: { kind: isGate1 ? "lease_match" : "lease_extraction", id: doc.id },
      },
    });
  }

  for (const application of input.leaseApplications) {
    items.push({
      id: application.id,
      kind: "lease_application",
      status: "needs_landlord_review",
      priority: application.riskLevel,
      subject: application.applicantEntity,
      unit: application.unitNumber,
      createdAt: application.createdAt,
      requiredAction: "Revisar solicitud de arrendamiento",
      // No tab/subTab — legal/prospectos is a live screening tool, not a
      // pending-queue panel, and /api/workflow/approve-lease has no caller
      // anywhere in the UI today. Visible so this real Tier-3 gate isn't
      // hidden from the one place meant to surface all of them; not
      // actionable until a real review panel exists.
      deepLink: { target: { kind: "lease_application", id: application.id } },
    });
  }

  return items.sort((a, b) => {
    const rankDiff = rankOf(a.priority) - rankOf(b.priority);
    if (rankDiff !== 0) return rankDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
