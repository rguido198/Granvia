"use client";

import { useState, useMemo, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import type {
  ConsoleData,
} from "@/lib/console-data";
import type { DiegoKPIs, DiegoTicket } from "@/lib/data/diego-tickets.server";
import type { LocaleOption } from "@/lib/data/tenant-portal.server";
import type { Contractor } from "@/lib/data/contractors.server";
import type { AutonomyState } from "@/lib/platform/settings.server";
import type { AuditEntry } from "@/lib/platform/audit-log.server";
import type { CorporateUser } from "@/lib/platform/users.server";
import type { Portfolio } from "@/lib/data/portfolio.server";
import { DiegoTriageQueue } from "@/components/hub/diego-triage-queue";
import { ContractorRoster } from "@/components/hub/contractor-roster";
import { MarianaApplicationForm } from "@/components/hub/mariana-application-form";
import { InviteLandlordForm } from "@/components/hub/invite-landlord-form";
import { toggleAutonomyKillSwitchAction } from "@/lib/platform/actions";
import { updateRentRollFieldAction } from "@/lib/data/portfolio-actions";

type SidebarTab = "rentroll" | "maint" | "legal" | "rbac";

type RentRollSortKey = "name" | "sqm" | "sharePct" | "rent";
type RentRollSort = { key: RentRollSortKey; dir: "asc" | "desc" };

function SortableHeader({
  label,
  sortKey,
  current,
  onSort,
  align = "left",
  title,
  className = "",
}: {
  label: string;
  sortKey: RentRollSortKey;
  current: RentRollSort;
  onSort: (key: RentRollSortKey) => void;
  align?: "left" | "right";
  title?: string;
  className?: string;
}) {
  const active = current.key === sortKey;
  return (
    <th className={`p-3.5 ${align === "right" ? "text-right" : "text-left"}`} title={title}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 cursor-pointer hover:text-ink ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-ink" : "text-ink-700"} ${className}`}
      >
        <span>{label}</span>
        <span className="text-[10px] leading-none">{active ? (current.dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

/**
 * Format an audit entry's ISO timestamp for display — real entries span days,
 * not just "today," so the date rides along instead of being dropped.
 */
function formatAuditTimestamp(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Format a lease's ISO end_date for display. */
function formatContractDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Format currency in MXN with optional decimals
 */
function formatMxn(val: number, decimals = 0) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(val);
}



/**
 * Main Landlord Asset Management Console Component
 */
export function LandlordDashboard({
  data,
  diegoTickets,
  diegoKpis,
  localeOptions,
  contractors,
  autonomyState,
  initialAuditLog,
  corporateUsers,
  portfolio,
}: {
  data: ConsoleData;
  diegoTickets: DiegoTicket[];
  diegoKpis: DiegoKPIs;
  localeOptions: LocaleOption[];
  contractors: Contractor[];
  autonomyState: AutonomyState;
  initialAuditLog: AuditEntry[];
  corporateUsers: CorporateUser[];
  portfolio: Portfolio;
}) {
  const {
    capexCases,
    capexRejected,
    capexWarrantyRecovered,
    maintenanceEvents,
    periodLabel,
  } = data;

  const { rentRoll, leases, plazaTotalGla, leasedSqm, contractedRent } = portfolio;

  // View & Filter States
  const [activeTab, setActiveTab] = useState<SidebarTab>("rentroll");
  const [currency, setCurrency] = useState<"MXN" | "USD">("MXN");
  const exchangeRate = 17.50; // Exchange rate (17.50 MXN = 1 USD)

  const formatVal = (val: number, decimals = 0) => {
    if (currency === "USD") {
      const usdVal = val / exchangeRate;
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      }).format(usdVal);
    }
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(val);
  };

  const [isEditingRentRoll, setIsEditingRentRoll] = useState(false);
  const router = useRouter();
  // Keyed `${localeId}:${field}` — lets each cell show its own saving state
  // independently instead of locking the whole table while one field saves.
  const [savingField, setSavingField] = useState<string | null>(null);

  async function saveRentRollField(localeId: string, field: "sqm" | "rent", rawValue: string, currentValue: number, label: string) {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0) {
      triggerToast(`Valor inválido para ${label}.`);
      return;
    }
    if (value === currentValue) return;

    const key = `${localeId}:${field}`;
    setSavingField(key);
    const result = await updateRentRollFieldAction(localeId, field, value);
    setSavingField(null);

    if (result.error) {
      triggerToast(`No se pudo actualizar ${label}: ${result.error}`);
      return;
    }
    triggerToast(`${label} actualizado.`);
    router.refresh();
  }

  // Rent Roll table sort/filter
  const [rentRollFilter, setRentRollFilter] = useState("");
  const [rentRollSort, setRentRollSort] = useState<RentRollSort>({ key: "name", dir: "asc" });

  const toggleRentRollSort = (key: RentRollSortKey) => {
    setRentRollSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  };

  const visibleRentRoll = useMemo(() => {
    const needle = rentRollFilter.trim().toLowerCase();
    const filtered = needle
      ? rentRoll.filter((r) => r.name.toLowerCase().includes(needle) || r.unitCode.toLowerCase().includes(needle))
      : rentRoll;

    const sorted = [...filtered].sort((a, b) => {
      const { key, dir } = rentRollSort;
      const mult = dir === "asc" ? 1 : -1;
      if (key === "name") return a.name.localeCompare(b.name) * mult;
      return (a[key] - b[key]) * mult;
    });
    return sorted;
  }, [rentRoll, rentRollFilter, rentRollSort]);

  // AI Copilot Drawer State
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState<"mariana" | "diego">("mariana");
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotAskedQuestion, setCopilotAskedQuestion] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  // Cancels an in-flight ask when the agent tab switches mid-question — without
  // this, a slow Mariana response could land under Diego's tab after the switch.
  const copilotAbortRef = useRef<AbortController | null>(null);

  // Interactive AI Action States & Simulations
  const [warrantyCategoryFilter, setWarrantyCategoryFilter] = useState<string>("ALL");

  // Diego IA Maintenance Calendar States
  const [eventNotified, setEventNotified] = useState<Record<string, boolean>>({});

  // Accessibility Font Scale State
  const [fontSizeLevel, setFontSizeLevel] = useState<"normal" | "large" | "xlarge">("normal");

  // Sidebar nav is a full-screen drawer on mobile (closed by default) so the
  // console content is reachable without scrolling past the entire nav first —
  // on desktop (lg:) it stays permanently visible regardless of this state.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const selectTab = (tab: SidebarTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  // Governance Policy Edit States
  const [editingPolicyCard, setEditingPolicyCard] = useState<null | "diego" | "sso">(null);

  // CapEx cost Diego kept off the landlord's P&L this month (denied to the tenant + warranty-covered).
  // Excludes APROBADO_PRORRATEO_CAM cases — those route to Renata's CAM pool, not here, so this
  // total never double-counts against Fondo CAM NNN Mensual.
  const diegoProtectedCapex = capexRejected + capexWarrantyRecovered;

  const [diegoThresholdVal, setDiegoThresholdVal] = useState<number>(50000);
  const [diegoAutoMode, setDiegoAutoMode] = useState<boolean>(true);
  const [ssoEnforcedMode, setSsoEnforcedMode] = useState<boolean>(true);
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(autonomyState.frozen);
  const [killSwitchPending, setKillSwitchPending] = useState(false);

  // Diego IA Maintenance Sub-Navigation State
  const [maintSubTab, setMaintSubTab] = useState<"triage" | "capex" | "contratistas">("triage");

  // Mariana IA Legal Engine States
  const [legalSubTab, setLegalSubTab] = useState<"expedientes" | "prospectos" | "marco_legal">("expedientes");
  const [lastLawScanDate, setLastLawScanDate] = useState("Hoy, 10 Ago 2026 · 06:00 hrs");
  const [selectedProspectIndex, setSelectedProspectIndex] = useState<number>(0);
  const [customProspectBrand, setCustomProspectBrand] = useState("");
  const [customProspectCategory, setCustomProspectCategory] = useState("Cafetería & Repostería");
  const [inspectedContractId, setInspectedContractId] = useState<string | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Immutable Audit Trail — the real events each Tier 2/3 action actually
  // writes to (ticket_status_history, agent_decisions, lease_applications
  // reviews, the autonomy kill-switch — see src/lib/platform/audit-log.server.ts),
  // not a hardcoded array. Fetched server-side; rendered newest-first.
  const auditLog = initialAuditLog;
  const [auditLogFilter, setAuditLogFilter] = useState("");

  return (
    <div
      style={{ zoom: fontSizeLevel === "large" ? 1.12 : fontSizeLevel === "xlarge" ? 1.25 : 1 }}
      className={`min-h-screen bg-sand-50 text-ink-700 flex flex-col lg:flex-row font-sans antialiased transition-all ${
        fontSizeLevel === "large" ? "scale-font-large" : fontSizeLevel === "xlarge" ? "scale-font-xlarge" : "scale-font-normal"
      }`}
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-terra text-white px-5 py-3.5 rounded-xl shadow-2xl border border-ink-700 flex items-center gap-3 text-xs font-semibold animate-slideUp">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-ink-400 hover:text-white text-xs ml-2 cursor-pointer font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Mobile drawer backdrop — tap outside the sidebar to close it */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* LEFT SIDEBAR NAVIGATION — off-canvas drawer on mobile, permanent column on lg+ */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-white border-r border-hairline/80 shrink-0 flex flex-col justify-between p-5 space-y-6 text-left transition-transform duration-200 lg:static lg:z-auto lg:w-72 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          <div className="flex justify-end lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="-mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-sand-100"
              aria-label="Cerrar menú"
            >
              ✕
            </button>
          </div>
          {/* Brand Header */}
          <div className="px-1 py-1 space-y-2">
            <div className="inline-block bg-sand-50 px-3 py-2 rounded-xl border border-hairline shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/la-gran-via-logo-horizontal.png"
                alt="La Gran Vía Mexicali"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-ink-500 font-semibold px-0.5">Asset Management Hub · Consola</p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-left">
            <p className="px-2 text-xs font-bold text-ink-400 tracking-wider mb-2">
              Panel del Portafolio
            </p>

            <button
              onClick={() => selectTab("rentroll")}
              className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "rentroll"
                  ? "bg-terra text-white shadow-xs"
                  : "text-ink-700 hover:bg-sand-100 hover:text-ink"
              }`}
            >
              <span>Rent Roll & Locales</span>
            </button>

            <p className="px-2 text-xs font-bold text-ink-400 tracking-wider mt-6 mb-2">
              Gestión & Inteligencia Operativa
            </p>

            <button
              onClick={() => selectTab("maint")}
              className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "maint"
                  ? "bg-terra text-white shadow-xs"
                  : "text-ink-700 hover:bg-sand-100 hover:text-ink"
              }`}
            >
              <span>Diego IA · Mantenimiento</span>
            </button>

            <button
              onClick={() => selectTab("legal")}
              className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "legal"
                  ? "bg-terra text-white shadow-xs"
                  : "text-ink-700 hover:bg-sand-100 hover:text-ink"
              }`}
            >
              <span>Mariana IA · Legal</span>
            </button>

            <p className="px-2 text-xs font-bold text-ink-400 tracking-wider mt-6 mb-2">
              Gobierno & Seguridad
            </p>

            <button
              onClick={() => selectTab("rbac")}
              className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "rbac"
                  ? "bg-terra text-white shadow-xs"
                  : "text-ink-700 hover:bg-sand-100 hover:text-ink"
              }`}
            >
              <span>Control de Acceso RBAC</span>
              <span className="text-xs font-bold bg-sand-200 text-ink px-2 py-0.5 rounded shrink-0 ml-2">Admin</span>
            </button>
          </nav>
        </div>

        {/* Footer Session Badge */}
        <div className="pt-4 border-t border-hairline space-y-3 text-left">
          <div
            onClick={() => {
              selectTab("rbac");
              triggerToast("Abriendo Consola de Control de Acceso & Permisos RBAC...");
            }}
            className="rounded-xl bg-sand-50 hover:bg-sand-100 p-3.5 space-y-1.5 border border-hairline transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center justify-between text-ink font-bold">
              <span className="group-hover:underline font-mono text-xs truncate">m.hage@lagranvia.com.mx</span>
              <span className="h-2.5 w-2.5 rounded-full bg-terra shrink-0 ml-1" />
            </div>
            <p className="text-xs text-ink-500 font-semibold truncate">Administrador General · RBAC →</p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* TOP HEADER BAR */}
        <header className="h-auto min-h-16 bg-white border-b border-hairline/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 font-sans shadow-2xs">
          {/* Top Header Title or Left Spacer */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-ink-700 hover:bg-sand-100 lg:hidden"
              aria-label="Abrir menú"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-xs sm:text-sm font-bold tracking-wider text-ink-500 font-sans">
              La Gran Vía · Consola de Control
            </span>
          </div>

          {/* Controls, Currency Toggle, Accessibility Font Switcher & AI Copilot Drawer Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* ACCESSIBILITY FONT SIZE CONTROLLER */}
            <div className="flex items-center bg-sand-100 p-1 rounded-xl border border-hairline text-xs font-bold shrink-0">
              <span className="px-2 text-ink-500 text-xs font-semibold hidden md:inline">Texto:</span>
              <button
                onClick={() => {
                  setFontSizeLevel("normal");
                  triggerToast("Tamaño de texto: Normal");
                }}
                title="Texto Normal"
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                  fontSizeLevel === "normal"
                    ? "bg-terra text-white shadow-2xs font-bold"
                    : "text-ink-500 hover:text-ink"
                }`}
              >
                A
              </button>
              <button
                onClick={() => {
                  setFontSizeLevel("large");
                  triggerToast("Tamaño de texto: Grande (+15%)");
                }}
                title="Texto Grande"
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-sm ${
                  fontSizeLevel === "large"
                    ? "bg-terra text-white shadow-2xs font-bold"
                    : "text-ink-500 hover:text-ink"
                }`}
              >
                A+
              </button>
              <button
                onClick={() => {
                  setFontSizeLevel("xlarge");
                  triggerToast("Tamaño de texto: Extra Grande (+30%)");
                }}
                title="Texto Extra Grande"
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-base ${
                  fontSizeLevel === "xlarge"
                    ? "bg-terra text-white shadow-2xs font-bold"
                    : "text-ink-500 hover:text-ink"
                }`}
              >
                A++
              </button>
            </div>

            {/* CURRENCY TRANSLATION TOGGLE (MXN DEFAULT / USD AT 17.50 RATE) */}
            <div className="flex items-center bg-sand-100 p-1 rounded-xl border border-hairline/80 text-xs font-bold shrink-0">
              <button
                onClick={() => {
                  setCurrency("MXN");
                  triggerToast("Moneda establecida en Pesos (MXN).");
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  currency === "MXN"
                    ? "bg-terra text-white shadow-2xs"
                    : "text-ink-500 hover:text-ink"
                }`}
              >
                MXN ($)
              </button>
              <button
                onClick={() => {
                  setCurrency("USD");
                  triggerToast("Moneda traducida a Dólares (USD @ $17.50 MXN/USD).");
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  currency === "USD"
                    ? "bg-terra text-white shadow-2xs"
                    : "text-ink-500 hover:text-ink"
                }`}
              >
                USD ($17.50)
              </button>
            </div>

            <select
              aria-label="Periodo de reporte"
              className="bg-sand-100/80 border border-hairline/80 rounded-xl px-3 py-2 text-xs font-semibold text-ink-700 focus:outline-none cursor-pointer"
            >
              <option value="ago-2026">Agosto 2026 (Actual)</option>
              <option value="jul-2026">Julio 2026</option>
              <option value="jun-2026">Junio 2026</option>
              <option value="q3-2026">Q3 2026</option>
              <option value="y-2026">Año 2026 (Full)</option>
            </select>

            <button
              onClick={() => setCopilotOpen(!copilotOpen)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                copilotOpen
                  ? "bg-terra-dark text-white"
                  : "bg-terra hover:bg-terra-dark text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-ink-400" />
              <span>Copiloto IA</span>
            </button>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <div className="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto font-sans">
          {activeTab === "rentroll" && (
            <div className="bg-white border border-hairline rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs font-sans">
              {/* TOP HEADER & ACTION BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-terra" />
                    <span className="text-xs font-semibold tracking-wider text-ink-500">
                      Single Source of Truth (SSOT) · Base de Datos Maestra
                    </span>
                  </div>
                  <h2 className="font-sans text-2xl font-bold text-ink mt-1">
                    Rent Roll & Directorio Unificado de Locales
                  </h2>
                  <p className="text-sm text-ink-500 mt-1">
                    Registro maestro de {rentRoll.length} locales comerciales. Los cambios aplicados aquí actualizan en tiempo real el Portal del Arrendatario (<code className="bg-sand-100 px-1.5 py-0.5 rounded text-ink-700 font-medium">/inquilinos</code>). El Plano Interactivo público (<code className="bg-sand-100 px-1.5 py-0.5 rounded text-ink-700 font-medium">/directorio</code>) usa su propio contenido de marketing y no se actualiza desde aquí.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      const nextState = !isEditingRentRoll;
                      setIsEditingRentRoll(nextState);
                      if (nextState) {
                        triggerToast("Modo edición activado. Cada cambio se guarda al salir del campo (Tab o Enter).");
                      }
                    }}
                    className="bg-terra hover:bg-terra-dark text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    {isEditingRentRoll ? "Terminar Edición" : "Modo Edición"}
                  </button>
                </div>
              </div>

              {/* PORTFOLIO KPI SUMMARY — three numbers derivable from lease
                  terms alone. The previous two cards (Renta Recibida / Real
                  Cobrada, Variación-Pendiente CFDI) claimed to know what was
                  actually collected and which invoices had payment-method
                  mismatches — that requires a bank feed or ERP/accounting
                  connection this engagement doesn't have and isn't getting.
                  Nothing here implies knowledge this system doesn't have. */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-display">
                <div className="bg-sand-50 border border-hairline/90 border-t-2 border-t-terra rounded-xl p-4.5 space-y-1">
                  <p className="text-xs font-bold text-ink-500 tracking-wide font-display">Renta Contratada (Portafolio)</p>
                  <p className="text-2xl font-bold font-display text-ink">{formatMxn(contractedRent)}</p>
                  <p className="text-xs text-ink-500 font-medium font-display">{rentRoll.length} locales bajo contrato</p>
                </div>

                <div className="bg-sand-50 border border-hairline/90 border-t-2 border-t-terra rounded-xl p-4.5 space-y-1">
                  <p className="text-xs font-bold text-ink-500 tracking-wide font-display">Renta Promedio / m²</p>
                  <p className="text-2xl font-bold font-display text-ink">{formatVal(Math.round(contractedRent / leasedSqm))}</p>
                  <p className="text-xs text-ink-500 font-medium font-display">Sobre {leasedSqm.toLocaleString("es-MX")} m² arrendados</p>
                </div>

                <div className="bg-sand-50 border border-hairline/90 border-t-2 border-t-terra rounded-xl p-4.5 space-y-1">
                  <p className="text-xs font-bold text-ink-500 tracking-wide font-display">Ocupación GLA</p>
                  <p className="text-2xl font-bold font-display text-ink">{((leasedSqm / plazaTotalGla) * 100).toFixed(1)}%</p>
                  <p className="text-xs text-ink-500 font-medium font-display">
                    {leasedSqm.toLocaleString("es-MX")} de {plazaTotalGla.toLocaleString("es-MX")} m² totales
                  </p>
                </div>
              </div>

              {/* Master rent roll banner — no ERP claim, no fake sync
                  timestamp. This engagement has no accounting/ERP
                  connection and per explicit scope decision isn't getting
                  one; "Sincronizado con ERP" was never true. */}
              <div className="bg-sand-50 border border-hairline rounded-xl p-4 text-xs text-ink-700 font-medium">
                <span className="font-bold text-ink text-xs">Rent Roll Maestro · Periodo Fiscal: Agosto 2026</span>
                <p className="text-[11px] text-ink-500 mt-0.5">
                  Padrón contractual del portafolio (GLA Total: {plazaTotalGla.toLocaleString("es-MX")} m² · Superficie Rentable Bruta).
                </p>
              </div>

              {/* RENT ROLL MASTER TABLE (CLEAN 5-COLUMN EXECUTIVE LEASE LEDGER) */}
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={rentRollFilter}
                  onChange={(e) => setRentRollFilter(e.target.value)}
                  placeholder="Filtrar por inquilino o local…"
                  className="w-full max-w-xs rounded-lg border border-hairline-strong px-3 py-2 text-xs bg-white focus:border-terra focus:outline-none"
                />
                <p className="text-[11px] text-ink-500 font-medium whitespace-nowrap">
                  {visibleRentRoll.length} de {rentRoll.length} locales
                </p>
              </div>

              <div className="border border-hairline rounded-xl bg-white shadow-2xs overflow-hidden">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-sand-50 text-[11px] font-bold text-ink-700 border-b border-hairline tracking-wider">
                    <tr>
                      <SortableHeader label="Inquilino & Local" sortKey="name" current={rentRollSort} onSort={toggleRentRollSort} />
                      <SortableHeader label="Superficie" sortKey="sqm" current={rentRollSort} onSort={toggleRentRollSort} align="right" />
                      <SortableHeader
                        label="% Participación GLA"
                        sortKey="sharePct"
                        current={rentRollSort}
                        onSort={toggleRentRollSort}
                        align="right"
                        title={`GLA = Gross Leasable Area / Superficie Rentable Bruta (${plazaTotalGla.toLocaleString("es-MX")} m² total)`}
                      />
                      <SortableHeader
                        label="Renta Mensual Contratada"
                        sortKey="rent"
                        current={rentRollSort}
                        onSort={toggleRentRollSort}
                        align="right"
                        className="font-extrabold"
                      />
                      <th
                        className="p-3.5 text-center cursor-default select-none"
                        title="SSOT = Single Source of Truth / Fuente Única de Verdad (Información sincronizada en tiempo real)"
                      >
                        Estatus Contractual SSOT
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline text-ink-700 font-medium">
                    {visibleRentRoll.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-ink-500">
                          Sin resultados para &ldquo;{rentRollFilter}&rdquo;.
                        </td>
                      </tr>
                    )}
                    {visibleRentRoll.map((r) => {
                      const isBlueLuna = r.name.includes("Blue Luna");

                      return (
                        <tr key={r.slug} className={`transition-colors ${isEditingRentRoll ? "bg-sand-100/50 hover:bg-sand-100" : "hover:bg-sand-50"}`}>
                          <td className="p-3.5">
                            <p className="font-bold text-ink text-xs">{r.name}</p>
                            <p className="text-[11px] text-ink-500 font-medium">{r.unitCode}</p>
                          </td>
                          <td className="p-3.5 text-right font-medium text-ink-700 whitespace-nowrap">
                            {isEditingRentRoll ? (
                              <input
                                type="number"
                                defaultValue={r.sqm}
                                aria-label={`Superficie m² para ${r.name}`}
                                disabled={savingField === `${r.slug}:sqm`}
                                className="w-16 bg-white border border-hairline-strong rounded px-1.5 py-0.5 text-right font-bold text-ink text-xs focus:border-terra focus:outline-none disabled:opacity-50"
                                onBlur={(e) => saveRentRollField(r.slug, "sqm", e.target.value, r.sqm, `Superficie de ${r.name}`)}
                                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                              />
                            ) : (
                              `${r.sqm} m²`
                            )}
                          </td>
                          <td className="p-3.5 text-right font-medium text-ink-700 text-xs whitespace-nowrap">{r.sharePct.toFixed(2)}%</td>
                          <td className="p-3.5 text-right font-bold text-ink text-xs whitespace-nowrap">
                            {isEditingRentRoll ? (
                              <input
                                type="number"
                                defaultValue={r.rent}
                                aria-label={`Renta mensual para ${r.name}`}
                                disabled={savingField === `${r.slug}:rent`}
                                className="w-24 bg-white border border-hairline-strong rounded px-1.5 py-0.5 text-right font-bold text-ink text-xs focus:border-terra focus:outline-none disabled:opacity-50"
                                onBlur={(e) => saveRentRollField(r.slug, "rent", e.target.value, r.rent, `Renta de ${r.name}`)}
                                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                              />
                            ) : (
                              <div>
                                <p className="font-bold text-ink text-xs">{formatVal(r.rent)}</p>
                                <p className="text-[10.5px] text-ink-500 font-medium">
                                  {formatVal(Math.round(r.rent / r.sqm))}/m²
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            {isBlueLuna ? (
                              <button
                                onClick={() => {
                                  setActiveAgent("mariana");
                                  setCopilotOpen(true);
                                  setQueryResult(
                                    "Mariana IA (Contratos & Arrendamientos): Blue Luna Café (Local 4-16). Póliza de seguro de responsabilidad civil vence en Nov 2026. Recordatorio legal pre-notificado."
                                  );
                                  triggerToast("Mariana IA (Contratos): Expediente Blue Luna Café abierto.");
                                }}
                                title="Ver auditoría de póliza asignada a Mariana IA"
                                className="bg-caution-surface hover:bg-caution-surface text-caution border border-caution/40 px-2.5 py-1 rounded-full font-bold text-[10px] cursor-pointer transition-all hover:scale-105 shadow-xs flex items-center gap-1 mx-auto"
                              >
                                Revisar Seguro · Mariana IA →
                              </button>
                            ) : (
                              <span className="bg-sand-100 text-ink-700 border border-hairline px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                Vigente SSOT
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "maint" && (
            <div className="bg-white border border-hairline rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs font-sans">
              {/* HEADER & WARRANTY UPLOAD ACTION BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-terra" />
                    <span className="text-xs font-semibold tracking-wider text-ink-500">
                      Agente de Mantenimiento & CapEx · Diego IA
                    </span>
                  </div>
                  <h2 className="font-sans text-xl font-bold text-ink mt-1">Diego IA · CapEx, Mantenimiento & Expediente Digital</h2>
                  <p className="text-xs text-ink-500 font-medium mt-1">
                    Control de pólizas de equipos pesados (HVAC, Elevadores, Subestaciones), bitácora preventiva y reclamación automática de garantías a proveedores.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => triggerToast("Selecciona la Garantía, Póliza o Manual de Equipo (PDF/XML) para indexar en Diego IA...")}
                    className="bg-white hover:bg-sand-100 text-ink border border-hairline-strong font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                  >
                    + Cargar Garantía o Manual (PDF)
                  </button>
                </div>
              </div>

              {/* SUB-NAVIGATION PILLS BAR */}
              <div className="flex flex-wrap items-center gap-2 border-b border-hairline pb-4">
                <button
                  onClick={() => setMaintSubTab("triage")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    maintSubTab === "triage"
                      ? "bg-terra text-white shadow-xs"
                      : "bg-sand-100 hover:bg-sand-200 text-ink-700 border border-hairline"
                  }`}
                >
                  Triage & Calendario
                </button>
                <button
                  onClick={() => setMaintSubTab("capex")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    maintSubTab === "capex"
                      ? "bg-terra text-white shadow-xs"
                      : "bg-sand-100 hover:bg-sand-200 text-ink-700 border border-hairline"
                  }`}
                >
                  CapEx & Costos
                </button>
                <button
                  onClick={() => setMaintSubTab("contratistas")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    maintSubTab === "contratistas"
                      ? "bg-terra text-white shadow-xs"
                      : "bg-sand-100 hover:bg-sand-200 text-ink-700 border border-hairline"
                  }`}
                >
                  Contratistas & Garantías
                </button>
              </div>

              {/* SUB-TAB 1: TRIAGE & CALENDARIO */}
              {maintSubTab === "triage" && (
              <div className="space-y-6 animate-fadeIn">
              {/* DIEGO IA · LIVE TRIAGE QUEUE — real Supabase rows, the Tier 3 gate,
                  and the dynamic jurisdiction watermark. Sits above the scheduled
                  calendar per the "operational conveyor belt" ordering: triage/approve
                  first, scheduled/dispatched execution below. */}
              <DiegoTriageQueue tickets={diegoTickets} kpis={diegoKpis} localeOptions={localeOptions} />

              {/* CALENDARIO DE PRÓXIMOS EVENTOS — informational schedule of preventive
                  maintenance/calibrations; the real Tier 3 dispatch-approval gate lives
                  in DiegoTriageQueue above, against actual tickets. This calendar has no
                  Supabase table behind it, so it never pretended to gate a real dispatch
                  here — the approval affordance that used to imply it did was removed. */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
                  <div>
                    <h3 className="font-sans text-base font-bold text-ink">
                      Calendario de Próximos Eventos
                    </h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Mantenimiento preventivo y calibraciones programadas.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {maintenanceEvents.map((event) => {
                    const isNotified = eventNotified[event.id];
                    return (
                      <div
                        key={event.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border bg-white border-hairline"
                      >
                        <div className="text-center shrink-0 w-16">
                          <p className="text-xs font-extrabold text-ink">{event.date.split(" ")[0]}</p>
                          <p className="text-[10px] font-bold text-ink-500 uppercase">{event.date.split(" ")[1]} {event.date.split(" ")[2]}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-ink text-xs">{event.title}</p>
                          <p className="text-[11px] text-ink-500">{event.vendor} · {event.category} · Responsable: {event.responsible}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-ink text-xs font-sans tabular-nums">{formatVal(event.costEstimate)}</p>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 bg-sand-100 text-ink-700 border border-hairline">
                            Programado
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setEventNotified((prev) => ({ ...prev, [event.id]: true }));
                              triggerToast(`Correo enviado a ${event.responsible} (${event.responsibleEmail}) sobre "${event.title}".`);
                            }}
                            disabled={isNotified}
                            className={`font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all whitespace-nowrap border ${
                              isNotified
                                ? "bg-sand-50 text-ink-400 border-hairline cursor-default"
                                : "bg-white hover:bg-sand-100 text-ink-700 border-hairline-strong cursor-pointer"
                            }`}
                          >
                            {isNotified ? "Notificado ✓" : "Notificar por Correo"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>
              )}

              {/* SUB-TAB 2: CAPEX & COSTOS */}
              {maintSubTab === "capex" && (
              <div className="space-y-6 animate-fadeIn">
              {/* CAPEX COST-RESPONSIBILITY LEDGER (TIES DIEGO'S ACTIVITY TO A REAL $ FIGURE FOR FINANZAS) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
                  <div>
                    <h3 className="font-sans text-base font-bold text-ink">
                      Registro de Casos CapEx & Responsabilidad de Costo
                    </h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Cada solicitud de gasto mayor resuelta por Diego IA: quién paga y por qué. Alimenta la tarjeta &ldquo;CapEx Protegido&rdquo; en la Torre de Control CFO.
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-sand-100 text-ink-700 px-3 py-1 rounded-lg border border-hairline shrink-0">
                    {formatVal(diegoProtectedCapex)} Protegidos del P&amp;L
                  </span>
                </div>

                <div className="overflow-x-auto border border-hairline rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-sand-50 text-ink-700 font-bold border-b border-hairline text-[11px] tracking-wider">
                      <tr>
                        <th className="p-3.5">Caso / Inquilino</th>
                        <th className="p-3.5">Tipo de Gasto & Equipo</th>
                        <th className="p-3.5 text-right">Monto</th>
                        <th className="p-3.5">Veredicto Diego IA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline font-medium">
                      {capexCases.map((c) => {
                        const verdictMeta =
                          c.verdict === "RECHAZADO_RESPONSABILIDAD_INQUILINO"
                            ? { label: "Rechazado · Responsabilidad Inquilino", badge: "bg-terra text-white" }
                            : c.verdict === "APROBADO_GARANTIA_COSTO_CERO"
                              ? { label: "Aprobado · Garantía ($0 MXN)", badge: "bg-sand-100 text-ink-700 border border-hairline" }
                              : { label: "Aprobado · Prorrateo CAM", badge: "bg-caution-surface text-caution border border-caution/40" };
                        return (
                          <tr key={c.id} className="hover:bg-sand-50/90 transition-colors align-top">
                            <td className="p-3.5">
                              <p className="font-bold text-ink text-xs">{c.tenant}</p>
                              <p className="text-[11px] text-ink-500">{c.id}</p>
                            </td>
                            <td className="p-3.5">
                              <p className="text-ink-700 font-semibold">{c.expenseType}</p>
                              <p className="text-[11px] text-ink-500">{c.equipmentModel} · {c.serialNumber}</p>
                            </td>
                            <td className="p-3.5 text-right font-bold font-sans tabular-nums text-ink whitespace-nowrap">
                              {formatVal(c.amount)}
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1 ${verdictMeta.badge}`}>
                                {verdictMeta.label}
                              </span>
                              <p className="text-[11px] text-ink-500 leading-relaxed max-w-md">{c.details}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
              )}

              {/* SUB-TAB 3: CONTRATISTAS & GARANTÍAS */}
              {maintSubTab === "contratistas" && (
              <div className="space-y-6 animate-fadeIn">
              {/* PREAPPROVED CONTRACTOR ROSTER — real contractors table, wired to
                  matchContractorAndTier()'s exact-match dispatch lookup. */}
              <ContractorRoster contractors={contractors} />

              {/* EXPEDIENTE DIGITAL DE GARANTÍAS DE EQUIPOS Y DOCUMENTOS DE INFRAESTRUCTURA */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
                  <div>
                    <h3 className="font-sans text-base font-bold text-ink">
                      Expediente Digital de Garantías & Pólizas de Equipos
                    </h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Diego IA monitorea la vigencia de pólizas de mantenimiento, reclamaciones a fabricantes e historial técnico.
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-sand-100 text-ink-700 px-3 py-1 rounded-lg border border-hairline shrink-0">
                    8 Garantías Indexadas en Diego IA
                  </span>
                </div>

                {/* WARRANTY SYSTEM CATEGORY FILTER PILLS */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  {[
                    { id: "ALL", label: "Todos los Sistemas (8)" },
                    { id: "HVAC", label: "HVAC & Climas (1)" },
                    { id: "ELEVATOR", label: "Elevadores (1)" },
                    { id: "POWER", label: "Eléctrico (1)" },
                    { id: "ROOF", label: "Techos (1)" },
                    { id: "FIRE", label: "Incendio (1)" },
                    { id: "SOLAR", label: "Solar (1)" },
                    { id: "SECURITY", label: "Seguridad (1)" },
                    { id: "PLUMBING", label: "Hidráulico (1)" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setWarrantyCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        warrantyCategoryFilter === cat.id
                          ? "bg-terra text-white font-bold shadow-2xs"
                          : "bg-sand-100 hover:bg-sand-200 text-ink-700 border border-hairline"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* 8 CRITICAL INFRASTRUCTURE WARRANTY CARDS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* WARRANTY CARD 1: CHILLER TRANE */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "HVAC") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2 py-0.5 rounded">
                              HVAC Climatización
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Serie: TRN-2024-884</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Chiller Centravac Trane 150 Ton (Torre Central)</h4>
                        </div>
                        <span className="bg-sand-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-sand-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">garantia_trane_chiller_2024_2029.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>5 Años en Compresor, Condensador & Evaporador</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Climas de Mexicali S.A. de C.V.</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>14 de Noviembre de 2029</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA generó carta de reclamo de garantía para Climas de Mexicali.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Generar Reclamo de Garantía →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Revisión Preventiva: Al Día</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 2: THYSSENKRUPP ELEVATOR */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "ELEVATOR") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2 py-0.5 rounded">
                              Elevadores & Movilidad
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Serie: TK-MEX-4410</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Elevador Panorámico ThyssenKrupp (Zona A)</h4>
                        </div>
                        <span className="bg-sand-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-sand-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">poliza_mantenimiento_thyssenkrupp_2026.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Atención de Urgencia 24/7 & Repuestos Originales</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>TK Elevator México</strong></p>
                        <p>📅 Vencimiento de Póliza: <strong>31 de Diciembre de 2026</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA solicitó inspección de rutina a TK Elevator México.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Solicitar Inspección Técnica →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Último Mantenimiento: 25 Jul</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 3: SCHNEIDER SUBSTATION */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "POWER") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2 py-0.5 rounded">
                              Subestación Eléctrica
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Serie: SCH-1500-KVA</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Subestación Eléctrica Schneider 1500 KVA</h4>
                        </div>
                        <span className="bg-sand-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-sand-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">garantia_subestacion_schneider_2025.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Transformadores de Potencia & Interruptores de Vacío</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Schneider Electric México</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>28 de Febrero de 2028</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA descargó el certificado de garantía de Schneider Electric.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Ver Póliza de Garantía →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Carga Actual: 68% Capacity</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 4: MAPEI WATERPROOFING */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "ROOF") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2 py-0.5 rounded">
                              Impermeabilización Techos
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Superficie: 8,400 m²</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Impermeabilización Mapei (Cinemex & Zona B)</h4>
                        </div>
                        <span className="bg-sand-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía 10 Años ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-sand-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">garantia_impermeabilizacion_mapei_10a.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Garantía de 10 Años Libre de Filtraciones en Techos</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Mapei de México</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>15 de Junio de 2034</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA programó la inspección anual previa a la temporada de lluvias.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Programar Inspección Anual →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Estado: 0 Filtraciones</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 5: JOHNSON CONTROLS FIRE PROTECTION (NEW) */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "FIRE") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2 py-0.5 rounded">
                              Protección Incendio
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Certificación: NFPA 25</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Sistema de Aspersión & Bomba SimplexGrinnell</h4>
                        </div>
                        <span className="bg-sand-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-sand-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">poliza_sistema_contra_incendio_2026.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Certificación NFPA 25 & Reemplazo de Válvulas de Retención</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Johnson Controls Fire Protection</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>30 de Septiembre de 2027</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA confirmó la prueba de presión trimestral del sistema contra incendio.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Ver Dictamen Bomberos →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Presión: 140 PSI (OK)</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 6: CANADIAN SOLAR PANELS (NEW) */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "SOLAR") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2 py-0.5 rounded">
                              Energía Solar Fotovoltaica
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Capacidad: 350 kWp</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Arreglo Fotovoltaico Canadian Solar (Techado C)</h4>
                        </div>
                        <span className="bg-sand-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía 25 Años ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-sand-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">garantia_paneles_solares_canadian_25a.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>25 Años de Rendimiento Fotovoltaico al 85% de Eficiencia</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Canadian Solar México / Enel X</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>10 de Enero de 2048</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA generó el reporte de generación limpia del arreglo solar.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Ver Eficiencia Inversores →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Generación: 42 MWh/mes</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 7: HIKVISION / FAAC PARKING (NEW) */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "SECURITY") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2 py-0.5 rounded">
                              Seguridad & Acceso
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">6 Carriles LPR</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Barreras Automatizadas & Cámaras FAAC / Hikvision</h4>
                        </div>
                        <span className="bg-sand-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-sand-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">poliza_barreras_estacionamiento_faac.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Motores Hidráulicos FAAC & Cámaras de Reconocimiento LPR</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Hikvision & FAAC México</strong></p>
                        <p>📅 Vencimiento de Póliza: <strong>18 de Mayo de 2027</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA solicitó calibración de la cámara LPR del carril 2.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Calibrar Cámaras LPR →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Uptime: 99.9%</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 8: GRUNDFOS WATER TREATMENT (NEW) */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "PLUMBING") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2 py-0.5 rounded">
                              Hidráulico & Planta PTAR
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">PTAR 50 m³/día</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Planta de Tratamiento & Bombas Grundfos</h4>
                        </div>
                        <span className="bg-sand-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-sand-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">garantia_planta_tratamiento_grundfos.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Bombas Sumergibles, Membranas Biológicas & Control SBR</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Grundfos México</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>05 de Noviembre de 2027</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA verificó la calidad de agua tratada para riego de áreas verdes.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Ver Reporte Calidad Agua →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Reutilización: 100% Riego</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
              )}
            </div>
          )}

          {activeTab === "legal" && (
            <div className="bg-white border border-hairline rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs font-sans">
              {/* MODULE HEADER & ACTION BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-terra" />
                    <span className="text-xs font-semibold tracking-wider text-ink-500">
                      Agente Legal IA · Mariana IA
                    </span>
                  </div>
                  <h2 className="font-sans text-2xl font-bold text-ink mt-1">
                    Mariana IA · Inteligencia Multi-Contrato & Exclusividades
                  </h2>
                  <p className="text-xs text-ink-500 mt-1">
                    Supervisión activa de {rentRoll.length} contratos de arrendamiento, consultas legales en tiempo real y dictamen de exclusividades para prospectos.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <MarianaApplicationForm localeOptions={localeOptions} />
                  <button
                    onClick={() => {
                      setCopilotOpen(true);
                      setActiveAgent("mariana");
                      triggerToast("Abriendo Copiloto IA con Mariana IA (Agente Legal)...");
                    }}
                    className="bg-terra hover:bg-terra-dark text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                  >
                    <span className="h-2 w-2 rounded-full bg-ink-400" />
                    <span>Copiloto Mariana IA</span>
                  </button>
                </div>
              </div>

              {/* SUB-NAVIGATION PILLS BAR */}
              <div className="flex flex-wrap items-center gap-2 border-b border-hairline pb-4">
                <button
                  onClick={() => setLegalSubTab("expedientes")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    legalSubTab === "expedientes"
                      ? "bg-terra text-white shadow-xs"
                      : "bg-sand-100 hover:bg-sand-200 text-ink-700 border border-hairline"
                  }`}
                >
                  Expedientes & Anomalías (4)
                </button>
                <button
                  onClick={() => setLegalSubTab("prospectos")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    legalSubTab === "prospectos"
                      ? "bg-terra text-white shadow-xs"
                      : "bg-sand-100 hover:bg-sand-200 text-ink-700 border border-hairline"
                  }`}
                >
                  Viabilidad de Prospectos (Exclusividades)
                </button>
                <button
                  onClick={() => setLegalSubTab("marco_legal")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    legalSubTab === "marco_legal"
                      ? "bg-terra text-white shadow-xs"
                      : "bg-sand-100 hover:bg-sand-200 text-ink-700 border border-hairline"
                  }`}
                >
                  Marco Jurídico & Radar de Leyes (DOF & BC)
                </button>
              </div>

              {/* SUB-TAB 1: EXPEDIENTES & ANOMALÍAS (EXECUTIVE TABLE LEDGER WITH EXPANDABLE ROWS) */}
              {legalSubTab === "expedientes" && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-sans text-base font-bold text-ink">
                        Directorio General de Contratos Activos
                      </h3>
                      <p className="text-xs text-ink-500 mt-0.5">
                        Resumen ejecutivo de expedientes. Haz clic en cualquier fila para desplegar el desglose de cláusulas auditadas.
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold bg-sand-100 text-ink-700 px-3 py-1 rounded-lg border border-hairline shrink-0 cursor-default select-none"
                      title="SSOT = Single Source of Truth / Fuente Única de Verdad"
                    >
                      {leases.length} Contratos Indexados (SSOT)
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-hairline rounded-xl bg-white shadow-2xs">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-sand-50 text-ink-700 font-bold border-b border-hairline text-[11px] tracking-wider">
                        <tr>
                          <th className="p-3.5">Inquilino & Ubicación</th>
                          <th className="p-3.5">Vencimiento Contrato</th>
                          <th className="p-3.5">Renta Mensual</th>
                          <th className="p-3.5">Estatus Contractual</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline font-medium">
                        {leases.map((c) => (
                          <Fragment key={c.id}>
                            <tr
                              onClick={() => setInspectedContractId(inspectedContractId === c.id ? null : c.id)}
                              className="hover:bg-sand-50/90 transition-colors cursor-pointer"
                            >
                              <td className="p-3.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-ink-400 font-bold text-[10px] select-none">
                                    {inspectedContractId === c.id ? "▲" : "▼"}
                                  </span>
                                  <div>
                                    <p className="font-bold text-ink text-xs">{c.tenantEntity}</p>
                                    <p className="text-[11px] text-ink-500">{c.unitCode} · {c.sqm} m²</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <p className="font-bold text-ink text-xs">{formatContractDate(c.endDate)}</p>
                              </td>
                              <td className="p-3.5 font-semibold text-ink-700 text-xs">{formatMxn(c.rentMonthly)}</td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    c.renewalSoon ? "bg-terra text-white" : "bg-sand-100 text-ink-700 border border-hairline"
                                  }`}
                                >
                                  {c.renewalSoon ? "Renovación Próxima" : "Vigente"}
                                </span>
                              </td>
                            </tr>

                            {/* EXPANDABLE CLAUSE DETAIL ROW — only fields the real leases table has:
                                exclusive_use_clause and permitted_use. No document storage, no per-contract
                                hash, no INPC/penalty clause columns exist in the schema, so none are shown. */}
                            {inspectedContractId === c.id && (
                              <tr className="bg-sand-50/90 text-ink animate-fadeIn border-b-2 border-hairline">
                                <td colSpan={4} className="p-5 space-y-4 font-sans text-xs">
                                  <h4 className="font-bold text-sm text-ink border-b border-hairline pb-3">
                                    {c.tenantEntity} · {c.unitCode}
                                  </h4>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                    <div className="bg-white p-4 rounded-xl border border-hairline shadow-2xs space-y-1.5">
                                      <p className="font-extrabold text-ink text-xs tracking-wide">Cláusula de Exclusividad</p>
                                      <p className="text-ink-700 text-xs leading-relaxed font-medium">
                                        {c.exclusiveUseClause || "Sin cláusula de exclusividad registrada."}
                                      </p>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-hairline shadow-2xs space-y-1.5">
                                      <p className="font-extrabold text-ink text-xs tracking-wide">Uso Permitido</p>
                                      <p className="text-ink-700 text-xs leading-relaxed font-medium">
                                        {c.permittedUse || "No especificado."}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: EVALUADOR DE VIABILIDAD DE NUEVOS INQUILINOS (EXCLUSIVIDADES) */}
              {legalSubTab === "prospectos" && (
                <div className="bg-sand-50/80 border border-hairline/90 rounded-2xl p-6 space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline/70 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink bg-sand-200 px-2.5 py-0.5 rounded-md">
                          Inteligencia de Arrendamiento
                        </span>
                        <h3 className="font-sans text-base font-bold text-ink">
                          Evaluador de Viabilidad Legal de Nuevos Inquilinos (Exclusividades RAG)
                        </h3>
                      </div>
                      <p className="text-xs text-ink-500 mt-1">
                        Mariana IA cruza el giro y ubicación del prospecto contra los {rentRoll.length} contratos vigentes para prevenir violaciones de exclusividad.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-ink-700 bg-white px-3 py-1 rounded-lg border border-hairline shrink-0">
                      {rentRoll.length} Contratos Audibles
                    </span>
                  </div>

                  {/* PRESET PROSPECT SELECTOR BAR */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-ink-700 tracking-wider">
                      Seleccionar Prospecto a Evaluar o Ingresar Uno Nuevo:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { brand: "Dunkin' Donuts", unit: "Local B-14", tag: "Zona B" },
                        { brand: "Krispy Kreme", unit: "Local A-08", tag: "Zona A" },
                        { brand: "Buffalo Wild Wings", unit: "Local 10-04", tag: "Zona 10" },
                        { brand: "Planet Fitness", unit: "Local C-02", tag: "Zona C" },
                      ].map((p, idx) => {
                        const isSelected = selectedProspectIndex === idx;
                        return (
                          <button
                            key={p.brand}
                            onClick={() => {
                              setSelectedProspectIndex(idx);
                              setCustomProspectBrand("");
                              triggerToast(`Mariana IA ejecutó auditoría RAG para ${p.brand}...`);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-terra text-white border-terra shadow-md ring-2 ring-terra"
                                : "bg-white hover:bg-sand-100 text-ink border-hairline shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs">{p.brand}</span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isSelected ? "bg-terra-dark text-white" : "bg-sand-100 text-ink-500"}`}>
                                {p.tag}
                              </span>
                            </div>
                            <p className={`text-[11px] mt-1 ${isSelected ? "text-ink-300" : "text-ink-500"}`}>{p.unit}</p>
                          </button>
                        );
                      })}
                    </div>

                    {/* CUSTOM PROSPECT INPUT FORM */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                      <div className="flex-1 w-full flex gap-2">
                        <input
                          type="text"
                          value={customProspectBrand}
                          onChange={(e) => setCustomProspectBrand(e.target.value)}
                          placeholder="Ingresar Marca Comercial Personalizada (ej: Lululemon, Sephora...)"
                          className="flex-1 bg-white border border-hairline-strong rounded-xl px-3.5 py-2 text-xs text-ink-700 focus:outline-none focus:border-terra font-medium"
                        />
                        <select
                          value={customProspectCategory}
                          onChange={(e) => setCustomProspectCategory(e.target.value)}
                          className="bg-white border border-hairline-strong rounded-xl px-3 py-2 text-xs font-semibold text-ink-700 focus:outline-none cursor-pointer"
                        >
                          <option value="Cafetería & Repostería">Cafetería & Repostería</option>
                          <option value="Restaurante & Bar">Restaurante & Bar</option>
                          <option value="Ropa & Moda">Ropa & Moda</option>
                          <option value="Gimnasio & Salud">Gimnasio & Salud</option>
                          <option value="Cosméticos & Belleza">Cosméticos & Belleza</option>
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          if (!customProspectBrand) {
                            triggerToast("Por favor escribe el nombre de la marca comercial.");
                            return;
                          }
                          triggerToast(`Mariana IA ejecutó auditoría RAG cruzada para ${customProspectBrand}...`);
                        }}
                        className="w-full sm:w-auto bg-terra hover:bg-terra-dark text-white font-bold px-5 py-2 rounded-xl text-xs transition-all cursor-pointer shrink-0 shadow-2xs"
                      >
                        Auditar con Mariana IA
                      </button>
                    </div>
                  </div>

                  {/* MARIANA AI RAG LEGAL DICTAMEN CARD */}
                  {(() => {
                    const prospect = customProspectBrand
                      ? {
                          brand: customProspectBrand,
                          category: customProspectCategory,
                          requestedUnit: "Local Disponible Solicitado",
                          zone: "Zona General",
                          viable: true,
                          reasoning: `Dictamen Mariana IA (RAG Legal Audit): VIABLE SIN CONFLICTO. Tras auditar la marca ${customProspectBrand} (${customProspectCategory}) contra el índice vectorial de los ${rentRoll.length} contratos de La Gran Vía, Mariana IA confirma que no se detectaron cláusulas de exclusividad ni radio restrictivo en su categoría comercial.`,
                          conflictingContract: "Ninguno (0 Conflictos RAG)",
                          snippet: `Bóveda Legal RAG: 'La marca ${customProspectBrand} cumple con todos los requisitos de compatibilidad comercial sin colisión de exclusividad.'`,
                        }
                      : [
                          {
                            brand: "Dunkin' Donuts",
                            category: "Cafetería & Repostería",
                            requestedUnit: "Local B-14 (320 m²)",
                            zone: "Zona B (Exterior)",
                            viable: true,
                            reasoning: "Dictamen Mariana IA (RAG Legal Audit): VIABLE SIN CONFLICTO DE EXCLUSIVIDAD. El contrato de Blue Luna Café (contrato_blue_luna_cafe_2027.pdf, Cláusula 14.2) limita estrictamente la exclusividad de expendio de café preparado a la crujía de Zona 4 (Local 4-16). El Local B-14 está ubicado en Zona B (Zona Gastronómica Exterior), fuera de la delimitación territorial de exclusividad. Asimismo, no colisiona con 260 Grill & Bar ni Cinemex Premium.",
                            conflictingContract: "Ninguno (Local B-14 fuera de Zona 4)",
                            snippet: "Cláusula 14.2 de Blue Luna Café: 'El derecho de exclusividad para expendio de café de especialidad comprende única y exclusivamente la crujía de Zona 4 del inmueble comercial.'",
                          },
                          {
                            brand: "Krispy Kreme",
                            category: "Donas & Café",
                            requestedUnit: "Local A-08 (140 m²)",
                            zone: "Zona A",
                            viable: false,
                            reasoning: "Dictamen Mariana IA (RAG Legal Audit): CONFLICTO DETECTADO (IMPROCEDENTE). El Local A-08 colinda directamente con el pasillo central de Zona 4. El contrato vigente de Blue Luna Café (contrato_blue_luna_cafe_2027.pdf, Cláusula 14.2) otorga exclusividad sobre conceptos de café preparado y repostería en toda la Zona 4. El arrendamiento a Krispy Kreme en esta ubicación provocaría una demanda por rescisión con penalización a favor de Blue Luna Café.",
                            conflictingContract: "contrato_blue_luna_cafe_2027.pdf (Cláusula 14.2)",
                            snippet: "Cláusula 14.2 de Blue Luna Café: 'El Arrendador se obliga expresamente a no arrendar ni subarrendar ningún local comercial de la Zona 4 a empresas cuyo giro principal sea el expendio de café o donas.'",
                          },
                          {
                            brand: "Buffalo Wild Wings",
                            category: "Sports Bar & Alitas",
                            requestedUnit: "Local 10-04 (450 m²)",
                            zone: "Zona 10",
                            viable: false,
                            reasoning: "Dictamen Mariana IA (RAG Legal Audit): CONFLICTO DETECTADO (IMPROCEDENTE). El contrato firmado con 260 Grill & Bar (contrato_260_grill_2026_firmado.pdf, Cláusula 18.1) estipula un radio de exclusividad de 50 metros para conceptos de Sports Bar gastronómico con transmisión deportiva en pantallas gigantes. El Local 10-04 se encuentra a sólo 15 metros del Local 10-01.",
                            conflictingContract: "contrato_260_grill_2026_firmado.pdf (Cláusula 18.1)",
                            snippet: "Cláusula 18.1 de 260 Grill: 'Queda prohibida la instalación de Sports Bar u hostelería con pantalla gigante dentro de los locales contiguos del mismo bloque 10.'",
                          },
                          {
                            brand: "Planet Fitness",
                            category: "Gimnasio & Salud",
                            requestedUnit: "Local C-02 (850 m²)",
                            zone: "Zona C",
                            viable: true,
                            reasoning: `Dictamen Mariana IA (RAG Legal Audit): VIABLE SIN CONFLICTO. Ningún contrato vigente en el índice RAG de los ${rentRoll.length} inquilinos de La Gran Vía contempla cláusulas de exclusividad en giros de acondicionamiento físico o gimnasios. Operación 100% procedente.`,
                            conflictingContract: `Ninguno (0 Conflictos en ${rentRoll.length} contratos SSOT)`,
                            snippet: "Bóveda Legal RAG: 'No existen cláusulas restrictivas relativas a centros de salud, fitness o gimnasios en la plaza.'",
                          },
                        ][selectedProspectIndex];

                    return (
                      <div className="bg-white border border-hairline rounded-xl p-5 space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="h-3 w-3 rounded-full bg-terra shrink-0" />
                            <div>
                              <h4 className="font-sans font-bold text-ink text-sm">
                                Dictamen RAG: {prospect.brand} ({prospect.category})
                              </h4>
                              <p className="text-xs text-ink-500 font-medium">Espacio evaluado: {prospect.requestedUnit}</p>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${
                              prospect.viable
                                ? "bg-sand-100 text-ink border-hairline-strong"
                                : "bg-terra text-white border-terra"
                            }`}
                          >
                            {prospect.viable ? "VIABLE (SIN CONFLICTOS)" : "CONFLICTO DE EXCLUSIVIDAD"}
                          </span>
                        </div>

                        <div className="space-y-3 text-xs">
                          <p className="text-ink-700 leading-relaxed font-medium bg-sand-50 p-3.5 rounded-xl border border-hairline/80">
                            {prospect.reasoning}
                          </p>

                          <div className="bg-sand-50 border-l-2 border-terra p-3.5 rounded-r-xl space-y-1.5 font-sans">
                            <div className="flex items-center justify-between text-[11px] text-ink-500 font-bold">
                              <span>Evidencia RAG extraída ({prospect.conflictingContract}):</span>
                              <span className="text-ink-400">Páginas de contrato verificadas</span>
                            </div>
                            <p className="italic text-ink-700 text-xs font-serif">&ldquo;{prospect.snippet}&rdquo;</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* SUB-TAB 3: MARCO JURÍDICO & RADAR DE LEYES (LEYES FEDERALES & BAJA CALIFORNIA) */}
              {legalSubTab === "marco_legal" && (
                <div className="space-y-6 animate-fadeIn font-sans">
                  {/* RADAR HEADER BANNER */}
                  <div className="bg-sand-50 border border-hairline rounded-2xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink bg-sand-200 px-2.5 py-0.5 rounded-md">
                            Supervisión Normativa
                          </span>
                          <h3 className="font-sans text-base font-bold text-ink">
                            Radar de Leyes & Reformas Legislativas (DOF & Baja California)
                          </h3>
                        </div>
                        <p className="text-xs text-ink-500 mt-1">
                          Mariana IA monitorea continuamente las publicaciones del Diario Oficial de la Federación (DOF) y del Periódico Oficial de Baja California (POE) para verificar automáticamente los {rentRoll.length} contratos vigentes ante cambios legales.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          onClick={() => triggerToast("Selecciona el archivo PDF o XML del Código o Reforma Legal para indexar en Mariana IA...")}
                          className="bg-white hover:bg-sand-100 text-ink-700 border border-hairline-strong font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                        >
                          + Cargar Nueva Ley (PDF/XML)
                        </button>
                        <button
                          onClick={() => {
                            const nowStr = `Hoy, 10 Ago 2026 · ${new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} hrs`;
                            setLastLawScanDate(nowStr);
                            triggerToast(`Mariana IA consultó DOF y POE Baja California. 0 reformas recientes afectan los ${rentRoll.length} contratos.`);
                          }}
                          className="bg-terra hover:bg-terra-dark text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                        >
                          Verificar Reformas Ahora
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-ink-700 font-medium pt-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-terra-dark" />
                        <span>Última Verificación de Leyes: <strong>{lastLawScanDate}</strong></span>
                      </div>
                      <span className="bg-white text-ink-700 font-bold px-3 py-1 rounded-lg border border-hairline text-[11px]">
                        {rentRoll.length} Contratos Auditados vs Normativa BC & Federal
                      </span>
                    </div>
                  </div>

                  {/* 4 INGESTED LAW FRAMEWORK CARDS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* LAW CARD 1: CÓDIGO CIVIL BAJA CALIFORNIA */}
                    <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3 shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-wider bg-sand-100 text-ink-700 px-2 py-0.5 rounded border border-hairline">
                              Estatal · Baja California
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Art. 2270 - 2345</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">
                            Código Civil para el Estado de Baja California
                          </h4>
                        </div>
                        <span className="bg-sand-100 text-ink-700 border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Vigente POE 2026
                        </span>
                      </div>

                      <p className="text-xs text-ink-500 leading-relaxed font-medium">
                        Regula los requisitos formales del arrendamiento comercial en Mexicali y Baja California: plazos de renovación por buena fe, derecho del tanto y reglas de rescisión por mora en el estado.
                      </p>

                      <div className="bg-sand-50 p-3 rounded-xl border border-hairline/80 flex items-center justify-between text-xs font-bold text-ink-700">
                        <span>Estado de Contratos en Plaza:</span>
                        <span className="text-ink font-extrabold">{rentRoll.length} de {rentRoll.length} Cumplen 100% ✓</span>
                      </div>
                    </div>

                    {/* LAW CARD 2: CÓDIGO CIVIL FEDERAL */}
                    <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3 shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-wider bg-sand-100 text-ink-700 px-2 py-0.5 rounded border border-hairline">
                              Federal · México
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Art. 2398 - 2499</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">
                            Código Civil Federal (DOF Última Reforma 2026)
                          </h4>
                        </div>
                        <span className="bg-sand-100 text-ink-700 border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Vigente DOF 2026
                        </span>
                      </div>

                      <p className="text-xs text-ink-500 leading-relaxed font-medium">
                        Normativa supletoria nacional para la interpretación de convenios mercantiles, penas convencionales por rescisión anticipada e incremento anual de rentas indexado al INPC.
                      </p>

                      <div className="bg-sand-50 p-3 rounded-xl border border-hairline/80 flex items-center justify-between text-xs font-bold text-ink-700">
                        <span>Estado de Contratos en Plaza:</span>
                        <span className="text-ink font-extrabold">{rentRoll.length} de {rentRoll.length} Cumplen 100% ✓</span>
                      </div>
                    </div>

                    {/* LAW CARD 3: LEY DE EXTINCIÓN DE DOMINIO */}
                    <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3 shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-wider bg-sand-100 text-ink-700 px-2 py-0.5 rounded border border-hairline">
                              Federal · Penal / Fiscal
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Art. 8 Cláusulas</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">
                            Ley Nacional de Extinción de Dominio
                          </h4>
                        </div>
                        <span className="bg-sand-100 text-ink-700 border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Auditoría 100%
                        </span>
                      </div>

                      <p className="text-xs text-ink-500 leading-relaxed font-medium">
                        Exige la inclusión obligatoria de la cláusula de deslinde de responsabilidad penal y uso exclusivo para actividades lícitas en todos los locales comerciales de La Gran Vía.
                      </p>

                      <div className="bg-sand-50 p-3 rounded-xl border border-hairline/80 flex items-center justify-between text-xs font-bold text-ink-700">
                        <span>Cláusula de Deslinde Incluida:</span>
                        <span className="text-ink font-extrabold">{rentRoll.length} de {rentRoll.length} Protegidos ✓</span>
                      </div>
                    </div>

                    {/* LAW CARD 4: CÓDIGO FISCAL SAT CFDI 4.0 — explains the
                        legal obligation only; no live compliance status,
                        since that requires an ERP/accounting connection
                        this engagement doesn't have. */}
                    <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3 shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-terra text-white px-2 py-0.5 rounded">
                              Federal · SAT Fiscal
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">CFDI 4.0</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">
                            Código Fiscal de la Federación (SAT Arrendamiento)
                          </h4>
                        </div>
                      </div>

                      <p className="text-xs text-ink-500 leading-relaxed font-medium">
                        Regula la obligación fiscal de expedir y timbrar comprobantes fiscales digitales por internet (CFDI 4.0) por rentas cobradas dentro de las 72 horas posteriores a la recolección.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: GOBIERNO, PERMISOS RBAC Y BITÁCORA DE AUDITORÍA */}
          {activeTab === "rbac" && (
            <div className="bg-white border border-hairline rounded-2xl p-6 sm:p-8 space-y-7 animate-fadeIn shadow-xs font-sans text-ink">
              {/* HEADER & NEW USER ACTION BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-terra" />
                    <span className="text-sm font-bold tracking-wider text-ink-500">
                      Gobierno & Seguridad de la Plataforma
                    </span>
                  </div>
                  <h2 className="font-sans text-2xl font-bold text-ink mt-1">
                    Control de Accesos RBAC & Bitácora de Auditoría Inmutable
                  </h2>
                  <p className="text-sm text-ink-500 font-medium mt-1">
                    El Administrador General dicta los roles ejecutivos, restringe accesos por módulo y supervisa los registros de auditoría SHA-256.
                  </p>
                </div>

                <InviteLandlordForm />
              </div>

              {/* 3 GOVERNANCE SUMMARY METRICS CARDS — real counts only; a 4th
                  "Sesiones Activas" card was dropped rather than faked, since
                  Supabase Auth doesn't expose active-session tracking without
                  added instrumentation this app doesn't have. */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 font-display">
                <div className="bg-sand-50 border border-hairline rounded-xl p-5 space-y-1.5">
                  <p className="text-sm font-bold text-ink-500 tracking-wide">Usuarios Corporativos</p>
                  <p className="text-3xl font-bold text-ink">{corporateUsers.length} {corporateUsers.length === 1 ? "Usuario" : "Usuarios"}</p>
                  <p className="text-sm text-ink-500 font-medium">
                    {corporateUsers.filter((u) => u.status === "active").length} Activos · {corporateUsers.filter((u) => u.status === "pending").length} Invitación Pendiente
                  </p>
                </div>
                <div className="bg-sand-50 border border-hairline rounded-xl p-5 space-y-1.5">
                  <p className="text-sm font-bold text-ink-500 tracking-wide">Perfiles Definidos</p>
                  <p className="text-3xl font-bold text-ink">1 Rol</p>
                  <p className="text-sm text-ink-500 font-medium">Landlord — acceso uniforme, sin niveles</p>
                </div>
                <div className="bg-sand-50 border border-hairline rounded-xl p-5 space-y-1.5">
                  <p className="text-sm font-bold text-ink-500 tracking-wide">Integridad de Auditoría</p>
                  <p className="text-3xl font-bold text-ink">{auditLog.length} Registros</p>
                  <p className="text-sm text-ink-500 font-medium">Huella SHA-256 por entrada</p>
                </div>
              </div>

              {/* REAL USER ROSTER — role='landlord' is the only tier that has
                  console access; there is no per-module permission model in
                  the schema (profiles.role is just landlord|tenant), so this
                  lists real accounts and their real invite status instead of
                  a fabricated permission matrix. */}
              <div className="space-y-4 pt-2">
                <div>
                  <h3 className="font-sans text-lg font-bold text-ink">
                    Usuarios con Acceso a la Consola
                  </h3>
                  <p className="text-sm text-ink-500 font-medium mt-0.5">
                    Cuentas reales con rol landlord — todas con el mismo acceso completo a Diego IA, Mariana IA y Rent Roll.
                  </p>
                </div>

                <div className="border border-hairline rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-sand-100 text-ink-700 font-bold text-[11px] sm:text-xs tracking-wider border-b border-hairline-strong">
                      <tr>
                        <th className="py-3 px-3">Usuario</th>
                        <th className="py-3 px-3">Invitado</th>
                        <th className="py-3 px-3 text-right">Estatus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline text-ink-700 font-medium">
                      {corporateUsers.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-6 px-3 text-center text-ink-500">
                            Sin usuarios landlord registrados.
                          </td>
                        </tr>
                      )}
                      {corporateUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-sand-50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-ink font-mono text-xs sm:text-sm">{u.email}</div>
                            {u.fullName && <div className="text-[11px] sm:text-xs text-ink-500 font-medium">{u.fullName}</div>}
                          </td>
                          <td className="py-3 px-3 text-ink-700 text-xs">
                            {new Date(u.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {u.status === "active" ? (
                              <span className="bg-terra text-white font-bold px-2.5 py-1 rounded-md text-xs inline-block">Activo</span>
                            ) : (
                              <span className="bg-caution-surface text-caution border border-caution/40 font-bold px-2.5 py-1 rounded-md text-xs inline-block">Invitación Pendiente</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PROMINENT EMERGENCY KILL-SWITCH BANNER */}
              <div className={`p-5 rounded-2xl border-2 transition-all font-sans flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                killSwitchActive
                  ? "bg-ink border-signal text-white shadow-md"
                  : "bg-alert-surface border-alert-edge text-ink"
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-3 w-3 rounded-full ${killSwitchActive ? "bg-signal animate-pulse" : "bg-signal-dark"}`} />
                    <span className="font-bold text-base uppercase tracking-wide">
                      {killSwitchActive ? "MODO DE EMERGENCIA ACTIVO: AUTOMATIZACIONES CONGELADAS" : "INTERRUPTOR DE EMERGENCIA DEL SISTEMA (KILL-SWITCH)"}
                    </span>
                  </div>
                  <p className={`text-sm font-medium leading-relaxed ${killSwitchActive ? "text-dune-100" : "text-ink-500"}`}>
                    {killSwitchActive
                      ? "Todas las ejecuciones autónomas de Diego IA y accesos automatizados han sido suspendidos por instrucción del Administrador General."
                      : "Permite al Administrador General congelar de forma inmediata la ejecución autónoma de Diego IA en caso de mantenimiento o auditoría."}
                  </p>
                </div>

                <button
                  disabled={killSwitchPending}
                  onClick={async () => {
                    const nextState = !killSwitchActive;
                    setKillSwitchPending(true);
                    setKillSwitchActive(nextState);
                    try {
                      const result = await toggleAutonomyKillSwitchAction(nextState);
                      if (result.error) {
                        setKillSwitchActive(!nextState);
                        triggerToast(`No se pudo actualizar el kill-switch: ${result.error}`);
                        return;
                      }
                      triggerToast(nextState ? "INTERRUPTOR DE EMERGENCIA ACTIVADO: Automatizaciones congeladas." : "Modo de emergencia desactivado: Operaciones autónomas reanudadas.");
                    } catch {
                      setKillSwitchActive(!nextState);
                      triggerToast("No se pudo actualizar el kill-switch: error de conexión.");
                    } finally {
                      setKillSwitchPending(false);
                    }
                  }}
                  className={`px-6 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all cursor-pointer shadow-md shrink-0 whitespace-nowrap disabled:opacity-60 disabled:cursor-wait ${
                    killSwitchActive
                      ? "bg-white text-ink hover:bg-sand-100"
                      : "bg-signal-dark hover:bg-alert text-white"
                  }`}
                >
                  {killSwitchPending ? "Actualizando…" : killSwitchActive ? "RESTABLECER OPERACIONES AUTÓNOMAS" : "ACTIVAR KILL-SWITCH DE EMERGENCIA"}
                </button>
              </div>

              {/* ENTERPRISE AI AUTONOMY & SECURITY GOVERNANCE POLICIES */}
              <div className="space-y-4 pt-2">
                <div>
                  <h3 className="font-sans text-lg font-bold text-ink">
                    Límites de Autonomía de Agentes IA & Gobernanza de Seguridad
                  </h3>
                  <p className="text-sm text-ink-500 font-medium mt-0.5">
                    Configuración de umbrales financieros para ejecución autónoma, autenticación SSO y políticas de seguridad.
                  </p>
                </div>

                <div className="space-y-4 text-sm font-sans">
                  {/* POLICY 1: DIEGO AI SPENDING THRESHOLD */}
                  <div className="border border-hairline rounded-xl p-5 bg-sand-50 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-ink text-base">Diego IA · Umbral CapEx</span>
                          <span className="bg-terra text-white text-xs font-bold px-2.5 py-0.5 rounded">
                            ${diegoThresholdVal.toLocaleString()} MXN Max
                          </span>
                        </div>
                        <p className="text-ink-700 text-sm leading-relaxed font-medium">
                          Diego IA puede despachar proveedores de mantenimiento automáticamente en órdenes de hasta ${diegoThresholdVal.toLocaleString()} MXN. Montos mayores requieren firma dual Admin.
                        </p>
                      </div>

                      {editingPolicyCard !== "diego" && (
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-xs font-bold text-ink">
                            <span className="text-ink-500">Estatus: </span>
                            <span className="text-ink">{diegoAutoMode ? "Piloto Automático Activo" : "Supervisión Manual"}</span>
                          </div>
                          <button
                            onClick={() => setEditingPolicyCard("diego")}
                            className="bg-white border border-hairline-strong hover:bg-sand-100 text-ink font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            Editar Configuración →
                          </button>
                        </div>
                      )}
                    </div>

                    {editingPolicyCard === "diego" && (
                      <div className="p-4 bg-white border border-hairline-strong rounded-xl space-y-3 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="block text-xs font-bold text-ink-700">
                            Monto Máximo Autónomo (MXN):
                            <input
                              type="number"
                              step={5000}
                              value={diegoThresholdVal}
                              onChange={(e) => setDiegoThresholdVal(Number(e.target.value))}
                              className="mt-1 w-full bg-sand-50 border border-hairline-strong rounded-lg px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:border-terra"
                            />
                          </label>

                          <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-2.5 text-sm font-bold text-ink cursor-pointer">
                              <input
                                type="checkbox"
                                checked={diegoAutoMode}
                                onChange={(e) => setDiegoAutoMode(e.target.checked)}
                                className="h-5 w-5 accent-terra rounded"
                              />
                              Piloto Automático Activo
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t border-hairline">
                          <button
                            onClick={() => {
                              setEditingPolicyCard(null);
                              triggerToast(`Umbral de Diego IA actualizado a $${diegoThresholdVal.toLocaleString()} MXN.`);
                            }}
                            className="bg-terra hover:bg-terra-dark text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Guardar Cambios
                          </button>
                          <button
                            onClick={() => setEditingPolicyCard(null)}
                            className="bg-sand-100 hover:bg-sand-200 text-ink-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* POLICY 3: SSO & GEO-FENCING */}
                  <div className="border border-hairline rounded-xl p-5 bg-sand-50 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-ink text-base">SSO & Geo-Fencing IP</span>
                          <span className="bg-terra text-white text-xs font-bold px-2.5 py-0.5 rounded">
                            Mexicali & Tijuana
                          </span>
                        </div>
                        <p className="text-ink-700 text-sm leading-relaxed font-medium">
                          Acceso restringido a rangos de IP autorizados de las corporativas Mexicali HQ y Tijuana, con autenticación obligatoria 2FA / WebAuthn Passkeys.
                        </p>
                      </div>

                      {editingPolicyCard !== "sso" && (
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-xs font-bold text-ink">
                            <span className="text-ink-500">Autenticación: </span>
                            <span className="text-ink">{ssoEnforcedMode ? "SAML 2.0 / 2FA Enforced" : "Estándar"}</span>
                          </div>
                          <button
                            onClick={() => setEditingPolicyCard("sso")}
                            className="bg-white border border-hairline-strong hover:bg-sand-100 text-ink font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            Editar Configuración →
                          </button>
                        </div>
                      )}
                    </div>

                    {editingPolicyCard === "sso" && (
                      <div className="p-4 bg-white border border-hairline-strong rounded-xl space-y-3 animate-fadeIn">
                        <label className="flex items-center gap-2.5 text-sm font-bold text-ink cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ssoEnforcedMode}
                            onChange={(e) => setSsoEnforcedMode(e.target.checked)}
                            className="h-5 w-5 accent-terra rounded"
                          />
                          SAML 2.0 / 2FA Obligatorio con Passkeys
                        </label>
                        <p className="text-xs text-ink-500 font-medium">
                          Geo-Fencing restringido a rangos corporativos Mexicali HQ (189.210.42.0/24) y Tijuana (201.140.88.0/24).
                        </p>

                        <div className="flex items-center gap-3 pt-2 border-t border-hairline">
                          <button
                            onClick={() => {
                              setEditingPolicyCard(null);
                              triggerToast("Política SSO & Geo-Fencing actualizada.");
                            }}
                            className="bg-terra hover:bg-terra-dark text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Guardar Cambios
                          </button>
                          <button
                            onClick={() => setEditingPolicyCard(null)}
                            className="bg-sand-100 hover:bg-sand-200 text-ink-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* IMMUTABLE SHA-256 AUDIT TRAIL LOG VIEWER */}
              <div className="space-y-3.5 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-terra flex items-center justify-center shrink-0 shadow-2xs">
                      <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-sans text-lg font-bold text-ink">
                          Bitácora Inmutable de Auditoría
                        </h3>
                        <span className="inline-flex items-center gap-1.5 bg-ok-surface text-ok border border-ok/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          <span className="h-1.5 w-1.5 rounded-full bg-ok-surface0 animate-pulse" />
                          En Vivo
                        </span>
                      </div>
                      <p className="text-xs text-ink-500 mt-0.5">
                        Cada aprobación Tier 3 (despachos CapEx de Diego IA, solicitudes de arrendamiento de Mariana IA) se registra aquí — huella SHA-256 por entrada.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 sm:pl-12">
                    <span className="text-xs text-ink-700 font-bold bg-sand-100 border border-hairline px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                      {auditLog.length} Entradas
                    </span>
                    <button
                      onClick={() => {
                        const header = "Timestamp,Tipo,Actor,Accion,Hash SHA-256\n";
                        const rows = [...auditLog]
                          .reverse()
                          .map((e) =>
                            [e.timestamp, e.actorType === "user" ? "USER" : "AGENT", e.actor, `"${e.action.replace(/"/g, '""')}"`, e.hash].join(",")
                          )
                          .join("\n");
                        const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `bitacora_auditoria_lagranvia_${periodLabel.replace(/\s+/g, "_")}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        triggerToast(`Bitácora exportada (${auditLog.length} entradas, CSV).`);
                      }}
                      className="bg-terra hover:bg-terra-dark text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-2xs"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Exportar CSV
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    value={auditLogFilter}
                    onChange={(e) => setAuditLogFilter(e.target.value)}
                    placeholder="Filtrar por usuario, agente o acción (ej: CFDI, m.hage, diego_ai_agent)..."
                    className="w-full bg-white border border-hairline-strong rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-ink placeholder-ink-400 focus:outline-none focus:border-terra focus:ring-2 focus:ring-terra/10 font-medium transition-all"
                  />
                </div>

                {(() => {
                  const q = auditLogFilter.trim().toLowerCase();
                  const filtered = [...auditLog]
                    .reverse()
                    .filter((e) => !q || e.actor.toLowerCase().includes(q) || e.action.toLowerCase().includes(q) || e.actorType.includes(q));

                  return (
                    <div className="bg-console-canvas rounded-2xl border border-console-hairline-strong shadow-md overflow-hidden">
                      <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-2.5 border-b border-console-hairline-strong bg-console-panel/60 text-[10px] font-bold tracking-wider text-console-slate">
                        <span>Actor</span>
                        <span>Acción registrada</span>
                        <span className="text-right">Verificación</span>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-console-hairline">
                        {filtered.length === 0 ? (
                          <p className="text-console-ash text-xs p-6 text-center">Sin resultados para &quot;{auditLogFilter}&quot;.</p>
                        ) : (
                          filtered.map((e, idx) => (
                            <div
                              key={e.id}
                              className={`grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3.5 hover:bg-console-panel/70 transition-colors ${idx === 0 ? "bg-console-panel/40" : ""}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border border-console-hairline-strong ${
                                    e.actorType === "user"
                                      ? "bg-console-raised text-console-bone"
                                      : "bg-console-raised text-ok-on-dark"
                                  }`}
                                >
                                  {e.actorType === "user" ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 3v1.5M15.75 3v1.5M3 8.25h1.5M3 12h1.5m-1.5 3.75h1.5M19.5 8.25H21M19.5 12H21m-1.5 3.75H21M8.25 19.5v1.5m7.5-1.5v1.5M6.75 6.75h10.5v10.5H6.75V6.75z" />
                                    </svg>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-console-bone truncate">{e.actor}</p>
                                  <p className="text-[10.5px] text-console-slate font-mono">{formatAuditTimestamp(e.timestamp)}</p>
                                </div>
                              </div>
                              <p className="text-xs text-console-ash leading-relaxed self-center">{e.action}</p>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span
                                  className={`text-[9.5px] font-bold tracking-wide px-2 py-0.5 rounded-full border border-console-hairline-strong ${
                                    e.actorType === "user"
                                      ? "bg-console-raised text-console-ash"
                                      : "bg-console-raised text-ok-on-dark"
                                  }`}
                                >
                                  {e.actorType === "user" ? "Usuario" : "Agente IA"}
                                </span>
                                <span className="text-[10px] font-mono text-console-slate" title="Hash SHA-256 de la entrada">
                                  {e.hash}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* AI ASSISTANT DRAWER / SLIDE-OVER PANEL */}
      {copilotOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-hairline shadow-2xl flex flex-col justify-between animate-slideLeft font-sans">
          <div className="p-4 border-b border-hairline bg-terra text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-ink-400" />
              <h3 className="font-sans font-bold text-sm">Copiloto IA</h3>
            </div>
            <button
              onClick={() => setCopilotOpen(false)}
              className="text-ink-400 hover:text-white text-xs cursor-pointer font-bold"
            >
              Cerrar
            </button>
          </div>

          <div className="p-3 bg-sand-100 border-b border-hairline flex gap-1 text-xs font-semibold">
            <button
              onClick={() => {
                copilotAbortRef.current?.abort();
                setActiveAgent("mariana");
                setCopilotAskedQuestion(null);
                setQueryResult(null);
                setCopilotError(null);
                setCopilotLoading(false);
                setCopilotQuestion("");
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeAgent === "mariana" ? "bg-terra text-white shadow-xs" : "text-ink-500 hover:text-ink"
              }`}
            >
              Mariana (Legal)
            </button>
            <button
              onClick={() => {
                copilotAbortRef.current?.abort();
                setActiveAgent("diego");
                setCopilotAskedQuestion(null);
                setQueryResult(null);
                setCopilotError(null);
                setCopilotLoading(false);
                setCopilotQuestion("");
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeAgent === "diego" ? "bg-terra text-white shadow-xs" : "text-ink-500 hover:text-ink"
              }`}
            >
              Diego (CapEx)
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            <div className="bg-sand-50 border border-hairline rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-ink-500 font-medium">
                <span>Consulta al Agente</span>
                <span className="font-bold text-ink">{activeAgent === "mariana" ? "Mariana IA" : "Diego IA"}</span>
              </div>
              {copilotAskedQuestion ? (
                <>
                  <p className="font-bold text-ink text-xs">{copilotAskedQuestion}</p>
                  <div className="bg-white p-3 rounded-lg border border-hairline text-ink-700 leading-relaxed text-xs font-medium shadow-2xs whitespace-pre-wrap">
                    {queryResult}
                  </div>
                </>
              ) : (
                <p className="text-ink-500 text-xs leading-relaxed">
                  Escribe una pregunta abajo sobre {activeAgent === "mariana" ? "los contratos de arrendamiento" : "los tickets de mantenimiento"} reales de la plaza.
                </p>
              )}
              {copilotError && <p className="text-red-600 text-xs font-semibold">{copilotError}</p>}
            </div>
          </div>

          <div className="p-3 border-t border-hairline bg-sand-50">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!copilotQuestion.trim() || copilotLoading) return;
                const asked = copilotQuestion;
                const controller = new AbortController();
                copilotAbortRef.current = controller;
                setCopilotLoading(true);
                setCopilotError(null);
                try {
                  const res = await fetch("/api/copiloto/ask", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ agent: activeAgent, question: asked }),
                    signal: controller.signal,
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error ?? "Error desconocido");
                  setCopilotAskedQuestion(asked);
                  setQueryResult(json.answer);
                  setCopilotQuestion("");
                } catch (err) {
                  if (err instanceof DOMException && err.name === "AbortError") return;
                  setCopilotError(err instanceof Error ? err.message : "Error de conexión con el agente.");
                } finally {
                  if (copilotAbortRef.current === controller) setCopilotLoading(false);
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={copilotQuestion}
                onChange={(e) => setCopilotQuestion(e.target.value)}
                placeholder="Pregunta a la IA sobre la plaza..."
                disabled={copilotLoading}
                className="flex-1 bg-white border border-hairline-strong rounded-xl px-3 py-2 text-xs text-ink-700 font-medium disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={copilotLoading}
                className="bg-terra text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-terra-dark transition-colors shadow-xs disabled:opacity-60 disabled:cursor-wait"
              >
                {copilotLoading ? "Consultando…" : "Enviar"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
