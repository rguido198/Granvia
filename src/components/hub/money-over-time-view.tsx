"use client";

import Link from "next/link";
import { formatMxn } from "@/components/hub/diego-ticket-ui";
import { formatSpanishDate } from "@/components/hub/lease-renewal-panel";
import type {
  EscalationLeaseRow,
  MoneyOverTimeData,
} from "@/lib/data/money-over-time.server";

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

function LeaseRow({ lease }: { lease: EscalationLeaseRow }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs">
      <div className="min-w-0">
        <p className="font-bold text-ink truncate">{lease.tradeName ?? lease.tenantEntity}</p>
        <p className="text-ink-500 font-medium">
          {lease.unitCode}
          {lease.escalationPct !== null && ` · ${lease.escalationPct}% (${lease.escalationMethod ?? "método sin registrar"})`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {lease.overdue && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-50 text-red-800 border-red-200">
            Vencida{lease.dueDate ? ` desde ${formatSpanishDate(lease.dueDate)}` : ""}
          </span>
        )}
        <Link href={`/consola/locales/${lease.localeId}`} className="font-bold text-[var(--console-accent)] hover:underline">
          Ver →
        </Link>
      </div>
    </div>
  );
}

export function MoneyOverTimeView({ data }: { data: MoneyOverTimeData }) {
  const activeMonths = data.escalationByMonth.filter((b) => b.leases.length > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">Dinero en el Tiempo</h1>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
            Renta contratada y cumplimiento de escalación — datos reales del portafolio. No incluye cobranza,
            recibos ni cartera vencida: este sistema no tiene todavía un módulo de facturación/pagos conectado
            (mismo límite documentado en la tarjeta de KPIs del Rent Roll).
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-hairline rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Renta Contratada Hoy</p>
            <p className="text-base font-extrabold text-slate-900">{formatMxn(data.contractedRentTotal)}</p>
          </div>
          <div className="bg-slate-50 border border-hairline rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contratos Activos</p>
            <p className="text-base font-extrabold text-slate-900">{data.activeLeaseCount}</p>
          </div>
          <div className="bg-slate-50 border border-hairline rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Escalaciones Vencidas</p>
            <p className={`text-base font-extrabold ${data.overdueCount > 0 ? "text-red-700" : "text-slate-900"}`}>{data.overdueCount}</p>
          </div>
          <div className="bg-slate-50 border border-hairline rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sin Escalación Programada</p>
            <p className="text-base font-extrabold text-slate-900">{data.leasesWithoutSchedule.length}</p>
          </div>
        </div>
      </div>

      {/* Escalation calendar */}
      <GroupCard
        title="Calendario de Escalaciones"
        subtitle="Cada contrato agrupado por el mes calendario en que le corresponde su ajuste anual — independiente del año."
      >
        {activeMonths.length === 0 ? (
          <p className="text-xs text-ink-500 font-medium">Ningún contrato tiene mes de escalación confirmado todavía.</p>
        ) : (
          <div className="space-y-4">
            {activeMonths.map((bucket) => {
              const overdueInBucket = bucket.leases.filter((l) => l.overdue).length;
              return (
                <div key={bucket.month}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-bold text-ink-700">{bucket.monthName}</p>
                    <p className="text-[11px] font-semibold text-ink-500">
                      {bucket.leases.length} contrato{bucket.leases.length === 1 ? "" : "s"}
                      {overdueInBucket > 0 && <span className="text-red-700"> · {overdueInBucket} vencida{overdueInBucket === 1 ? "" : "s"}</span>}
                    </p>
                  </div>
                  <div className="divide-y divide-hairline border-t border-hairline">
                    {bucket.leases.map((l) => (
                      <LeaseRow key={l.localeId} lease={l} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GroupCard>

      {/* Leases with no schedule at all */}
      {data.leasesWithoutSchedule.length > 0 && (
        <GroupCard
          title={`Sin escalación programada (${data.leasesWithoutSchedule.length})`}
          subtitle="No hay nada vencido aquí — nadie ha confirmado todavía cuándo debe aplicarse el ajuste anual de renta."
        >
          <div className="divide-y divide-hairline border-t border-hairline">
            {data.leasesWithoutSchedule.map((l) => (
              <LeaseRow key={l.localeId} lease={l} />
            ))}
          </div>
        </GroupCard>
      )}

      {/* Rent-change timeline — real events, not a reconstructed series */}
      <GroupCard
        title="Historial de Cambios de Renta"
        subtitle="Cada cambio de renta registrado, portafolio completo, más reciente primero."
      >
        {data.rentEvents.length === 0 ? (
          <p className="text-xs text-ink-500 font-medium">
            Sin cambios de renta registrados desde que este historial empezó a capturarse (3 sep 2026).
          </p>
        ) : (
          <div className="divide-y divide-hairline">
            {data.rentEvents.map((e, i) => (
              <div key={i} className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-ink">{e.tradeName ?? e.tenantEntity}</p>
                  <p className="text-ink-500 font-medium">{e.unitCode} · {formatSpanishDate(e.changedAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-ink">
                    {e.oldRent !== null ? formatMxn(e.oldRent) : "(sin registro)"} → {formatMxn(e.newRent)}
                  </span>
                  <Link href={`/consola/locales/${e.localeId}`} className="font-bold text-[var(--console-accent)] hover:underline">
                    Ver →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </GroupCard>
    </div>
  );
}
