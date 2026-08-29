"use client";

export type AttentionCounts = {
  diegoDecisiones: number;
  marianaDecisiones: number;
  marianaExpedientes: number;
};

/**
 * One compact global signal in the console's single header bar — not a
 * fifth destination, not a sidebar badge (both tried and rejected: a
 * separate inbox page detached the work from where it's done; sidebar
 * badges read heavier than the agent names themselves). The numeric badge
 * on the bell icon counts only real decisions (Diego's dispatch approvals +
 * Mariana's applications/renewals) — deliberately excluding
 * marianaExpedientes, so a 70-document validation backlog can't inflate the
 * headline number past the handful of things that actually need a human
 * call. The popover still lists the expedientes count, visibly muted
 * (smaller, gray, separated by a rule) rather than hidden — the backlog is
 * real, it just isn't equally urgent.
 */
export function HeaderAttentionBell({
  counts,
  onNavigate,
}: {
  counts: AttentionCounts;
  onNavigate: (tab: "maint" | "legal", subTab: string) => void;
}) {
  const realDecisions = counts.diegoDecisiones + counts.marianaDecisiones;
  if (realDecisions === 0 && counts.marianaExpedientes === 0) return null;

  return (
    <details className="relative shrink-0">
      <summary
        className="relative list-none flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 [&::-webkit-details-marker]:hidden"
        title="Atención"
        aria-label="Atención"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {realDecisions > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {realDecisions}
          </span>
        )}
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-md">
        <p className="px-2 py-1 text-[11px] font-bold text-slate-400 tracking-wider">Atención</p>

        {counts.diegoDecisiones > 0 && (
          <button
            type="button"
            onClick={() => onNavigate("maint", "triage")}
            className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <span>Diego — decisiones</span>
            <span className="font-bold text-slate-900">{counts.diegoDecisiones}</span>
          </button>
        )}

        {counts.marianaDecisiones > 0 && (
          <button
            type="button"
            onClick={() => onNavigate("legal", "pendientes")}
            className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <span>Mariana — decisiones</span>
            <span className="font-bold text-slate-900">{counts.marianaDecisiones}</span>
          </button>
        )}

        {counts.marianaExpedientes > 0 && (
          <button
            type="button"
            onClick={() => onNavigate("legal", "pendientes")}
            className="mt-1 w-full flex items-center justify-between gap-2 rounded-lg border-t border-slate-100 px-2 pt-2 pb-1 text-left text-[11px] font-medium text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <span>Mariana — expedientes por validar</span>
            <span className="font-bold text-slate-600">{counts.marianaExpedientes}</span>
          </button>
        )}
      </div>
    </details>
  );
}
