"use client";

import Link from "next/link";
import type { ExceptionStatesData } from "@/lib/data/exception-states.server";

function GroupCard({
  title,
  subtitle,
  count,
  emptyLabel,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-hairline rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="text-[11px] text-ink-500 font-medium mt-0.5 max-w-xl">{subtitle}</p>
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
            count > 0 ? "bg-amber-50 text-amber-900 border-amber-200" : "bg-slate-100 text-ink-500 border-hairline"
          }`}
        >
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-xs text-ink-500 font-medium bg-slate-50 border border-hairline rounded-xl px-3 py-2.5">
          {emptyLabel}
        </p>
      ) : (
        <div className="divide-y divide-hairline">{children}</div>
      )}
    </div>
  );
}

export function ExceptionStatesView({ data }: { data: ExceptionStatesData }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-hairline rounded-2xl p-5">
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">Excepciones</h1>
        <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
          Lo que pasa cuando algo no sigue el camino esperado: un agente que no está seguro, un contrato sin
          digitalizar, o un inquilino que reporta que un problema sigue sin resolverse. No incluye disputas de
          cobro (quién paga, o cuánto) — este sistema no tiene todavía un mecanismo real para eso.
        </p>
      </div>

      <GroupCard
        title="Requiere Juicio Humano — Renovaciones"
        subtitle="Mariana IA redactó el borrador pero su propia auditoría (skeptic pass) encontró algo que no cuadra."
        count={data.uncertainRenewals.length}
        emptyLabel="Ninguna renovación en borrador tiene inconsistencias marcadas por la auditoría de Mariana IA en este momento."
      >
        {data.uncertainRenewals.map((r) => (
          <div key={r.renewalId} className="py-2.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">{r.tenantEntity} · {r.unitCode}</p>
              <ul className="text-xs text-ink-600 list-disc list-inside mt-0.5 space-y-0.5">
                {r.concerns.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
            <Link href={`/consola/renovaciones/${r.renewalId}`} className="text-xs font-bold text-[var(--console-accent)] hover:underline shrink-0">
              Ver →
            </Link>
          </div>
        ))}
      </GroupCard>

      <GroupCard
        title="Requiere Juicio Humano — Mantenimiento"
        subtitle="Diego IA diagnosticó y atribuyó costo, pero su propia auditoría marcó algo ambiguo antes de llegar a tu cola de aprobación."
        count={data.uncertainTickets.length}
        emptyLabel="Ningún ticket activo tiene inconsistencias marcadas por la auditoría de Diego IA en este momento."
      >
        {data.uncertainTickets.map((t) => (
          <div key={t.ticketNumber} className="py-2.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">{t.tenantEntity ?? t.unitNumber} · {t.unitNumber} · {t.ticketNumber}</p>
              <ul className="text-xs text-ink-600 list-disc list-inside mt-0.5 space-y-0.5">
                {t.concerns.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
            {t.localeId && (
              <Link href={`/consola/locales/${t.localeId}`} className="text-xs font-bold text-[var(--console-accent)] hover:underline shrink-0">
                Ver →
              </Link>
            )}
          </div>
        ))}
      </GroupCard>

      <GroupCard
        title="Contratos Sin Digitalizar"
        subtitle="Locales con arrendamiento activo pero sin un escaneo del contrato en el sistema — Mariana IA no puede leer cláusulas que no existen digitalmente."
        count={data.missingDocumentLeases.length}
        emptyLabel="Los 23 contratos activos del portafolio tienen su escaneo en el sistema. Un contrato nuevo o registrado a mano sin subir su PDF aparecería aquí."
      >
        {data.missingDocumentLeases.map((l) => (
          <div key={l.localeId} className="py-2.5 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-ink">{l.tradeName ?? l.tenantEntity} · {l.unitCode}</p>
            <Link href={`/consola/locales/${l.localeId}`} className="text-xs font-bold text-[var(--console-accent)] hover:underline shrink-0">
              Ver expediente →
            </Link>
          </div>
        ))}
      </GroupCard>

      <GroupCard
        title="Inquilino Reportó que el Problema Sigue"
        subtitle="Un ticket que Diego IA había marcado resuelto, pero el inquilino reportó desde su portal que el problema persiste — la reapertura más cercana a una disputa real que existe en el sistema hoy."
        count={data.reopenedTickets.length}
        emptyLabel="Ningún ticket ha sido reabierto por un inquilino en este momento."
      >
        {data.reopenedTickets.map((t) => (
          <div key={t.ticketNumber} className="py-2.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">{t.tenantEntity ?? t.unitNumber} · {t.unitNumber} · {t.ticketNumber}</p>
              <p className="text-xs text-ink-600 leading-snug line-clamp-2">{t.rawReport}</p>
            </div>
            {t.localeId && (
              <Link href={`/consola/locales/${t.localeId}`} className="text-xs font-bold text-[var(--console-accent)] hover:underline shrink-0">
                Ver →
              </Link>
            )}
          </div>
        ))}
      </GroupCard>
    </div>
  );
}
