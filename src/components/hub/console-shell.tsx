"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { Inter } from "next/font/google";
import { CONSOLE_ROOT_ID } from "@/components/hub/console-root";
import { LandlordDashboard } from "@/components/hub/landlord-dashboard";
import { TenantPortal } from "@/components/hub/tenant-portal";
import type { ConsoleData } from "@/lib/console-data";
import type { DiegoKPIs, DiegoTicket } from "@/lib/data/diego-tickets.server";
import type { LocaleOption, PortalLocale } from "@/lib/data/tenant-portal.server";
import type { Contractor } from "@/lib/data/contractors.server";
import type { AutonomyState } from "@/lib/platform/settings.server";
import type { AuditEntry } from "@/lib/platform/audit-log.server";
import type { CorporateUser } from "@/lib/platform/users.server";
import type { LeaseDocumentRow, Portfolio } from "@/lib/data/portfolio.server";
import type { PendingLeaseApplication } from "@/lib/data/approval-queue.server";
import type { RenewalOutreachStatus } from "@/lib/data/renewal-outreach-types";
import { HeaderAttentionBell, type AttentionCounts } from "@/components/hub/header-attention-bell";
import { signOut } from "@/app/consola/actions";

import type { LeadRow } from "@/lib/data/lead-types";

type ConsoleView = "propietario" | "inquilino";
type Currency = "MXN" | "USD";

/**
 * Console-scoped typeface. Deliberately NOT the marketing site's Cormorant/Work Sans
 * pairing (src/app/layout.tsx, src/app/globals.css @theme) — the console is a distinct
 * modern SaaS admin product per its own design direction, so it gets its own font
 * loaded and applied only inside this wrapper, never touching --font-display/--font-sans.
 */
const consoleFont = Inter({
  subsets: ["latin"],
  variable: "--font-console",
  display: "swap",
});

/**
 * The landlord console, reached only after middleware.ts verifies the signed
 * session cookie set by the login form at /consola/acceso.
 */
