"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LEASE_RENT_HISTORY_SINCE,
  TIER_LABELS,
  computeDaysRemaining,
  contractStatusLabel,
  tierForDays,
  type EscalationCycle,
  type LeaseDetail,
} from "@/lib/data/contract-status";
import { STATUS_LABEL as TICKET_STATUS_LABEL } from "@/components/hub/diego-ticket-ui";
import { fetchCommandPaletteIndexAction, type CommandPaletteIndex } from "@/lib/data/command-palette-actions";

const RENEWAL_STATUS_LABEL: Record<string, string> = {
  needs_landlord_review: "Pendiente de revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
};

/** Static — the "actions/nav" resolver (#5), including the two rail items
 *  that have no real screen (Cobranza, CAM). Those two are named and
 *  demoted, never a dead link — same honesty discipline as the locked
 *  roadmap cards on /consola/finanzas, which is exactly where they point:
 *  that's the page carrying the actual "requiere conexión bancaria" /
 *  "requiere activar cam-allocator" slots for each. */
type ActionEntry = {
  label: string;
  description: string;
  keywords: string[];
  href?: string;
  navTab?: "legal" | "maint";
  locked?: boolean;
};

const ACTIONS: ActionEntry[] = [
  { label: "Rent Roll", description: "Panel principal de la consola", keywords: ["dashboard", "inicio", "rentroll"], href: "/consola" },
  {
    label: "Renta Programada y Escalaciones",
    description: "Proyección 24 meses, auditoría de escalación, vencimientos, renta/m²",
    keywords: ["finanzas", "renta", "escalacion", "dinero", "money", "proyeccion"],
    href: "/consola/finanzas",
  },
  {
    label: "Backfill de Escalaciones",
    description: "Confirmar el calendario de escalación contrato por contrato",
    keywords: ["escalaciones", "backfill", "calendario"],
    href: "/consola/escalaciones",
  },
  {
    label: "Actividad de los Agentes",
    description: "Lo que Diego y Mariana han hecho, con números reales",
    keywords: ["actividad", "agentes", "digest", "diego", "mariana"],
    href: "/consola/actividad",
  },
  {
    label: "Traspasos Atascados",
    description: "Cada handoff entre agente y humano que no aterrizó, con una acción para destrabarlo",
    keywords: ["atascos", "atascados", "stalled", "pendientes", "traspasos"],
    href: "/consola/atascos",
  },
  {
    label: "Documentos",
    description: "Expedientes legales digitalizados — Gate 1/2",
    keywords: ["documentos", "expedientes", "legal", "contratos"],
    navTab: "legal",
  },
  {
    label: "Inquilinos",
    description: "Rent roll y gestión de arrendatarios",
    keywords: ["inquilinos", "tenants", "arrendatarios"],
    href: "/consola",
  },
  {
    label: "Cobranza (Collections)",
    description: "Sin cobranza real todavía — requiere conexión bancaria. El espacio reservado vive en Renta Programada.",
    keywords: ["cobranza", "collections", "cobrado", "pagos"],
    href: "/consola/finanzas",
    locked: true,
  },
  {
    label: "CAM — Gastos Atribuidos y Términos",
    description: "Gasto CAM real de Diego IA, sumado, y términos de contrato — el prorrateo en sí sigue bloqueado (requiere cam-allocator)",
    keywords: ["cam", "gastos comunes", "prorrateo"],
    href: "/consola/cam",
  },
];

type UnitResult = { kind: "unit"; key: string; title: string; subtitle: string; statusLabel: string; alert: boolean; localeId: string };

type PaletteResult =
  | UnitResult
  | { kind: "ticket"; key: string; title: string; subtitle: string; statusLabel: string; id: string }
  | { kind: "renewal"; key: string; title: string; subtitle: string; statusLabel: string; id: string }
  | { kind: "application"; key: string; title: string; subtitle: string; note: string; localeId: string | null; id: string | null }
  | { kind: "clause"; key: string; title: string; subtitle: string; snippet: string; localeId: string }
  | { kind: "action"; key: string; title: string; subtitle: string; entry: ActionEntry }
  | { kind: "valeria"; key: string; title: string; subtitle: string; query: string };

