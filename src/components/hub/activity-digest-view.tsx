"use client";

import { formatMxn, COST_BUCKET_LABEL } from "@/components/hub/diego-ticket-ui";
import type { ActivityDigest } from "@/lib/data/activity-digest.server";

function GroupCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-hairline rounded-2xl p-4 sm:p-5 space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
        {subtitle && <p className="text-[11px] text-ink-500 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, cls = "text-slate-900" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="bg-slate-50 border border-hairline rounded-xl p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-base font-extrabold mt-0.5 ${cls}`}>{value}</p>
    </div>
  );
}

export function ActivityDigestView({ digest }: { digest: ActivityDigest }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-hairline rounded-2xl p-5">
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">Actividad de los Agentes</h1>
        <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
          Totales acumulados reales, calculados al momento — no es un reporte programado ni enviado por correo (este
          sistema no tiene todavía esa infraestructura). Cada cifra viene directamente de las mismas tablas que el
          resto de la consola.
        </p>
      </div>

      <GroupCard title="Diego IA · Mantenimiento" subtitle="Triage, diagnóstico y atribución de costo por ticket.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Tickets totales" value={String(digest.diego.ticketsTotal)} />
          <Stat label="Activos ahora" value={String(digest.diego.ticketsActive)} />
          <Stat label="Costo gestionado" value={formatMxn(digest.diego.costManagedTotal)} />
          <Stat
            label="Cubiertos por garantía"
            value={String(digest.diego.warrantyCoveredCount)}
            cls={digest.diego.warrantyCoveredCount > 0 ? "text-emerald-700" : "text-slate-900"}
          />
        </div>
        {digest.diego.costByBucket.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Costo por responsable (excluye garantía)
            </p>
            <div className="divide-y divide-hairline">
              {digest.diego.costByBucket.map((b) => (
                <div key={b.bucket} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="font-semibold text-ink-700">
                    {COST_BUCKET_LABEL[b.bucket]} <span className="text-ink-400 font-medium">({b.count})</span>
                  </span>
                  <span className="font-bold text-ink">{formatMxn(b.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </GroupCard>

      <GroupCard title="Mariana IA · Renovaciones" subtitle="Convenios modificatorios redactados y su resolución.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Borradores totales" value={String(digest.renewals.draftedTotal)} />
          <Stat label="Aprobados" value={String(digest.renewals.approvedTotal)} cls="text-emerald-700" />
          <Stat label="Rechazados" value={String(digest.renewals.rejectedTotal)} />
          <Stat label="Pendientes" value={String(digest.renewals.pendingTotal)} cls="text-amber-700" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Stat label="Renta anual capturada (aprobadas)" value={formatMxn(digest.renewals.annualRentCapturedApproved)} cls="text-emerald-700" />
          <Stat label="Renta anual en borradores pendientes" value={formatMxn(digest.renewals.annualRentPendingDrafts)} />
        </div>
        {digest.renewals.skepticFlaggedTotal > 0 && (
          <p className="text-xs text-ink-500 font-medium">
            {digest.renewals.skepticFlaggedTotal} borrador{digest.renewals.skepticFlaggedTotal === 1 ? "" : "es"} marcado
            {digest.renewals.skepticFlaggedTotal === 1 ? "" : "s"} por la auditoría de Mariana IA antes de llegar al
            arrendador.
          </p>
        )}
      </GroupCard>

      <GroupCard title="Mariana IA · Solicitudes de Arrendamiento" subtitle="Evaluación de viabilidad y conflictos de exclusividad.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Solicitudes evaluadas" value={String(digest.screening.evaluatedTotal)} />
          <Stat label="Aprobadas" value={String(digest.screening.approvedTotal)} cls="text-emerald-700" />
          <Stat label="Rechazadas" value={String(digest.screening.rejectedTotal)} />
          <Stat
            label="Conflictos ALTO detectados"
            value={String(digest.screening.altoRiskCaught)}
            cls={digest.screening.altoRiskCaught > 0 ? "text-red-700" : "text-slate-900"}
          />
        </div>
      </GroupCard>

      <GroupCard title="Documentos" subtitle="Contratos digitalizados con ambas confirmaciones humanas completas.">
        <Stat label="Contratos digitalizados" value={String(digest.documents.digitizedTotal)} />
      </GroupCard>
    </div>
  );
}
