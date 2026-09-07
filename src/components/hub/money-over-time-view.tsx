"use client";

import Link from "next/link";
import { formatMxn } from "@/components/hub/diego-ticket-ui";
import { formatSpanishDate } from "@/components/hub/lease-renewal-panel";
import { ESCALATION_METHOD_LABEL, TIER_LABELS } from "@/lib/data/contract-status";
import type {
  EscalationAuditRow,
  EscalationLeaseRow,
  MoneyOverTimeData,
} from "@/lib/data/money-over-time.server";

const TIER_BADGE_CLS: Record<string, string> = {
  expired: "bg-red-50 text-red-800 border-red-200",
  d30: "bg-red-50 text-red-800 border-red-200",
  d60: "bg-amber-50 text-amber-900 border-amber-200",
  d90: "bg-amber-50 text-amber-900 border-amber-200",
  d180: "bg-slate-100 text-slate-600 border-slate-200",
  plus180: "bg-slate-100 text-slate-600 border-slate-200",
};

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

/** Named, dimmed roadmap slot — states what's missing and why, states the
 *  dependency (bank feed / ERP / cam-allocator), shows no number. This is
 *  what "there's a gap here" looks like when it's told the truth instead of
 *  either an invented figure or a silent blank. */
function LockedRoadmapCard({
  title,
  dependency,
  note,
  href,
  hrefLabel,
}: {
  title: string;
  dependency: string;
  note: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="border border-dashed border-slate-300 rounded-2xl p-4 sm:p-5 bg-slate-50/60 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm">🔒</span>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      </div>
      <p className="text-xs text-ink-500 font-medium leading-relaxed">{note}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-block text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
          Requiere {dependency}
        </span>
        {href && (
          <Link href={href} className="text-[11px] font-bold text-[var(--console-accent)] hover:underline">
            {hrefLabel ?? "Ver detalle →"}
          </Link>
        )}
      </div>
    </div>
  );
}

/** Neutral calendar row — no overdue/alarm styling here. Which leases are
 *  verified-missed, unverifiable, or on-schedule lives entirely in the
 *  Auditoría de Escalación section below; this is just "which month." */
function LeaseRow({ lease }: { lease: EscalationLeaseRow }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs">
      <div className="min-w-0">
        <p className="font-bold text-ink truncate">{lease.tradeName ?? lease.tenantEntity}</p>
        <p className="text-ink-500 font-medium">
          {lease.unitCode}
          {lease.escalationPct !== null &&
            ` · ${lease.escalationPct}% (${lease.escalationMethod ? ESCALATION_METHOD_LABEL[lease.escalationMethod] : "sin método registrado"})`}
        </p>
      </div>
      <Link href={`/consola/locales/${lease.localeId}`} className="font-bold text-[var(--console-accent)] hover:underline shrink-0">
        Ver →
      </Link>
    </div>
  );
}

function AuditRow({ row, showMoney }: { row: EscalationAuditRow; showMoney: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs">
      <div className="min-w-0">
        <p className="font-bold text-ink truncate">{row.tradeName ?? row.tenantEntity}</p>
        <p className="text-ink-500 font-medium">
          {row.unitCode} · {row.escalationPct !== null ? `${row.escalationPct}% · ` : ""}vencida desde {formatSpanishDate(row.dueDate)}
          {" "}({row.monthsElapsed} {row.monthsElapsed === 1 ? "mes" : "meses"})
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {showMoney && row.totalOwed !== null ? (
          <span className="font-bold text-red-700">{formatMxn(row.totalOwed)} acumulado</span>
        ) : row.escalationPct === null ? (
          <span className="text-[10px] font-bold text-ink-400">sin % registrado</span>
        ) : null}
        <Link href={`/consola/locales/${row.localeId}`} className="font-bold text-[var(--console-accent)] hover:underline">
          Ver →
        </Link>
      </div>
    </div>
  );
}