/** Every other result here is a lookup — type an identifier, land somewhere.
 *  A typed question that doesn't resolve to a lookup still deserves an
 *  answer, so every non-empty query gets this appended as its last result:
 *  the sole result when nothing else matched (an empty search becomes a
 *  working one), or just the option to skip the list and ask directly when
 *  something did. Selecting it hands the exact typed text to Valeria as her
 *  opening message (see command-palette.tsx's `select()` and
 *  landlord-dashboard.tsx's initialCopilotPrompt effect) — never dropped,
 *  never requiring a retype in the chat input. */
function valeriaFallback(results: PaletteResult[], q: string): PaletteResult[] {
  if (!q) return results;
  const display = q.length > 72 ? `${q.slice(0, 72)}…` : q;
  return [
    ...results,
    { kind: "valeria" as const, key: `valeria-${q}`, title: `Preguntarle a Valeria: "${display}"`, subtitle: "Copiloto Ejecutivo — abre el chat con esta pregunta", query: q },
  ];
}

function leaseHasVerifiedMiss(cycles: EscalationCycle[]): boolean {
  return cycles.some((c) => !c.applied && c.dueDate >= LEASE_RENT_HISTORY_SINCE);
}

function leaseStatus(l: LeaseDetail): { label: string; alert: boolean } {
  const label = contractStatusLabel({ isExpired: l.isExpired, renewalSoon: l.renewalSoon });
  return { label, alert: l.isExpired || leaseHasVerifiedMiss(l.escalationCycles) };
}

function unitResult(l: LeaseDetail): UnitResult {
  const { label, alert } = leaseStatus(l);
  return {
    kind: "unit",
    key: `unit-${l.id}`,
    title: l.tradeName ?? l.tenantEntity,
    subtitle: `${l.unitCode}${l.tradeName ? ` · ${l.tenantEntity}` : ""}`,
    statusLabel: alert ? `${label} · escalación vencida` : label,
    alert,
    localeId: l.id,
  };
}

/**
 * The ⌘K command palette. Global (mounted once in consola/layout.tsx) so
 * it's reachable from every /consola/* route, not just the main dashboard —
 * a search typed on /consola/finanzas shouldn't require navigating back
 * first. Every result resolves an identifier this schema already scatters
 * across seven different fields (unitCode, tenantEntity, tradeName,
 * leaseRowId vs locale id, renewalNumber, applicationNumber, ticketNumber)
 * to the same destination, per the match order below.
 */