export function ConsoleShell({
  data,
  diegoTickets,
  diegoKpis,
  localeOptions,
  contractors,
  tenantPortalLocale,
  tenantPortalTickets,
  autonomyState,
  auditLog,
  corporateUsers,
  portfolio,
  activeLeaseDocuments,
  leaseApplications,
  renewalOutreachStatus,
  leads,
}: {
  data: ConsoleData;
  diegoTickets: DiegoTicket[];
  diegoKpis: DiegoKPIs;
  localeOptions: LocaleOption[];
  contractors: Contractor[];
  tenantPortalLocale: PortalLocale | null;
  tenantPortalTickets: DiegoTicket[];
  autonomyState: AutonomyState;
  auditLog: AuditEntry[];
  corporateUsers: CorporateUser[];
  portfolio: Portfolio;
  activeLeaseDocuments: LeaseDocumentRow[];
  leaseApplications: PendingLeaseApplication[];
  renewalOutreachStatus: Record<string, RenewalOutreachStatus>;
  leads: LeadRow[];
}) {
  const [view, setView] = useState<ConsoleView>("propietario");
  const [fontSizeLevel, setFontSizeLevel] = useState<"normal" | "large" | "xlarge">("normal");
  const isOwner = view === "propietario";

  // Console chrome state. These four used to live inside LandlordDashboard and
  // were driven by a *second* header bar rendered there; that bar was merged
  // into the single one below, so the state has to sit at the level that now
  // owns the controls. LandlordDashboard still consumes all four — currency
  // feeds its formatVal(), copilotOpen its slide-over, sidebarOpen its mobile
  // nav drawer, and triggerToast its ~40 action confirmations — so they are
  // passed straight back down as props rather than duplicated.
  const [currency, setCurrency] = useState<Currency>("MXN");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // HeaderAttentionBell's counts and click-through target. LandlordDashboard
  // owns the live data these are derived from (tickets, lease applications,
  // renewals, documents) and pushes counts up via onPendingCountsChange;
  // navigateRequest travels back down so a bell click can flip
  // LandlordDashboard's own tab/sub-tab state, the same way currency/
  // copilotOpen/sidebarOpen already flow between these two components.
  const [pendingCounts, setPendingCounts] = useState<AttentionCounts>({
    diegoDecisiones: 0,
    marianaDecisiones: 0,
    marianaExpedientes: 0,
  });
  const [navigateRequest, setNavigateRequest] = useState<{ tab: "maint" | "legal"; subTab: string } | null>(null);
  const clearNavigateRequest = useCallback(() => setNavigateRequest(null), []);
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div
      // Portal host for console overlays (see diego-ticket-drawer.tsx). Slide-overs
      // must mount HERE and not on <body>: the three --console-accent tokens below,
      // the console font var, and the a11y zoom are all scoped to this element, and
      // an overlay rendered outside it silently loses all three.
      id={CONSOLE_ROOT_ID}
      style={{
        zoom: fontSizeLevel === "large" ? 1.12 : fontSizeLevel === "xlarge" ? 1.25 : 1,
        // Console-scoped design tokens — the single place the console's accent
        // is defined. Every hub/*.tsx file below references these three
        // via Tailwind arbitrary values (e.g. bg-[var(--console-accent)])
        // instead of hardcoding "indigo-600" per class, so swapping the
        // console's accent later is a one-line change here, not a grep across
        // the whole module. Deliberately NOT touched: globals.css's @theme
        // block (--color-terra, --color-sand-*, --color-signal, --color-alert)
        // which the marketing site still depends on.
        ["--console-accent" as string]: "#4f46e5", // indigo-600
        ["--console-accent-dark" as string]: "#4338ca", // indigo-700
        ["--console-accent-soft" as string]: "#eef2ff", // indigo-50, for secondary-button hover fills
      } as CSSProperties}
      className={`${consoleFont.variable} space-y-4 min-h-screen bg-slate-100 p-3 sm:p-6 font-[family-name:var(--font-console)] transition-all ${
        fontSizeLevel === "large" ? "scale-font-large" : fontSizeLevel === "xlarge" ? "scale-font-xlarge" : "scale-font-normal"
      }`}
    >
      {/* Toast Notification — shell-level so both the consolidated bar's own
          controls (currency) and LandlordDashboard's actions feed one queue. */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-semibold animate-slideUp">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* THE console header. Single bar by design: LandlordDashboard used to
          render a second one of its own directly underneath this, repeating the
          same "you are in the console" label. Owner-scoped controls (currency,
          period, Copiloto) live here but render only for the propietario view —
          TenantPortal has no use for any of them. */}
      <div className="sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:px-5 text-xs shadow-xs">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {/* Opens LandlordDashboard's off-canvas nav; that drawer only exists
              in the owner view, and only below lg where it isn't already open. */}
          {isOwner && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menú"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" aria-hidden="true" />
          <span className="sr-only">Sesión autenticada.</span>
          {/* Title over role rather than side by side: keeps this group's
              max-content narrow enough that the control cluster opposite it
              still resolves to a single row on a normal desktop width. */}
          <span className="min-w-0">
            <span className="block font-bold text-slate-900 uppercase tracking-wide">La Gran Vía · Consola de Control</span>
            <span className="block text-slate-600 font-semibold">
              {isOwner
                ? "Vista Propietario (Plaza Completa)"
                : `Vista Arrendatario (${tenantPortalLocale?.unitNumber ?? "?"})`}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {isOwner && <HeaderAttentionBell counts={pendingCounts} onNavigate={(tab, subTab) => setNavigateRequest({ tab, subTab })} />}

          {isOwner && (
            <>
              {/* CURRENCY TRANSLATION TOGGLE (MXN DEFAULT / USD AT 17.50 RATE) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setCurrency("MXN");
                    triggerToast("Moneda establecida en Pesos (MXN).");
                  }}
                  aria-pressed={currency === "MXN"}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    currency === "MXN" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  MXN ($)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrency("USD");
                    triggerToast("Moneda traducida a Dólares (USD @ $17.50 MXN/USD).");
                  }}
                  aria-pressed={currency === "USD"}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    currency === "USD" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  USD ($17.50)
                </button>
              </div>

              <select
                aria-label="Periodo de reporte"
                className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ago-2026">Agosto 2026 (Actual)</option>
                <option value="jul-2026">Julio 2026</option>
                <option value="jun-2026">Junio 2026</option>
                <option value="q3-2026">Q3 2026</option>
                <option value="y-2026">Año 2026 (Full)</option>
              </select>

              <button
                type="button"
                onClick={() => setCopilotOpen(!copilotOpen)}
                aria-pressed={copilotOpen}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs text-white ${
                  copilotOpen ? "bg-slate-700" : "bg-slate-900 hover:bg-slate-700"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>Copiloto IA</span>
              </button>
            </>
          )}

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200" role="group" aria-label="Cambiar vista">
            <button
              type="button"
              onClick={() => setView("propietario")}
              aria-pressed={isOwner}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                isOwner ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Propietario
            </button>
            <button
              type="button"
              onClick={() => {
                setView("inquilino");
                // The drawer this opens belongs to LandlordDashboard, which is
                // about to unmount — leaving the flag true would spring the nav
                // open again on the way back to the owner view.
                setSidebarOpen(false);
                setCopilotOpen(false);
              }}
              aria-pressed={!isOwner}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                !isOwner ? "bg-slate-800 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Vista Inquilino
            </button>
          </div>

          {/* ACCESSIBILITY FONT SIZE CONTROLLER — one gear at rest rather than
              three permanently-visible A / A+ / A++ buttons. Built on <details>
              (same disclosure pattern the dashboard already uses for its "ⓘ"
              popovers) so it needs no open-state, no outside-click effect, and
              is keyboard-operable for free. */}
          <details className="relative shrink-0">
            <summary
              className="list-none flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 [&::-webkit-details-marker]:hidden"
              title="Ajustes de visualización"
              aria-label="Ajustes de visualización"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.041.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a7.688 7.688 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.127.332-.184.582-.496.644-.87l.214-1.28z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-md">
              <p className="mb-2 text-xs font-bold text-slate-900">Tamaño de texto</p>
              <div
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold"
                role="group"
                aria-label="Tamaño de texto"
              >
                <button
                  type="button"
                  onClick={() => setFontSizeLevel("normal")}
                  title="Texto Normal"
                  aria-pressed={fontSizeLevel === "normal"}
                  className={`flex-1 rounded-lg px-2.5 py-1 text-xs transition-all cursor-pointer ${
                    fontSizeLevel === "normal"
                      ? "bg-slate-900 text-white shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => setFontSizeLevel("large")}
                  title="Texto Grande (+12%)"
                  aria-pressed={fontSizeLevel === "large"}
                  className={`flex-1 rounded-lg px-2.5 py-1 text-sm transition-all cursor-pointer ${
                    fontSizeLevel === "large"
                      ? "bg-slate-900 text-white shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => setFontSizeLevel("xlarge")}
                  title="Texto Extra Grande (+25%)"
                  aria-pressed={fontSizeLevel === "xlarge"}
                  className={`flex-1 rounded-lg px-2.5 py-1 text-base transition-all cursor-pointer ${
                    fontSizeLevel === "xlarge"
                      ? "bg-slate-900 text-white shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  A++
                </button>
              </div>
            </div>
          </details>

          <form action={signOut}>
            <button
              type="submit"
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      {/* Main View Render */}
      {isOwner ? (
        <LandlordDashboard
          data={data}
          diegoTickets={diegoTickets}
          diegoKpis={diegoKpis}
          localeOptions={localeOptions}
          contractors={contractors}
          autonomyState={autonomyState}
          initialAuditLog={auditLog}
          corporateUsers={corporateUsers}
          portfolio={portfolio}
          activeLeaseDocuments={activeLeaseDocuments}
          leaseApplications={leaseApplications}
          renewalOutreachStatus={renewalOutreachStatus}
          leads={leads}
          onPendingCountsChange={setPendingCounts}
          navigateRequest={navigateRequest}
          onNavigateRequestHandled={clearNavigateRequest}
          currency={currency}
          copilotOpen={copilotOpen}
          setCopilotOpen={setCopilotOpen}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          triggerToast={triggerToast}
        />
      ) : (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <TenantPortal locale={tenantPortalLocale} tickets={tenantPortalTickets} />
        </div>
      )}

      <p className="text-center text-xs font-semibold text-slate-500">
        La Gran Vía Mexicali · Consola de Asset Management · Sesión caduca en 8 horas
      </p>
    </div>
  );
}
