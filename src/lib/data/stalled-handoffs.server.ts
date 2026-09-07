import "server-only";
import { fetchPortfolio } from "@/lib/data/portfolio.server";
import { LEASE_RENT_HISTORY_SINCE, computeDaysRemaining } from "@/lib/data/contract-status";

export type HandoffKind =
  | "application_unpromoted"
  | "renewal_pending"
  | "renewal_rejected_stale"
  | "clause_needs_counsel"
  | "clause_awaiting_reading"
  | "clause_ready_to_redo"
  | "lease_expired_no_renewal"
  | "escalation_missed_unaddressed";

export type StalledHandoff = {
  kind: HandoffKind;
  key: string;
  /** What's stuck. */
  title: string;
  /** Unit + tenant context. */
  subtitle: string;
  /** Whole days since `since`. */
  daysStuck: number;
  /** ISO date/timestamp the clock started — shown so "how long" is
   *  auditable, not just asserted. */
  since: string;
  /** Who the handoff is waiting on — a role or agent, never "system". */
  waitingOn: "Arrendador" | "Mariana IA" | "Asesoría legal";
  actionLabel: string;
  actionHref: string;
  /** Verbatim quoted context when there's a real quote to show (landlord
   *  feedback, a rejection reason) — never paraphrased. */
  note?: string;
};

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

/**
 * Backs /consola/atascos — every stalled handoff in the four-agent loop,
 * derived entirely from fetchPortfolio()'s existing LeaseDetail[] (plus
 * Portfolio.approvedApplications, same call), same re-aggregation pattern
 * as fetchMoneyOverTimeData/fetchActivityDigest. No new queries: this is
 * the same portfolio every other /consola page already fetches, just read
 * for a different question — not "what's the state of things" but "what
 * finished on one side of a handoff and never got picked up on the other."
 *
 * Eight states, one per bullet Roberto named live-reviewing the ⌘K build:
 * an approved application nobody promoted, a renewal review nobody
 * resolved, a rejected draft nobody replaced, landlord feedback nobody
 * redrafted against, a clause flagged for counsel or a read nobody closed,
 * an expired lease with no renewal in flight, a verified-missed escalation
 * nobody applied or explained, and a clause marked ready-to-redo nobody
 * redid. "No action taken" for the escalation case has a real resolution
 * signal already built in: the moment a real rent increase lands in
 * lease_rent_history, computeEscalationAudit flips that cycle's `applied`
 * to true and it drops off this list on its own — no dismiss button
 * needed, because the underlying thing actually got fixed.
 */
