"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DiegoTicket } from "@/lib/data/diego-tickets.server";
import { CONSOLE_ROOT_ID } from "@/components/hub/console-root";
import {
  COST_BUCKET_BADGE,
  COST_BUCKET_LABEL,
  PRIORITY_BADGE,
  STATUS_BADGE,
  STATUS_LABEL,
  formatMxn,
  useResolveTicket,
} from "@/components/hub/diego-ticket-ui";

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Card({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <header className="border-b border-slate-100 px-4 py-2.5">
        {eyebrow && (
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{eyebrow}</p>
        )}
        <h4 className="text-xs font-bold text-slate-900">{title}</h4>
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-xs font-semibold text-slate-800">{children}</dd>
    </div>
  );
}

export function DiegoTicketDrawer({ ticket, onClose }: { ticket: DiegoTicket; onClose: () => void }) {
  const { submitting, errorMsg, resolve } = useResolveTicket(ticket.id);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // aria-modal="true" tells assistive tech the virtual cursor is constrained
  // to this dialog, which is only true if keyboard focus actually moves in on
  // open and back out on close. Capture whatever had focus (typically the
  // ticket row that was clicked) before the portal target is even resolved,
  // so the restore-on-unmount below always has the right target.
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    setHost(document.getElementById(CONSOLE_ROOT_ID) ?? document.body);
    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, []);

  // The close button only exists in the DOM once `host` is set and the portal
  // renders, so focus-on-open has to key off `host` rather than run on mount.
  useEffect(() => {
    if (host) {
      closeButtonRef.current?.focus();
    }
  }, [host]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const awaitingApproval = ticket.status === "needs_approval";
  const hasConcerns = ticket.skepticFlagged && ticket.skepticConcerns.length > 0;

  if (!host) return null;

  // The portal host is a `space-y-*` container, which would hand these two
  // siblings a stray margin-top; on a fixed box with both insets set that
  // shifts and shortens the panel, so it is zeroed inline.
  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 animate-fadeIn"
        style={{ marginTop: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={"Expediente del ticket " + ticket.ticketNumber}
        style={{ marginTop: 0 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl animate-fadeIn"
      >
        {/* HEADER */}
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{ticket.ticketNumber}</span>
              {ticket.priority && (
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-bold " + PRIORITY_BADGE[ticket.priority]
                  }
                >
                  {ticket.priority}
                </span>
              )}
              <span
                className={
                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap " +
                  STATUS_BADGE[ticket.status]
                }
              >
                {STATUS_LABEL[ticket.status]}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {ticket.propertyName} · Local {ticket.unitNumber}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar expediente"
            className="shrink-0 cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-[var(--console-accent)]"
          >
            Cerrar ✕
          </button>
        </header>

        {/* BODY */}
        <div className="flex-1 space-y-3.5 overflow-y-auto p-5">
          {/* LEGAL CAUTION BANNER — the raw watermark string, rendered for a human.
              Governance §4 requires the unresolved keys be named at runtime, not
              hardcoded; this reformats them, it does not soften them. */}
          {ticket.showWatermark && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold text-amber-900">
                Borrador — pendiente de firma del abogado del arrendador
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-900/90">
                Este expediente cita parámetros de jurisdicción que aún no han sido verificados por el
                abogado del arrendador. No constituye asesoría legal.
              </p>
              {ticket.unresolvedKeys.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Claves sin resolver
                  </span>
                  {ticket.unresolvedKeys.map((key) => (
                    <span
                      key={key}
                      className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-amber-900"
                    >
                      {key}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 1 · EXECUTIVE REPORT CARD */}
          <Card eyebrow="Reporte del inquilino" title="Ficha Ejecutiva">
            <dl className="grid grid-cols-2 gap-3">
              <Field label="Inquilino">{ticket.tenantEntity ?? "—"}</Field>
              <Field label="Ubicación">
                {ticket.propertyName} · Local {ticket.unitNumber}
              </Field>
              <Field label="Recibido">{formatTimestamp(ticket.createdAt)}</Field>
              <Field label="Prioridad">{ticket.priority ?? "Sin asignar"}</Field>
            </dl>
            <blockquote className="mt-3 rounded-lg border-l-2 border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-800">
              &ldquo;{ticket.rawReport}&rdquo;
            </blockquote>
          </Card>

          {/* 2 · DIEGO IA DIAGNOSTIC CARD */}
          <Card eyebrow="Análisis automático" title="Diagnóstico de Diego IA">
            {ticket.diagnosis ? (
              <p className="text-xs leading-relaxed text-slate-800">{ticket.diagnosis}</p>
            ) : (
              <p className="text-xs italic text-slate-500">
                Diego aún no ha emitido diagnóstico para este ticket.
              </p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <Field label="Costo estimado">
                {ticket.estimatedCost !== null ? formatMxn(ticket.estimatedCost) : "Sin estimar"}
              </Field>
              <Field label="Responsabilidad del costo">
                {ticket.costBucket ? (
                  <span
                    className={
                      "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold " +
                      COST_BUCKET_BADGE[ticket.costBucket]
                    }
                  >
                    {COST_BUCKET_LABEL[ticket.costBucket]}
                  </span>
                ) : (
                  "Sin atribuir"
                )}
              </Field>
              <Field label="Contratista asignado">{ticket.contractorName ?? "Sin asignar"}</Field>
            </dl>
          </Card>

          {/* 3 · SKEPTIC AI AUDIT CARD */}
          {hasConcerns && (
            <Card eyebrow="Auditoría · Skeptic IA" title="Dudas sin resolver">
              <ul className="space-y-2">
                {ticket.skepticConcerns.map((concern, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-red-100 border-l-2 border-l-red-400 bg-red-50/60 px-3 py-2 text-xs leading-relaxed text-slate-800"
                  >
                    {concern}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* 4 · TECHNICAL AUDIT LOG — collapsed by default. Raw system values a
              landlord never needs, but an auditor eventually will. */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setAuditExpanded((v) => !v)}
              aria-expanded={auditExpanded}
              className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-left"
            >
              <span className="text-[11px] font-semibold text-slate-600">
                Mostrar detalles de auditoría técnica
              </span>
              <span className="text-[11px] font-bold text-slate-400">{auditExpanded ? "▴" : "▾"}</span>
            </button>
            {auditExpanded && (
              <dl className="space-y-2 border-t border-slate-100 px-4 py-3 font-mono text-[10px] text-slate-600">
                <div>
                  <dt className="font-bold text-slate-400">ticket_id</dt>
                  <dd className="break-all text-slate-700">{ticket.id}</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-400">status</dt>
                  <dd className="text-slate-700">{ticket.status}</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-400">created_at</dt>
                  <dd className="text-slate-700">{ticket.createdAt}</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-400">unresolved_jd_keys</dt>
                  <dd className="break-all text-slate-700">
                    {ticket.unresolvedKeys.length > 0 ? ticket.unresolvedKeys.join(", ") : "[]"}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-400">skeptic_flagged</dt>
                  <dd className="text-slate-700">{String(ticket.skepticFlagged)}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>

        {/* STICKY ACTION BAR — the Tier 3 human gate, same endpoint as the queue row. */}
        {awaitingApproval && (
          <footer className="border-t border-slate-200 bg-white px-5 py-3.5">
            {errorMsg && <p className="mb-2 text-[11px] font-semibold text-red-600">{errorMsg}</p>}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => resolve(false)}
                disabled={submitting !== null}
                className="cursor-pointer rounded-xl border border-[var(--console-accent)] bg-white px-4 py-2.5 text-xs font-bold text-[var(--console-accent)] transition-all hover:bg-[var(--console-accent-soft)] disabled:cursor-default disabled:opacity-50"
              >
                {submitting === "reject" ? "Rechazando…" : "Rechazar"}
              </button>
              <button
                type="button"
                onClick={() => resolve(true)}
                disabled={submitting !== null}
                className="flex-1 cursor-pointer rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-ink-700 disabled:cursor-default disabled:opacity-50"
              >
                {submitting === "approve"
                  ? "Despachando…"
                  : ticket.estimatedCost !== null
                    ? "Aprobar y Despachar · " + formatMxn(ticket.estimatedCost)
                    : "Aprobar y Despachar"}
              </button>
            </div>
          </footer>
        )}
      </aside>
    </>,
    host,
  );
}
