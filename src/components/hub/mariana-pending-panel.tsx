"use client";

import { useState } from "react";
import type { ApprovalQueueItem, ApprovalQueueItemKind } from "@/lib/approval-queue";

const KIND_LABEL: Record<ApprovalQueueItemKind, string> = {
  ticket: "Mantenimiento",
  lease_application: "Solicitud de Arrendamiento",
  lease_renewal: "Renovación",
  lease_match: "Confirmar Local del Contrato",
  lease_extraction: "Validar Datos Extraídos",
};

// Collapsed-group summary text — only used for the two kinds volume enough
// to dominate a flat list (a real 69-vs-3 case is what motivated grouping
// these instead of listing every row: see legal-documents-panel.tsx, the
// same source these rows deep-link back to).
const GROUP_LABEL: Record<"lease_match" | "lease_extraction", (count: number) => string> = {
  lease_match: (n) => `${n} coincidencia${n === 1 ? "" : "s"} de local por confirmar`,
  lease_extraction: (n) => `${n} validación${n === 1 ? "" : "es"} de extracción pendiente${n === 1 ? "" : "s"}`,
};

const PRIORITY_BADGE: Record<string, string> = {
  ALTO: "bg-red-100 text-red-800 border-red-300",
  MEDIO: "bg-amber-100 text-amber-800 border-amber-300",
  BAJO: "bg-slate-100 text-ink-700 border-hairline",
};

function ageLabel(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

function ItemRow({
  item,
  onNavigate,
  showKindBadge = true,
}: {
  item: ApprovalQueueItem;
  onNavigate: (item: ApprovalQueueItem) => void;
  showKindBadge?: boolean;
}) {
  const actionable = "tab" in item.deepLink;
  return (
    <div className="border border-hairline rounded-xl p-3.5 bg-white flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {showKindBadge && (
            <span className="text-[11px] font-bold bg-slate-100 text-ink-700 px-2 py-0.5 rounded-md border border-hairline shrink-0">
              {KIND_LABEL[item.kind]}
            </span>
          )}
          {item.priority && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                PRIORITY_BADGE[item.priority] ?? "bg-slate-100 text-ink-700 border-hairline"
              }`}
            >
              {item.priority}
            </span>
          )}
          <p className="font-bold text-xs text-ink truncate">{item.subject}</p>
        </div>
        <p className="text-[11px] text-ink-500 font-medium mt-1">
          {item.unit ? `${item.unit} · ` : ""}
          {item.requiredAction} · {ageLabel(item.createdAt)}
        </p>
      </div>

      {actionable ? (
        <button
          type="button"
          onClick={() => onNavigate(item)}
          className="text-xs font-bold text-white bg-ink px-3 py-1.5 rounded-lg hover:bg-ink-700 cursor-pointer shrink-0"
        >
          Ir a revisión →
        </button>
      ) : (
        <span className="text-[11px] font-semibold text-ink-500 shrink-0 text-right max-w-[9rem]">
          Revisión pendiente — panel aún no existe
        </span>
      )}
    </div>
  );
}

/** One kind's rows inside the Expedientes group — collapsed by default
 *  behind a count summary (69 near-identical rows read as noise, not
 *  signal, next to a real legal decision), expandable to the full list on
 *  demand. */
function DocumentGroup({
  kind,
  items,
  onNavigate,
}: {
  kind: "lease_match" | "lease_extraction";
  items: ApprovalQueueItem[];
  onNavigate: (item: ApprovalQueueItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className="border border-hairline rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-3.5 text-left cursor-pointer hover:bg-slate-50"
      >
        <div className="min-w-0">
          <p className="font-bold text-xs text-ink">{GROUP_LABEL[kind](items.length)}</p>
          <p className="text-[11px] text-ink-500 font-medium mt-0.5">
            {KIND_LABEL[kind]} · más antiguo: {ageLabel(items[0].createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(items[0]);
            }}
            className="text-xs font-bold text-white bg-ink px-3 py-1.5 rounded-lg hover:bg-ink-700 cursor-pointer"
          >
            Ir a revisión →
          </button>
          <span className="text-ink-400 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-hairline p-3 space-y-2 bg-slate-50/60">
          {items.map((item) => (
            <ItemRow key={`${item.kind}-${item.id}`} item={item} onNavigate={onNavigate} showKindBadge={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-ink-400 tracking-wider">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/**
 * Mariana's landing view — decisions waiting inside her own legal domain,
 * not a separate cross-agent inbox page (that shape put a 69-document
 * matching backlog next to a P1 dispatch approval as if they were the same
 * kind of "pending," and detached the work from where it's actually
 * reviewed). `items` is the same buildApprovalQueue() output the sidebar
 * badges are computed from — this just renders the three kinds that belong
 * to Mariana; ticket items pass through untouched (Diego's own Triage view
 * already surfaces those).
 */
export function MarianaPendingPanel({
  items,
  onNavigate,
  onRefresh,
  refreshing,
}: {
  items: ApprovalQueueItem[];
  onNavigate: (item: ApprovalQueueItem) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const applicationItems = items.filter((i) => i.kind === "lease_application");
  const renewalItems = items.filter((i) => i.kind === "lease_renewal");
  const leaseMatchItems = items.filter((i) => i.kind === "lease_match");
  const leaseExtractionItems = items.filter((i) => i.kind === "lease_extraction");
  const total = applicationItems.length + renewalItems.length + leaseMatchItems.length + leaseExtractionItems.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-ink-500">
          {total === 0
            ? "Nada pendiente de tu revisión legal."
            : `${applicationItems.length + renewalItems.length} decisión${
                applicationItems.length + renewalItems.length === 1 ? "" : "es"
              } · ${leaseMatchItems.length + leaseExtractionItems.length} expediente${
                leaseMatchItems.length + leaseExtractionItems.length === 1 ? "" : "s"
              } por validar.`}
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="text-xs font-bold bg-slate-100 text-ink-700 px-3 py-1.5 rounded-lg border border-hairline hover:bg-slate-200 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shrink-0"
        >
          {refreshing ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {applicationItems.length > 0 && (
        <Section title={`Solicitudes de Arrendamiento (${applicationItems.length})`}>
          {applicationItems.map((item) => (
            <ItemRow key={`${item.kind}-${item.id}`} item={item} onNavigate={onNavigate} showKindBadge={false} />
          ))}
        </Section>
      )}

      {renewalItems.length > 0 && (
        <Section title={`Renovaciones (${renewalItems.length})`}>
          {renewalItems.map((item) => (
            <ItemRow key={`${item.kind}-${item.id}`} item={item} onNavigate={onNavigate} showKindBadge={false} />
          ))}
        </Section>
      )}

      {(leaseMatchItems.length > 0 || leaseExtractionItems.length > 0) && (
        <Section title="Expedientes: Confirmar Local / Validar Extracción">
          <DocumentGroup kind="lease_match" items={leaseMatchItems} onNavigate={onNavigate} />
          <DocumentGroup kind="lease_extraction" items={leaseExtractionItems} onNavigate={onNavigate} />
        </Section>
      )}
    </div>
  );
}