export async function fetchStalledHandoffs(): Promise<StalledHandoff[]> {
  const portfolio = await fetchPortfolio();
  const handoffs: StalledHandoff[] = [];

  for (const l of portfolio.leases) {
    const subtitle = `${l.unitCode} · ${l.tradeName ?? l.tenantEntity}`;
    const latestRenewal = l.renewals[0] ?? null;

    if (latestRenewal?.status === "needs_landlord_review") {
      const hasFeedback = latestRenewal.landlordFeedback !== null;
      handoffs.push({
        kind: "renewal_pending",
        key: `renewal-pending-${latestRenewal.id}`,
        title: hasFeedback
          ? `Renovación ${latestRenewal.renewalNumber} — arrendador ya pidió cambios, sin nuevo borrador`
          : `Renovación ${latestRenewal.renewalNumber} sin resolver`,
        subtitle,
        daysStuck: daysSince(latestRenewal.createdAt),
        since: latestRenewal.createdAt,
        waitingOn: hasFeedback ? "Mariana IA" : "Arrendador",
        actionLabel: hasFeedback ? "Redactar nueva versión" : "Aprobar o rechazar",
        actionHref: `/consola/renovaciones/${latestRenewal.id}`,
        note: hasFeedback ? `Comentario del arrendador: "${latestRenewal.landlordFeedback}"` : undefined,
      });
    } else if (latestRenewal?.status === "rejected") {
      handoffs.push({
        kind: "renewal_rejected_stale",
        key: `renewal-rejected-${latestRenewal.id}`,
        title: `Renovación ${latestRenewal.renewalNumber} rechazada, sin nuevo borrador`,
        subtitle,
        daysStuck: daysSince(latestRenewal.createdAt),
        since: latestRenewal.createdAt,
        waitingOn: "Mariana IA",
        actionLabel: "Ver motivo y decidir siguiente paso",
        actionHref: `/consola/renovaciones/${latestRenewal.id}`,
        note: latestRenewal.rejectionReason ? `Motivo del rechazo: "${latestRenewal.rejectionReason}"` : undefined,
      });
    }

    if (l.isExpired && l.renewals.length === 0) {
      handoffs.push({
        kind: "lease_expired_no_renewal",
        key: `expired-${l.id}`,
        title: "Contrato vencido, sin renovación redactada",
        subtitle,
        daysStuck: Math.max(0, -computeDaysRemaining(l.endDate)),
        since: l.endDate,
        waitingOn: "Mariana IA",
        actionLabel: "Redactar renovación",
        actionHref: `/consola/locales/${l.id}`,
      });
    }

    for (const c of l.clauses) {
      if (c.reviewStatus === "needs_counsel" || c.reviewStatus === "awaiting_reading") {
        handoffs.push({
          kind: c.reviewStatus === "needs_counsel" ? "clause_needs_counsel" : "clause_awaiting_reading",
          key: `clause-${c.id}`,
          title: `Cláusula ${c.clauseNumber} — ${c.clauseLabel}`,
          subtitle,
          daysStuck: daysSince(c.createdAt),
          since: c.createdAt,
          waitingOn: c.reviewStatus === "needs_counsel" ? "Asesoría legal" : "Arrendador",
          actionLabel: c.reviewStatus === "needs_counsel" ? "Enviar a asesoría legal" : "Leer y confirmar",
          actionHref: `/consola/locales/${l.id}`,
        });
      } else if (c.reviewStatus === "ready_to_redo") {
        handoffs.push({
          kind: "clause_ready_to_redo",
          key: `clause-redo-${c.id}`,
          title: `Cláusula ${c.clauseNumber} lista para redactar de nuevo — ${c.clauseLabel}`,
          subtitle,
          daysStuck: daysSince(c.createdAt),
          since: c.createdAt,
          waitingOn: "Mariana IA",
          actionLabel: "Redactar renovación con la cláusula actualizada",
          actionHref: `/consola/locales/${l.id}`,
        });
      }
    }

    for (const cycle of l.escalationCycles) {
      if (!cycle.applied && cycle.dueDate >= LEASE_RENT_HISTORY_SINCE) {
        handoffs.push({
          kind: "escalation_missed_unaddressed",
          key: `escalation-${l.id}-${cycle.dueDate}`,
          title: `Escalación vencida sin aplicar${l.escalationPct !== null ? ` (${l.escalationPct}%)` : ""}`,
          subtitle,
          daysStuck: Math.max(0, -computeDaysRemaining(cycle.dueDate)),
          since: cycle.dueDate,
          waitingOn: "Arrendador",
          actionLabel: "Aplicar el aumento o confirmar por qué no aplica",
          actionHref: "/consola/finanzas",
        });
      }
    }
  }

  for (const a of portfolio.approvedApplications) {
    handoffs.push({
      kind: "application_unpromoted",
      key: `app-${a.id}`,
      title: `Solicitud ${a.applicationNumber} aprobada, no agregada como inquilino`,
      subtitle: `${a.targetUnitCode} · ${a.applicantEntity}`,
      daysStuck: daysSince(a.createdAt),
      since: a.createdAt,
      waitingOn: "Arrendador",
      actionLabel: "Agregar como inquilino",
      actionHref: "/consola",
    });
  }

  return handoffs.sort((a, b) => b.daysStuck - a.daysStuck);
}