export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [index, setIndex] = useState<CommandPaletteIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Never on the login page — no session, nothing to search.
  const disabled = pathname === "/consola/acceso";

  const openPalette = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setActiveIndex(0);
    setLoading(true);
    fetchCommandPaletteIndexAction()
      .then(setIndex)
      .finally(() => setLoading(false));
  }, [disabled]);

  const closePalette = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (disabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) return false;
          openPalette();
          return true;
        });
      } else if (e.key === "Escape" && open) {
        closePalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, open, openPalette, closePalette]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo<PaletteResult[]>(() => {
    if (!index) return [];
    const q = query.trim();
    const qLower = q.toLowerCase();

    // 3. Exact-format IDs skip fuzzy ranking entirely — a match here is the
    // whole result set.
    if (/^inc-/i.test(q)) {
      return valeriaFallback(
        index.tickets
          .filter((t) => t.ticketNumber.toLowerCase().includes(qLower))
          .map((t) => ({
            kind: "ticket" as const,
            key: `ticket-${t.id}`,
            title: t.ticketNumber,
            subtitle: `${t.unitNumber}${t.tenantEntity ? ` · ${t.tenantEntity}` : ""}`,
            statusLabel: TICKET_STATUS_LABEL[t.status],
            id: t.id,
          })),
        q,
      );
    }
    if (/^ren-/i.test(q)) {
      return valeriaFallback(
        index.leases
          .flatMap((l) => l.renewals.map((r) => ({ lease: l, renewal: r })))
          .filter(({ renewal }) => renewal.renewalNumber.toLowerCase().includes(qLower))
          .map(({ lease, renewal }) => ({
            kind: "renewal" as const,
            key: `renewal-${renewal.id}`,
            title: renewal.renewalNumber,
            subtitle: `${lease.unitCode} · ${lease.tenantEntity}`,
            statusLabel: RENEWAL_STATUS_LABEL[renewal.status] ?? renewal.status,
            id: renewal.id,
          })),
        q,
      );
    }
    if (/^app-/i.test(q)) {
      const pending = index.pendingApplications
        .filter((a) => a.applicationNumber.toLowerCase().includes(qLower))
        .map((a) => ({
          kind: "application" as const,
          key: `app-${a.id}`,
          title: a.applicationNumber,
          subtitle: a.applicantEntity,
          note: `Pendiente${a.unitNumber ? ` · ${a.unitNumber}` : ""}`,
          localeId: null,
          id: a.id,
        }));
      const approvedNotPromoted = index.approvedApplications
        .filter((a) => a.applicationNumber.toLowerCase().includes(qLower))
        .map((a) => ({
          kind: "application" as const,
          key: `app-${a.id}`,
          title: a.applicationNumber,
          subtitle: a.applicantEntity,
          note: `Aprobada · ${a.targetUnitCode} — aún no se agrega como inquilino`,
          localeId: null,
          id: a.id,
        }));
      const promotedToLease = index.leases
        .filter((l) => l.sourceApplicationNumber?.toLowerCase().includes(qLower))
        .map((l) => ({
          kind: "application" as const,
          key: `app-promoted-${l.id}`,
          title: l.sourceApplicationNumber!,
          subtitle: l.tradeName ?? l.tenantEntity,
          note: `Aprobada — ahora es el contrato de ${l.unitCode}`,
          localeId: l.id,
          id: null,
        }));
      return valeriaFallback([...pending, ...approvedNotPromoted, ...promotedToLease], q);
    }

    // Filter verbs — same predicates already fixed elsewhere this session,
    // reused verbatim so the palette can never drift from what
    // /consola/finanzas itself shows for the identical query.
    const expiringMatch = qLower.match(/^expiring\s+(\d+)/);
    if (expiringMatch) {
      const days = Number(expiringMatch[1]);
      const targetTier = tierForDays(days);
      return valeriaFallback(
        index.leases
          .filter((l) => tierForDays(computeDaysRemaining(l.endDate)) === targetTier)
          .map((l) => ({ ...unitResult(l), subtitle: `${l.unitCode} · vence ${l.endDate} · ${TIER_LABELS[targetTier]}` })),
        q,
      );
    }
    if ("no schedule".startsWith(qLower) && qLower.length >= 2) {
      return valeriaFallback(
        index.leases.filter((l) => l.escalationMonth === null && !l.escalationConfirmedNone).map(unitResult),
        q,
      );
    }
    if ("overdue".startsWith(qLower) && qLower.length >= 3) {
      return valeriaFallback(index.leases.filter((l) => leaseHasVerifiedMiss(l.escalationCycles)).map(unitResult), q);
    }

    // Empty query: static nav only (no history, per spec — "nice, not
    // load-bearing").
    if (q.length === 0) {
      return ACTIONS.map((entry) => ({
        kind: "action" as const,
        key: `action-${entry.label}`,
        title: entry.label,
        subtitle: entry.description,
        entry,
      }));
    }

    // 1+2+4+5: unit code, tenant/tradeName, clause text, actions — ranked
    // in that order, unit code first since it's the shortest/highest-
    // confidence input per the spec.
    const unitMatches = index.leases.filter((l) => l.unitCode.toLowerCase().includes(qLower)).map(unitResult);

    const unitMatchIds = new Set(unitMatches.map((r) => r.localeId));
    const tenantMatches = index.leases
      .filter(
        (l) =>
          !unitMatchIds.has(l.id) &&
          (l.tenantEntity.toLowerCase().includes(qLower) || l.tradeName?.toLowerCase().includes(qLower)),
      )
      .map(unitResult);

    const clauseMatches: PaletteResult[] = index.leases.flatMap((l) =>
      l.clauses
        .filter((c) => c.clauseText.toLowerCase().includes(qLower))
        .map((c) => {
          const snippetIdx = c.clauseText.toLowerCase().indexOf(qLower);
          const start = Math.max(0, snippetIdx - 40);
          const snippet = `${start > 0 ? "…" : ""}${c.clauseText.slice(start, snippetIdx + qLower.length + 60)}…`;
          return {
            kind: "clause" as const,
            key: `clause-${c.id}`,
            title: `${l.unitCode} · Cláusula ${c.clauseNumber} — ${c.clauseLabel}`,
            subtitle: l.tradeName ?? l.tenantEntity,
            snippet,
            localeId: l.id,
          };
        }),
    );

    const actionMatches: PaletteResult[] = ACTIONS.filter(
      (entry) => entry.label.toLowerCase().includes(qLower) || entry.keywords.some((k) => k.includes(qLower)),
    ).map((entry) => ({
      kind: "action" as const,
      key: `action-${entry.label}`,
      title: entry.label,
      subtitle: entry.description,
      entry,
    }));

    return valeriaFallback([...unitMatches, ...tenantMatches, ...clauseMatches, ...actionMatches], q);
  }, [index, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const select = useCallback(
    (result: PaletteResult) => {
      switch (result.kind) {
        case "unit":
        case "clause":
          router.push(`/consola/locales/${result.localeId}`);
          break;
        case "ticket":
          router.push(`/consola?ticket=${result.id}`);
          break;
        case "renewal":
          router.push(`/consola/renovaciones/${result.id}`);
          break;
        case "application":
          if (result.id) router.push(`/consola/solicitudes/${result.id}`);
          else if (result.localeId) router.push(`/consola/locales/${result.localeId}`);
          break;
        case "action":
          if (result.entry.href) router.push(result.entry.href);
          else if (result.entry.navTab) router.push(`/consola?tab=${result.entry.navTab}`);
          break;
        case "valeria":
          // Valeria's panel only lives on the main /consola page (see
          // landlord-dashboard.tsx) — same cross-route push as the other
          // action entries above when triggered from a standalone page
          // like /consola/finanzas.
          router.push(`/consola?copilotPrompt=${encodeURIComponent(result.query)}`);
          break;
      }
      setOpen(false);
    },
    [router],
  );

  if (disabled) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openPalette}
          aria-label="Buscar (⌘K)"
          className="fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6 bg-ink hover:bg-ink-700 text-white rounded-full shadow-lg px-4 py-2.5 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
        >
          <span>Buscar</span>
          <span className="text-[10px] font-mono bg-white/15 rounded px-1.5 py-0.5">⌘K</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-[10vh] px-4" onClick={closePalette}>
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-hairline overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-hairline p-3">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.min(i + 1, results.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const r = results[activeIndex];
                    if (r) select(r);
                  }
                }}
                placeholder="Local, inquilino, INC-/REN-/APP-, cláusula, expiring 60, no schedule, overdue… o cualquier pregunta para Valeria"
                className="w-full text-sm font-medium text-ink px-2 py-2 focus:outline-none placeholder:text-ink-400"
              />
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {loading && <p className="text-xs text-ink-500 font-medium p-4">Cargando…</p>}
              {!loading &&
                results.map((r, i) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => select(r)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 border-b border-hairline/60 last:border-b-0 cursor-pointer ${
                      i === activeIndex ? "bg-slate-100" : "bg-white"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{r.title}</p>
                      <p className="text-[11px] text-ink-500 font-medium truncate">
                        {r.subtitle}
                        {r.kind === "clause" && <span className="block text-ink-400 italic mt-0.5">&ldquo;{r.snippet}&rdquo;</span>}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        r.kind === "unit" && r.alert
                          ? "bg-red-50 text-red-800 border-red-200"
                          : r.kind === "valeria"
                            ? "bg-[var(--console-accent-soft)] text-[var(--console-accent)] border-[var(--console-accent)]/40"
                            : r.kind === "action" && r.entry.locked
                              ? "bg-slate-100 text-slate-500 border-slate-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {r.kind === "unit" || r.kind === "ticket" || r.kind === "renewal"
                        ? r.statusLabel
                        : r.kind === "application"
                          ? r.note
                          : r.kind === "action" && r.entry.locked
                            ? "Roadmap"
                            : r.kind === "clause"
                              ? "Cláusula"
                              : r.kind === "valeria"
                                ? "Valeria"
                                : ""}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
