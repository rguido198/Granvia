"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { DiegoTicket } from "@/lib/data/diego-tickets.server";

const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function formatMxn(val: number) {
  return MXN.format(val);
}

export const STATUS_LABEL: Record<DiegoTicket["status"], string> = {
  pending_triage: "Pendiente de Triage",
  pending_diagnosis: "En Diagnóstico",
  pending_warranty_check: "Verificando Garantía",
  pending_cost_attribution: "Atribuyendo Costo",
  pending_skeptic: "En Auditoría",
  needs_approval: "Requiere Aprobación",
  dispatched: "Despachado",
  pending_confirmation: "Pendiente de Confirmación",
  reopened: "Reabierto por Inquilino",
  closed: "Cerrado",
  closed_administrative: "Cerrado (Administrativo)",
};

export const STATUS_BADGE: Record<DiegoTicket["status"], string> = {
  pending_triage: "bg-slate-100 text-slate-700 border border-slate-200",
  pending_diagnosis: "bg-slate-100 text-slate-700 border border-slate-200",
  pending_warranty_check: "bg-slate-100 text-slate-700 border border-slate-200",
  pending_cost_attribution: "bg-slate-100 text-slate-700 border border-slate-200",
  pending_skeptic: "bg-slate-100 text-slate-700 border border-slate-200",
  needs_approval: "bg-amber-100 text-amber-900 border border-amber-300",
  dispatched: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  pending_confirmation: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  // Amber/red, not dispatched's green — reopened reads as an escalation
  // (the tenant explicitly said the fix didn't hold), not routine progress.
  reopened: "bg-red-100 text-red-800 border border-red-300",
  closed: "bg-slate-100 text-slate-500 border border-slate-200",
  closed_administrative: "bg-slate-100 text-slate-500 border border-slate-200",
};

/** P1 is the only priority that should pull the eye across a full queue — the
 *  rest stay achromatic so severity, not decoration, is what reads. */
export const PRIORITY_BADGE: Record<NonNullable<DiegoTicket["priority"]>, string> = {
  P1: "bg-red-100 text-red-800 border border-red-200",
  P2: "bg-amber-100 text-amber-900 border border-amber-200",
  P3: "bg-slate-100 text-slate-700 border border-slate-200",
  P4: "bg-slate-100 text-slate-600 border border-slate-200",
};

/** Who eats the cost under the lease clause Diego matched. The raw enum is
 *  shouted upper-case in the database; a landlord reading a drawer is not. */
export const COST_BUCKET_LABEL: Record<NonNullable<DiegoTicket["costBucket"]>, string> = {
  ARRENDADOR: "Arrendador",
  INQUILINO: "Inquilino",
  CAM: "CAM · Gastos Comunes",
  PENDIENTE: "Pendiente de atribuir",
};

export const COST_BUCKET_BADGE: Record<NonNullable<DiegoTicket["costBucket"]>, string> = {
  ARRENDADOR: "bg-slate-800 text-white border border-slate-800",
  INQUILINO: "bg-white text-slate-800 border border-slate-300",
  CAM: "bg-slate-100 text-slate-800 border border-slate-300",
  PENDIENTE: "bg-amber-100 text-amber-900 border border-amber-300",
};

// The corporate suffix matters on a contract, not for picking a tenant out
// of a triage list — trimmed for display only, the underlying name is untouched.
const CORPORATE_SUFFIX_RE = /,?\s*(S\.?A\.?P\.?I\.?|S\.?A\.?|S\.?\s*de\s*R\.?L\.?)\s*(de\s*C\.?V\.?)?\.?\s*$/i;

export function shortTenantName(fullName: string) {
  const trimmed = fullName.replace(CORPORATE_SUFFIX_RE, "").trim();
  return trimmed || fullName;
}

/**
 * The single Tier 3 gate for a Diego ticket. Both the queue row's inline
 * ✓/✕ buttons and the drawer's action bar call this — one endpoint, one
 * payload shape, so the two surfaces can never drift apart.
 */
export function useResolveTicket(ticketId: string) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resolve = useCallback(
    async (approved: boolean) => {
      setSubmitting(approved ? "approve" : "reject");
      setErrorMsg(null);
      try {
        const res = await fetch("/api/workflow/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId, approved }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "HTTP " + res.status);
        }
        router.refresh();
        setSubmitting(null);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Error al resolver el ticket");
        setSubmitting(null);
      }
    },
    [ticketId, router],
  );

  return { submitting, errorMsg, resolve };
}

/**
 * The landlord half of the two-step close — dispatched -> pending_confirmation.
 * Same shape as useResolveTicket (submitting/errorMsg, router.refresh() on
 * success), different route/payload since this is a direct DB write, not a
 * resumeHook() call — the workflow's own hook already resolved at dispatch.
 */
export function useMarkTicketResolved(ticketId: string) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const markResolved = useCallback(
    async (workPerformed: string, finalCost: number | null) => {
      setSubmitting(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/tickets/${ticketId}/mark-resolved`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workPerformed, finalCost }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "HTTP " + res.status);
        }
        router.refresh();
        setSubmitting(false);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Error al registrar el trabajo terminado");
        setSubmitting(false);
      }
    },
    [ticketId, router],
  );

  return { submitting, errorMsg, markResolved };
}

/** Shared shape for the two no-body landlord actions below — same
 *  submitting/errorMsg/router.refresh() contract as useResolveTicket and
 *  useMarkTicketResolved, just without a payload to collect first. */
function usePostTicketAction(ticketId: string, path: "redispatch" | "close-administratively") {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const run = useCallback(async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/${path}`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "HTTP " + res.status);
      }
      router.refresh();
      setSubmitting(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al procesar la acción");
      setSubmitting(false);
    }
  }, [ticketId, path, router]);

  return { submitting, errorMsg, run };
}

/** reopened -> dispatched, same contractor, fresh dispatched_at. */
export function useRedispatchTicket(ticketId: string) {
  const { submitting, errorMsg, run } = usePostTicketAction(ticketId, "redispatch");
  return { submitting, errorMsg, redispatch: run };
}

/** pending_confirmation | reopened -> closed_administrative — the
 *  no-tenant-response escalation path (diego-ticket-drawer.tsx). */
export function useCloseTicketAdministratively(ticketId: string) {
  const { submitting, errorMsg, run } = usePostTicketAction(ticketId, "close-administratively");
  return { submitting, errorMsg, closeAdministratively: run };
}

/** Generates a single-dispatch contractor execution link. */
export function useGenerateContractorLink(ticketId: string) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const generateLink = useCallback(async () => {
    setSubmitting(true);
    setErrorMsg(null);
    setGeneratedUrl(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/contractor-link`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "HTTP " + res.status);
      }
      setGeneratedUrl(body.url as string);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al generar el enlace");
    } finally {
      setSubmitting(false);
    }
  }, [ticketId]);

  return { submitting, errorMsg, generatedUrl, generateLink };
}