export function MoneyOverTimeView({ data }: { data: MoneyOverTimeData }) {
  const activeMonths = data.escalationByMonth.filter((b) => b.leases.length > 0);
  const activeExpirationMonths = data.expirationLadder24mo.filter((b) => b.leases.length > 0);
  const maxProjection = Math.max(1, ...data.rentProjection24mo.map((p) => p.contractedRentTotal));
  const withScheduleCount = data.activeLeaseCount - data.leasesWithoutSchedule.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">Renta Programada y Escalaciones</h1>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
            Todo en esta página sale de los términos de contrato ya registrados — renta, m², fecha de vencimiento,
            escalación. Nada aquí es cobranza real: eso requiere una conexión bancaria o de ERP que este sistema
            todavía no tiene, y se muestra abajo como espacio reservado, no como cifra inventada.
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cobertura de Escalación</p>
            <p className="text-base font-extrabold text-slate-900">
              {withScheduleCount}/{data.activeLeaseCount}
            </p>
          </div>
          <div className="bg-slate-50 border border-hairline rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vencidas Verificadas</p>
            <p className={`text-base font-extrabold ${data.missedEscalation.verified.rows.length > 0 ? "text-red-700" : "text-slate-900"}`}>
              {data.missedEscalation.verified.rows.length}
            </p>
          </div>
        </div>
      </div>

      {/* 24-month forward projection + locked "Collected" slot */}
      <GroupCard
        title="Renta Contratada — Próximos 24 Meses"
        subtitle="Proyección desde los términos de contrato: sube en el mes de escalación de cada local, cae cuando un contrato vence sin renovación registrada. Ningún mes asume una renovación que no existe."
      >
        <div className="space-y-1">
          {data.rentProjection24mo.map((p) => (
            <div key={p.monthsAhead} className="flex items-center gap-2.5 text-[11px]">
              <span className="w-14 shrink-0 text-ink-500 font-semibold">{p.label}</span>
              <div className="flex-1 bg-slate-100 rounded h-4 overflow-hidden">
                <div
                  className="h-full bg-[var(--console-accent)] rounded"
                  style={{ width: `${Math.max(2, (p.contractedRentTotal / maxProjection) * 100)}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right font-bold text-ink tabular-nums">{formatMxn(p.contractedRentTotal)}</span>
            </div>
          ))}
        </div>
        <div className="border border-dashed border-slate-300 rounded-xl p-3 flex items-center justify-between gap-3 bg-slate-50/60">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cobrado (real)</p>
            <p className="text-[11px] text-ink-500 font-medium mt-0.5">Segunda línea bajo la contratada, mes a mes — en cuanto haya una fuente de pagos que la alimente.</p>
          </div>
          <span className="shrink-0 text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-full">
            🔒 Requiere conexión bancaria
          </span>
        </div>
      </GroupCard>

      {/* Escalation audit — coverage first, then verified/unverifiable/on-schedule */}
      <GroupCard
        title="Auditoría de Escalación"
        subtitle={`${withScheduleCount} de ${data.activeLeaseCount} contratos activos revisados${
          data.confirmedNoneCount > 0
            ? ` (${data.confirmedNoneCount} confirmado${data.confirmedNoneCount === 1 ? "" : "s"} sin cláusula de escalación)`
            : ""
        }. La cifra más honesta de esta página: sin revisar el contrato, no hay nada que auditar.`}
      >
        {data.leasesWithoutSchedule.length > 0 && (
          <Link
            href="/consola/escalaciones"
            className="inline-block text-xs font-bold text-[var(--console-accent)] hover:underline"
          >
            Revisar {data.leasesWithoutSchedule.length} contrato{data.leasesWithoutSchedule.length === 1 ? "" : "s"} sin escalación confirmada →
          </Link>
        )}
        {data.missedEscalation.verified.rows.length > 0 && (
          <div className="space-y-2">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">Vencidas Verificadas — Total Acumulado</p>
              <p className="text-lg font-extrabold text-red-800">{formatMxn(data.missedEscalation.verified.totalOwedAllTime)}</p>
              <p className="text-[11px] text-red-700 font-medium mt-0.5">{formatMxn(data.missedEscalation.verified.monthlyTotal)}/mes en curso</p>
            </div>
            <div className="divide-y divide-hairline border-t border-hairline">
              {data.missedEscalation.verified.rows.map((r) => (
                <AuditRow key={`${r.localeId}-${r.dueDate}`} row={r} showMoney />
              ))}
            </div>
          </div>
        )}

        {data.missedEscalation.unverifiable.rows.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Sin verificar ({data.missedEscalation.unverifiable.rows.length})
            </p>
            <p className="text-[11px] text-ink-500 font-medium">
              Sin registro de cambio de renta antes del 3 sep 2026 — el ledger no existía todavía. No es una alarma,
              es una tarea: confirmar manualmente.
            </p>
            <div className="divide-y divide-hairline border-t border-hairline opacity-60">
              {data.missedEscalation.unverifiable.rows.map((r) => (
                <AuditRow key={`${r.localeId}-${r.dueDate}`} row={r} showMoney={false} />
              ))}
            </div>
          </div>
        )}

        {data.missedEscalation.verified.rows.length === 0 && data.missedEscalation.unverifiable.rows.length === 0 && (
          <p className="text-xs text-ink-500 font-medium">Ningún contrato con calendario de escalación está vencido hoy.</p>
        )}

        <p className="text-[11px] text-ink-500 font-medium">
          {data.missedEscalation.onScheduleCount} con aumento registrado en o después de su fecha de vencimiento
          (o aún no vencido).
        </p>

        <div className="border-t border-hairline pt-2 space-y-1">
          <p className="text-[10px] text-ink-400 font-medium leading-relaxed">
            El audit es una verificación de presencia, no de porcentaje: cualquier aumento la borra, incluso uno no
            relacionado a la escalación o menor al contratado. &ldquo;Aumento registrado&rdquo; significa que la
            renta subió, no que subió correctamente.
          </p>
          <p className="text-[10px] text-ink-400 font-medium leading-relaxed">
            Solo evalúa la fecha de vencimiento más reciente. Un contrato que faltó ciclos anteriores pero tuvo un
            aumento reciente se lee como al corriente.
          </p>
        </div>
      </GroupCard>

      {/* Expiration ladder — rollover risk, real year+month */}
      <GroupCard
        title="Vencimientos — Próximos 24 Meses"
        subtitle="Cada contrato en el mes calendario real en que vence — riesgo de rotación, alimenta el pipeline de renovación de Mariana IA."
      >
        {activeExpirationMonths.length === 0 ? (
          <p className="text-xs text-ink-500 font-medium">Ningún contrato vence en los próximos 24 meses.</p>
        ) : (
          <div className="space-y-4">
            {activeExpirationMonths.map((bucket) => (
              <div key={bucket.monthsAhead}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-bold text-ink-700">{bucket.label}</p>
                  <p className="text-[11px] font-semibold text-ink-500">
                    {bucket.leases.length} contrato{bucket.leases.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="divide-y divide-hairline border-t border-hairline">
                  {bucket.leases.map((l) => (
                    <div key={l.localeId} className="flex items-center justify-between gap-3 py-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-ink truncate">{l.tradeName ?? l.tenantEntity}</p>
                        <p className="text-ink-500 font-medium">{l.unitCode} · vence {formatSpanishDate(l.endDate)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TIER_BADGE_CLS[l.tier]}`}>
                          {TIER_LABELS[l.tier]}
                        </span>
                        <span className="font-bold text-ink">{formatMxn(l.rentMonthly)}</span>
                        <Link href={`/consola/locales/${l.localeId}`} className="font-bold text-[var(--console-accent)] hover:underline">
                          Ver →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </GroupCard>

      {/* Rent/m² benchmark — portfolio-internal, no external comps */}
      <GroupCard
        title="Renta por m² — Comparativo del Portafolio"
        subtitle={`Mediana del portafolio: ${formatMxn(data.rentBenchmark.medianRentPerSqm)}/m². Sin datos de mercado externos — comparación únicamente contra los demás locales de La Gran Vía.`}
      >
        <div className="divide-y divide-hairline border-t border-hairline">
          {data.rentBenchmark.rows.map((r) => (
            <div key={r.localeId} className="flex items-center justify-between gap-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="font-bold text-ink truncate">{r.tradeName ?? r.tenantEntity}</p>
                <p className="text-ink-500 font-medium">
                  {r.unitCode} · {r.sqm} m² · {formatMxn(r.rentPerSqm)}/m²
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`font-bold ${
                    r.deltaFromMedianPct <= -20 ? "text-red-700" : r.deltaFromMedianPct >= 20 ? "text-emerald-700" : "text-ink-500"
                  }`}
                >
                  {r.deltaFromMedianPct > 0 ? "+" : ""}
                  {r.deltaFromMedianPct.toFixed(0)}% vs mediana
                </span>
                <Link href={`/consola/locales/${r.localeId}`} className="font-bold text-[var(--console-accent)] hover:underline">
                  Ver →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </GroupCard>

      {/* Escalation calendar */}
      <GroupCard
        title="Calendario de Escalaciones"
        subtitle="Cada contrato agrupado por el mes calendario en que le corresponde su ajuste anual — independiente del año. Vencidas/verificadas viven en Auditoría de Escalación arriba."
      >
        {activeMonths.length === 0 ? (
          <p className="text-xs text-ink-500 font-medium">Ningún contrato tiene mes de escalación confirmado todavía.</p>
        ) : (
          <div className="space-y-4">
            {activeMonths.map((bucket) => (
              <div key={bucket.month}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-bold text-ink-700">{bucket.monthName}</p>
                  <p className="text-[11px] font-semibold text-ink-500">
                    {bucket.leases.length} contrato{bucket.leases.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="divide-y divide-hairline border-t border-hairline">
                  {bucket.leases.map((l) => (
                    <LeaseRow key={l.localeId} lease={l} />
                  ))}
                </div>
              </div>
            ))}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LockedRoadmapCard
          title="Antigüedad de Cartera"
          dependency="conexión bancaria/ERP"
          note="Cuánto lleva vencido cada saldo pendiente — necesita saber qué se cobró y cuándo, dato que no existe en este sistema todavía."
        />
        <LockedRoadmapCard
          title="Tasa de Recuperación CAM"
          dependency="activar cam-allocator (Renata)"
          note={`${data.camSummary.leasesWithTermsCount} de ${data.camSummary.totalActiveLeases} contratos con términos CAM en archivo · ${formatMxn(data.camSummary.totalAttributedExpense)} en gasto CAM atribuido sin asignar — activa cam-allocator para facturar contra ellos.`}
          href="/consola/cam"
          hrefLabel="Ver gasto y términos →"
        />
      </div>
    </div>
  );
}
