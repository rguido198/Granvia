"use client";

import { useState, Fragment } from "react";
import type {
  ConsoleData,
} from "@/lib/console-data";

type SidebarTab = "analytics" | "rentroll" | "cam" | "maint" | "legal" | "erp" | "rbac";

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
 * SVG Sparkline Curve for Metric Cards (Monochrome & Understated)
 */
function Sparkline({ data, color = "#0F172A" }: { data: number[]; color?: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * 120;
      const y = 32 - ((val - min) / range) * 26;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="w-24 h-8 overflow-visible" viewBox="0 0 120 32">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,32 ${points} 120,32`}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/**
 * Institutional 12-Month Revenue & Collection Dual Line Chart (Achromatic Slate)
 */
function RevenueTrendChart({ currency = "MXN", exchangeRate = 17.50 }: { currency?: "MXN" | "USD"; exchangeRate?: number }) {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const contracted = [2.70, 2.75, 2.80, 2.85, 2.90, 2.94, 2.96, 2.989, 2.989, 2.995, 3.010, 3.025];
  const collected = [2.62, 2.70, 2.76, 2.82, 2.88, 2.92, 2.94, 2.912, 2.950, 2.970, 2.990, 3.010];
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(7); // Default August
  const [selectedQuarter, setSelectedQuarter] = useState<"Q1" | "Q2" | "Q3" | "Q4" | null>(null);

  const width = 640;
  const height = 210;
  const paddingX = 40;
  const paddingY = 20;

  const minVal = 2.5;
  const maxVal = 3.1;

  const getX = (i: number) => paddingX + (i / (months.length - 1)) * (width - 2 * paddingX);
  const getY = (v: number) => height - paddingY - ((v - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);

  const isMonthInQuarter = (i: number) => {
    if (!selectedQuarter) return true;
    if (selectedQuarter === "Q1") return i >= 0 && i <= 2;
    if (selectedQuarter === "Q2") return i >= 3 && i <= 5;
    if (selectedQuarter === "Q3") return i >= 6 && i <= 8;
    if (selectedQuarter === "Q4") return i >= 9 && i <= 11;
    return true;
  };

  const toggleQuarter = (q: "Q1" | "Q2" | "Q3" | "Q4") => {
    if (selectedQuarter === q) {
      setSelectedQuarter(null);
    } else {
      setSelectedQuarter(q);
      const midMonths: Record<string, number> = { Q1: 1, Q2: 4, Q3: 7, Q4: 10 };
      setHoveredIdx(midMonths[q]);
    }
  };

  const contractedPoints = contracted.map((v, i) => `${getX(i)},${getY(v)}`).join(" ");
  const collectedPoints = collected.map((v, i) => `${getX(i)},${getY(v)}`).join(" ");

  const formatM = (valM: number) => {
    if (currency === "USD") {
      const usdM = valM / exchangeRate;
      return `$${usdM.toFixed(2)}M USD`;
    }
    return `$${valM.toFixed(2)}M`;
  };

  const formatK = (valM: number) => {
    if (currency === "USD") {
      const usdK = (valM * 1000000) / exchangeRate / 1000;
      return `$${Math.round(usdK)}k USD`;
    }
    return `$${valM.toFixed(2)}M`;
  };

  return (
    <div className="h-full flex flex-col justify-between space-y-4 font-sans">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans text-sm font-bold text-slate-900 tracking-tight">Actividad de Cobranza vs Facturación</h3>
              {selectedQuarter && (
                <button
                  onClick={() => setSelectedQuarter(null)}
                  className="text-[10.5px] font-bold bg-slate-900 text-white px-2.5 py-0.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Filtrando {selectedQuarter} (Click para resetear) ✕
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedQuarter
                ? `Mostrando únicamente los meses de ${selectedQuarter} en el gráfico`
                : `Tendencia mensual de Renta Base ${currency === "USD" ? "(Traducido a USD @ $17.50)" : "en Millones (2026)"}`}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
              Facturado
            </span>
            <span className="flex items-center gap-1.5 text-slate-900 font-bold">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
              Recaudado
            </span>
          </div>
        </div>

        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[480px]">
            {[2.6, 2.8, 3.0].map((level) => (
              <g key={level}>
                <line
                  x1={paddingX}
                  y1={getY(level)}
                  x2={width - paddingX}
                  y2={getY(level)}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                />
                <text x="5" y={getY(level) + 4} className="text-[10px] fill-slate-400 font-medium">
                  {formatM(level)}
                </text>
              </g>
            ))}

            <polyline
              fill="none"
              stroke="#64748B"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={contractedPoints}
              opacity={selectedQuarter ? 0.35 : 1}
            />

            <polyline
              fill="none"
              stroke="#0F172A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={collectedPoints}
              opacity={selectedQuarter ? 0.35 : 1}
            />

            {months.map((m, i) => {
              const cx = getX(i);
              const cyCol = getY(collected[i]);
              const cyCon = getY(contracted[i]);
              const isHovered = hoveredIdx === i;
              const inSelectedQuarter = isMonthInQuarter(i);

              return (
                <g
                  key={m}
                  className="cursor-pointer transition-all"
                  style={{ opacity: inSelectedQuarter ? 1 : 0.2 }}
                  onMouseEnter={() => setHoveredIdx(i)}
                >
                  {isHovered && (
                    <line
                      x1={cx}
                      y1={paddingY}
                      x2={cx}
                      y2={height - paddingY}
                      stroke="#0F172A"
                      strokeDasharray="2 2"
                      strokeWidth="2"
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cyCol}
                    r={isHovered ? 6 : inSelectedQuarter ? 4.5 : 3}
                    className={`${inSelectedQuarter ? "fill-slate-900" : "fill-slate-400"} stroke-white stroke-2 transition-all`}
                  />
                  <circle
                    cx={cx}
                    cy={cyCon}
                    r={isHovered ? 6 : inSelectedQuarter ? 4.5 : 3}
                    className={`${inSelectedQuarter ? "fill-slate-600" : "fill-slate-300"} stroke-white stroke-2 transition-all`}
                  />
                  <text
                    x={cx}
                    y={height - 4}
                    textAnchor="middle"
                    className={`text-[11px] transition-colors ${
                      isHovered || inSelectedQuarter ? "fill-slate-900 font-bold" : "fill-slate-400 font-medium"
                    }`}
                  >
                    {m}
                  </text>
                </g>
              );
            })}
          </svg>

          {hoveredIdx !== null && (
            <div
              className="absolute top-2 bg-slate-900 text-white rounded-xl p-3 text-xs shadow-xl border border-slate-700 pointer-events-none transition-all"
              style={{
                left: `${(hoveredIdx / (months.length - 1)) * 75 + 10}%`,
              }}
            >
              <p className="font-bold text-slate-200 mb-0.5">{months[hoveredIdx]} 2026</p>
              <p className="text-white font-bold">Recaudado: {formatM(collected[hoveredIdx])}</p>
              <p className="text-slate-400 font-medium">Facturado: {formatM(contracted[hoveredIdx])}</p>
            </div>
          )}
        </div>
      </div>

      {/* EXECUTIVE INTERACTIVE QUARTERLY BREAKDOWN & NOI AUDIT FOOTER */}
      <div className="pt-3 border-t border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Rendimiento Financiero Trimestral (2026)
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Haz click en cualquier trimestre para filtrar el gráfico interactivo arriba.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-300 shrink-0">
            Meta Anual: {currency === "USD" ? "$1.99M USD" : "$34.8M MXN"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { q: "Q1", label: "Q1 2026", status: "Real", val: 8.25, eff: "98.2% Eficiencia", months: "Ene - Mar" },
            { q: "Q2", label: "Q2 2026", status: "Real", val: 8.59, eff: "99.1% Eficiencia", months: "Abr - Jun" },
            { q: "Q3", label: "Q3 2026", status: "En Cierre", val: 8.94, eff: "98.8% Eficiencia", months: "Jul - Sep" },
            { q: "Q4", label: "Q4 2026", status: "Proyectado", val: 9.03, eff: "100% Proyección", months: "Oct - Dic" },
          ].map((item) => {
            const isSelected = selectedQuarter === item.q;
            return (
              <div
                key={item.q}
                onClick={() => toggleQuarter(item.q as "Q1" | "Q2" | "Q3" | "Q4")}
                className={`rounded-xl p-3.5 space-y-1.5 transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900 transform scale-[1.02]"
                    : "bg-slate-50 hover:bg-slate-100/90 border-slate-300 text-slate-900 shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? "text-slate-200" : "text-slate-700"}`}>
                    {item.label}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isSelected
                        ? "bg-white text-slate-900"
                        : "bg-slate-200 text-slate-800 border border-slate-300"
                    }`}
                  >
                    {isSelected ? "Filtrando ✓" : item.status}
                  </span>
                </div>
                <p className={`text-lg font-extrabold tracking-tight tabular-nums ${isSelected ? "text-white" : "text-slate-900"}`}>
                  {formatK(item.val)}
                </p>
                <div className="flex items-center justify-between text-[11px] font-semibold pt-0.5">
                  <span className={isSelected ? "text-slate-300" : "text-slate-600"}>{item.eff}</span>
                  <span className={isSelected ? "text-slate-400" : "text-slate-400"}>{item.months}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700 font-semibold">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
            <span><strong>NOI Operating Margin:</strong> 82.4% ({currency === "USD" ? "$140k USD" : "$2.46M MXN"} mensual neto)</span>
          </div>
          <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-300">
            Auditoría IA: 100% OK
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Landlord Asset Management Console Component
 */
export function LandlordDashboard({ data }: { data: ConsoleData }) {
  const {
    rentRoll,
    camRows,
    camMonthlyPool,
    leasedSqm,
    plazaTotalGla,
    contractedRent,
    fiscalAlertRent,
    occupancyRate,
    collectionRate,
    tenantsAlDia,
    tenantsWithAlert,
    leasingApplicants,
    criticalEquipment,
    capexCases,
    capexRejected,
    capexWarrantyRecovered,
    technicianRoster,
    maintenanceEvents,
    periodLabel,
    marianaReplies,
    diegoReplies,
    renataReplies,
  } = data;

  // View & Filter States
  const [activeTab, setActiveTab] = useState<SidebarTab>("analytics");
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

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [invoiceSourceFilter, setInvoiceSourceFilter] = useState<"ALL" | "ERP" | "MANUAL" | "TENANT">("ALL");
  const [isEditingRentRoll, setIsEditingRentRoll] = useState(false);

  // AI Copilot Drawer State
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState<"renata" | "mariana" | "diego">("renata");
  const [userQuery, setUserQuery] = useState("");
  const [queryResult, setQueryResult] = useState<string | null>(null);

  // Interactive AI Action States & Simulations
  const [cfdiIssued, setCfdiIssued] = useState(false);
  const [attorneyNotified, setAttorneyNotified] = useState(false);
  const [hvacDispatched, setHvacDispatched] = useState(false);
  const [warrantyCategoryFilter, setWarrantyCategoryFilter] = useState<string>("ALL");

  // Diego AI Maintenance Calendar States
  const [eventApprovals, setEventApprovals] = useState<Record<string, boolean>>({});
  const [eventNotified, setEventNotified] = useState<Record<string, boolean>>({});
  const [approvalConfirmEventId, setApprovalConfirmEventId] = useState<string | null>(null);

  // Accessibility Font Scale State
  const [fontSizeLevel, setFontSizeLevel] = useState<"normal" | "large" | "xlarge">("normal");

  // Governance Policy Edit States
  const [editingPolicyCard, setEditingPolicyCard] = useState<null | "diego" | "renata" | "sso">(null);
  const [camConfirmModal, setCamConfirmModal] = useState<null | "notify" | "sat_erp">(null);
  const [editableCamRows, setEditableCamRows] = useState(camRows);
  const [isEditingCam, setIsEditingCam] = useState(false);

  const handleCamRowChange = (index: number, field: "sqm" | "base" | "admin", valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setEditableCamRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };
      if (field === "sqm") {
        row.sqm = val;
        row.sharePct = plazaTotalGla > 0 ? (val / plazaTotalGla) * 100 : 0;
      } else if (field === "base") {
        row.base = val;
        row.admin = Math.round(val * 0.15);
      } else if (field === "admin") {
        row.admin = val;
      }
      row.iva = Math.round((row.base + row.admin) * 0.16);
      row.total = row.base + row.admin + row.iva;
      updated[index] = row;
      return updated;
    });
  };
  const [editableTechnicianRoster, setEditableTechnicianRoster] = useState(technicianRoster);
  const [isEditingRoster, setIsEditingRoster] = useState(false);

  const handleTechnicianRosterChange = (index: number, field: "contractor" | "contact" | "coverage", val: string) => {
    setEditableTechnicianRoster((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  // CapEx cost Diego kept off the landlord's P&L this month (denied to the tenant + warranty-covered).
  // Excludes APROBADO_PRORRATEO_CAM cases — those route to Renata's CAM pool, not here, so this
  // total never double-counts against Fondo CAM NNN Mensual.
  const diegoProtectedCapex = capexRejected + capexWarrantyRecovered;

  const [diegoThresholdVal, setDiegoThresholdVal] = useState<number>(50000);
  const [diegoAutoMode, setDiegoAutoMode] = useState<boolean>(true);
  const [renataAutoMode, setRenataAutoMode] = useState<boolean>(true);
  const [ssoEnforcedMode, setSsoEnforcedMode] = useState<boolean>(true);
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);

  // Mariana AI Legal Engine States
  const [legalSubTab, setLegalSubTab] = useState<"expedientes" | "consultas" | "prospectos" | "marco_legal">("expedientes");
  const [lastLawScanDate, setLastLawScanDate] = useState("Hoy, 10 Ago 2026 · 06:00 hrs");
  const [selectedProspectIndex, setSelectedProspectIndex] = useState<number>(0);
  const [customProspectBrand, setCustomProspectBrand] = useState("");
  const [customProspectCategory, setCustomProspectCategory] = useState("Cafetería & Repostería");
  const [ragQueryText, setRagQueryText] = useState("");
  const [activeRagQueryResult, setActiveRagQueryResult] = useState<string | null>(null);
  const [inspectedContractId, setInspectedContractId] = useState<string | null>(null);

  // Mariana AI Renewal Draft States — 260 Grill & Bar (Local 10-01)
  const [renewalDraftOpen, setRenewalDraftOpen] = useState(false);
  const [renewalConfirmOpen, setRenewalConfirmOpen] = useState(false);
  const [renewalSent, setRenewalSent] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Immutable Audit Trail — every Tier 3 human-authorized action appends here live,
  // instead of the log being 5 static lines that never reflect what actually happened
  // in the session. Stored oldest-first; rendered newest-first.
  const [auditLog, setAuditLog] = useState(() => [
    { id: "seed-5", timestamp: "14:02:44", actorType: "user" as const, actor: "a.lopez@lagranvia.com.mx", action: "Carga de póliza de mantenimiento ThyssenKrupp 2026.pdf", hash: "sha256_a10984ee29" },
    { id: "seed-4", timestamp: "15:12:00", actorType: "user" as const, actor: "contabilidad@lagranvia.com.mx", action: `Timbrado masivo SAT CFDI 4.0 aprobado para ${rentRoll.length} locales`, hash: "sha256_c773109a11" },
    { id: "seed-3", timestamp: "16:45:19", actorType: "agent" as const, actor: "mariana_ai_agent", action: "Consulta RAG multi-contrato de exclusividades de giro (Cafeterías)", hash: "sha256_f9012a44b8" },
    { id: "seed-2", timestamp: "17:58:02", actorType: "agent" as const, actor: "diego_ai_agent", action: "Reclamo autónomo expedido a Climas de Mexicali (#HVAC-884)", hash: "sha256_b31289fe12" },
    { id: "seed-1", timestamp: "18:28:12", actorType: "user" as const, actor: "m.hage@lagranvia.com.mx", action: "Cambió permiso 'Diego CapEx' para a.lopez@lagranvia.com.mx", hash: "sha256_e84a92c10f" },
  ]);
  const [auditLogFilter, setAuditLogFilter] = useState("");

  const appendAuditLog = (actorType: "user" | "agent", actor: string, action: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString("es-MX", { hour12: false });
    const hash = "sha256_" + Math.random().toString(16).slice(2, 12);
    setAuditLog((prev) => [...prev, { id: `evt-${prev.length}-${now.getTime()}`, timestamp, actorType, actor, action, hash }]);
  };

  // Filtered Rent Roll Data
  const filteredRentRoll = rentRoll.filter((row) => {
    const matchesSearch =
      row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.zone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "ALL" || row.tag === categoryFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ALERT" && row.fiscalAlert) ||
      (statusFilter === "OK" && !row.fiscalAlert);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;

    const q = userQuery.toLowerCase();
    if (q.includes("260") || q.includes("grill") || q.includes("sat") || q.includes("cfdi") || q.includes("renata")) {
      setActiveAgent("renata");
      setQueryResult(
        "Renata AI (Fiscal & CAM): Inconsistencia detectada en 260 Grill & Bar (Local 10-01). Se registraron $98,500 MXN de cobro sin emisión de complemento CFDI 4.0. Utiliza el botón 'Emitir Complemento SAT' para regularizar."
      );
    } else if (q.includes("contrato") || q.includes("blue luna") || q.includes("dunkin") || q.includes("mariana")) {
      setActiveAgent("mariana");
      setQueryResult(
        "Mariana AI (Legal & Leasing): Conflicto de exclusividad detectado. La solicitud de Dunkin' Donuts viola la Cláusula 14.2 del contrato de Blue Luna Café (Bóveda PDF página 4). Dictamen: RECHAZADO."
      );
    } else if (q.includes("climas") || q.includes("hvac") || q.includes("mantenimiento") || q.includes("diego")) {
      setActiveAgent("diego");
      setQueryResult(
        "Diego AI (CapEx & Ops): Póliza de garantía vigente con Climas de Mexicali para equipo MX-HVAC-9902 (Local A-04). Cobertura al 100% sin costo para la plaza."
      );
    } else {
      setQueryResult(
        `Gran Vía Asset Copilot: Consulta "${userQuery}" procesada. Rent Roll contratado: ${formatMxn(contractedRent)}, Ocupación: ${(occupancyRate * 100).toFixed(1)}%.`
      );
    }
  };

  return (
    <div
      style={{ zoom: fontSizeLevel === "large" ? 1.12 : fontSizeLevel === "xlarge" ? 1.25 : 1 }}
      className={`min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row font-sans antialiased transition-all ${
        fontSizeLevel === "large" ? "scale-font-large" : fontSizeLevel === "xlarge" ? "scale-font-xlarge" : "scale-font-normal"
      }`}
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-semibold animate-slideUp">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer font-bold">
            ✕
          </button>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-full lg:w-72 bg-white border-r border-slate-200/80 shrink-0 flex flex-col justify-between p-5 space-y-6 text-left">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="px-1 py-1 space-y-2">
            <div className="inline-block bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/la-gran-via-logo-horizontal.png"
                alt="La Gran Vía Mexicali"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-slate-500 font-semibold px-0.5">Asset Management Hub · Consola</p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-left">
            <p className="px-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Panel del Portafolio
            </p>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Torre de Control CFO</span>
            </button>

            <button
              onClick={() => setActiveTab("rentroll")}
              className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "rentroll"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Rent Roll & Locales</span>
            </button>

            <p className="px-2 text-xs font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2">
              Gestión & Inteligencia Operativa
            </p>

            <button
              onClick={() => setActiveTab("cam")}
              className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "cam"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Finanzas & Gastos CAM</span>
            </button>

            <button
              onClick={() => setActiveTab("maint")}
              className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "maint"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Mantenimiento & CapEx</span>
            </button>

            <button
              onClick={() => setActiveTab("legal")}
              className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "legal"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Legal, RAG & Exclusividades</span>
            </button>

            <button
              onClick={() => setActiveTab("erp")}
              className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "erp"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Integración ERP SAP</span>
            </button>

            <p className="px-2 text-xs font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2">
              Gobierno & Seguridad
            </p>

            <button
              onClick={() => setActiveTab("rbac")}
              className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === "rbac"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>Control de Acceso RBAC</span>
              <span className="text-xs font-bold bg-slate-200 text-slate-900 px-2 py-0.5 rounded shrink-0 ml-2">Admin</span>
            </button>
          </nav>
        </div>

        {/* Footer Session Badge */}
        <div className="pt-4 border-t border-slate-200 space-y-3 text-left">
          <div
            onClick={() => {
              setActiveTab("rbac");
              triggerToast("Abriendo Consola de Control de Acceso & Permisos RBAC...");
            }}
            className="rounded-xl bg-slate-50 hover:bg-slate-100 p-3.5 space-y-1.5 border border-slate-200 transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center justify-between text-slate-900 font-bold">
              <span className="group-hover:underline font-mono text-xs truncate">m.hage@lagranvia.com.mx</span>
              <span className="h-2.5 w-2.5 rounded-full bg-slate-900 shrink-0 ml-1" />
            </div>
            <p className="text-xs text-slate-600 font-semibold truncate">Administrador General · RBAC →</p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* TOP HEADER BAR */}
        <header className="h-auto min-h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 font-sans shadow-2xs">
          {/* Top Header Title or Left Spacer */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 font-sans">
              La Gran Vía · Consola de Control
            </span>
          </div>

          {/* Controls, Currency Toggle, Accessibility Font Switcher & AI Copilot Drawer Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* ACCESSIBILITY FONT SIZE CONTROLLER */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
              <span className="px-2 text-slate-500 text-xs font-semibold hidden md:inline">Texto:</span>
              <button
                onClick={() => {
                  setFontSizeLevel("normal");
                  triggerToast("Tamaño de texto: Normal");
                }}
                title="Texto Normal"
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                  fontSizeLevel === "normal"
                    ? "bg-slate-900 text-white shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
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
                    ? "bg-slate-900 text-white shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
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
                    ? "bg-slate-900 text-white shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                A++
              </button>
            </div>

            {/* CURRENCY TRANSLATION TOGGLE (MXN DEFAULT / USD AT 17.50 RATE) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-bold shrink-0">
              <button
                onClick={() => {
                  setCurrency("MXN");
                  triggerToast("Moneda establecida en Pesos (MXN).");
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  currency === "MXN"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
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
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                USD ($17.50)
              </button>
            </div>

            <select
              aria-label="Periodo de reporte"
              className="bg-slate-100/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ago-2026">Agosto 2026 (Actual)</option>
              <option value="jul-2026">Julio 2026</option>
              <option value="jun-2026">Junio 2026</option>
              <option value="q3-2026">Q3 2026</option>
              <option value="y-2026">Año 2026 (Full)</option>
            </select>

            <button
              onClick={() => triggerToast("Generando reporte ejecutivo en PDF...")}
              className="hidden sm:flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200/80 transition-colors cursor-pointer shadow-2xs"
            >
              Exportar PDF
            </button>

            <button
              onClick={() => setCopilotOpen(!copilotOpen)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                copilotOpen
                  ? "bg-slate-800 text-white"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span>Copilot Sidebar</span>
            </button>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <div className="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto font-sans">
          {/* TAB 1: ANALYTICS OVERVIEW DASHBOARD */}
          {activeTab === "analytics" && (
            <div className="space-y-8 animate-fadeIn">
              {/* CFO CONTROL TOWER HEADER */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      CFO Control Tower · La Gran Vía Mexicali
                    </span>
                  </div>
                  <h2 className="font-sans text-2xl font-bold text-slate-900 mt-1">Torre de Control CFO & Resumen Ejecutivo</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Visión financiera ejecutiva de ingresos por renta, ocupación GLA ({plazaTotalGla.toLocaleString("es-MX")} m²), cobranza CAM NNN e inteligencia agregada del portafolio.
                  </p>
                </div>
              </div>

              {/* TOP KPI CARDS GRID WITH LARGE TYPOGRAPHY & BREATHABLE PADDING */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {/* CARD 1: RENTA CONTRATADA -> LINKS TO RENT ROLL */}
                <div
                  onClick={() => {
                    setActiveTab("rentroll");
                    triggerToast("Navegando a Rent Roll & Directorio SSOT...");
                  }}
                  className="bg-white border border-slate-200/90 border-t-2 border-t-slate-900 rounded-2xl p-6 sm:p-7 flex flex-col justify-between h-full shadow-2xs hover:shadow-md hover:border-slate-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 min-h-[44px]">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-900 transition-colors">
                      Renta Contratada Mensual
                    </span>
                    <span className="text-xs font-bold font-display text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 shrink-0 whitespace-nowrap">
                      +3.5%
                    </span>
                  </div>
                  <div className="my-4">
                    <span className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                      {formatVal(contractedRent)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-slate-500 font-medium font-display pt-2 border-t border-slate-100">
                    <span className="font-display">{tenantsAlDia} de {rentRoll.length} locales al día</span>
                    <span className="font-bold font-display text-slate-900 group-hover:underline">
                      Ver Rent Roll &rarr;
                    </span>
                  </div>
                </div>

                {/* CARD 2: OCUPACIÓN DE PLAZA -> LINKS TO RENT ROLL DIRECTORY */}
                <div
                  onClick={() => {
                    setActiveTab("rentroll");
                    triggerToast("Navegando a Directorio Unificado de Locales...");
                  }}
                  className="bg-white border border-slate-200/90 border-t-2 border-t-slate-900 rounded-2xl p-6 sm:p-7 flex flex-col justify-between h-full shadow-2xs hover:shadow-md hover:border-slate-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 min-h-[44px]">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-900 transition-colors">
                      Ocupación de Plaza (GLA)
                    </span>
                    <span className="text-xs font-bold font-display text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 shrink-0 whitespace-nowrap">
                      +1.2%
                    </span>
                  </div>
                  <div className="my-4">
                    <span className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                      {occupancyRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-slate-500 font-medium font-display pt-2 border-t border-slate-100">
                    <span className="font-display">{leasedSqm.toLocaleString("es-MX")} m² de {plazaTotalGla.toLocaleString("es-MX")} m²</span>
                    <span className="font-bold font-display text-slate-900 group-hover:underline">
                      Ver Locales &rarr;
                    </span>
                  </div>
                </div>

                {/* CARD 3: FONDO CAM NNN -> LINKS TO CAM & RENATA AI */}
                <div
                  onClick={() => {
                    setActiveTab("cam");
                    triggerToast("Navegando a Módulo CAM NNN & Renata AI...");
                  }}
                  className="bg-white border border-slate-200/90 border-t-2 border-t-slate-900 rounded-2xl p-6 sm:p-7 flex flex-col justify-between h-full shadow-2xs hover:shadow-md hover:border-slate-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 min-h-[44px]">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-900 transition-colors">
                      Fondo CAM NNN Mensual
                    </span>
                    <span className="text-xs font-bold font-display text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 shrink-0 whitespace-nowrap">
                      100% Bal.
                    </span>
                  </div>
                  <div className="my-4">
                    <span className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                      {formatVal(camMonthlyPool)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-slate-500 font-medium font-display pt-2 border-t border-slate-100">
                    <span className="font-display">Renata AI: Prorrateado</span>
                    <span className="font-bold font-display text-slate-900 group-hover:underline">
                      Ver CAM &rarr;
                    </span>
                  </div>
                </div>

                {/* CARD 4: EFICIENCIA DE COBRANZA -> OPENS RENATA AI COPILOT ON CFDI ALERT */}
                <div
                  onClick={() => {
                    setActiveTab("cam");
                    setCopilotOpen(true);
                    setActiveAgent("renata");
                    triggerToast("Abriendo Copilot Renata AI sobre Alerta SAT 260 Grill & Bar...");
                  }}
                  className="bg-white border border-slate-200/90 border-t-2 border-t-slate-900 rounded-2xl p-6 sm:p-7 flex flex-col justify-between h-full shadow-2xs hover:shadow-md hover:border-slate-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 min-h-[44px]">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-900 transition-colors">
                      Eficiencia de Cobranza
                    </span>
                    <span className="text-xs font-bold font-display text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300 shrink-0 whitespace-nowrap">
                      {tenantsWithAlert} Alerta{tenantsWithAlert === 1 ? "" : "s"} SAT
                    </span>
                  </div>
                  <div className="my-4">
                    <span className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                      {collectionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-slate-500 font-medium font-display pt-2 border-t border-slate-100">
                    <span className="font-display">260 Grill & Bar CFDI</span>
                    <span className="font-bold font-display text-slate-900 group-hover:underline">
                      Consultar Agente &rarr;
                    </span>
                  </div>
                </div>

                {/* CARD 5: CAPEX PROTEGIDO -> LINKS TO DIEGO AI MAINTENANCE TAB */}
                <div
                  onClick={() => {
                    setActiveTab("maint");
                    triggerToast("Navegando a Diego AI · CapEx & Mantenimiento...");
                  }}
                  className="bg-white border border-slate-200/90 border-t-2 border-t-slate-900 rounded-2xl p-6 sm:p-7 flex flex-col justify-between h-full shadow-2xs hover:shadow-md hover:border-slate-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 min-h-[44px]">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-900 transition-colors">
                      CapEx Protegido · Diego AI
                    </span>
                    <span className="text-xs font-bold font-display text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 shrink-0 whitespace-nowrap">
                      {capexCases.length} Casos
                    </span>
                  </div>
                  <div className="my-4">
                    <span className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                      {formatVal(diegoProtectedCapex)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-slate-500 font-medium font-display pt-2 border-t border-slate-100">
                    <span className="font-display">Rechazo + Garantía, fuera del P&amp;L</span>
                    <span className="font-bold font-display text-slate-900 group-hover:underline">
                      Ver Diego AI &rarr;
                    </span>
                  </div>
                </div>
              </div>

              {/* MIDDLE VISUALS GRID (CHART & RADAR) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-7 shadow-xs flex flex-col justify-between">
                  <RevenueTrendChart currency={currency} exchangeRate={exchangeRate} />
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-7 space-y-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 gap-3">
                    <div>
                      <h3 className="font-sans text-base font-bold text-slate-900 tracking-tight">
                        Radar de Vencimientos & Riesgo
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Alertas prioritarias</p>
                    </div>
                    <span className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-full border border-slate-200 shrink-0 whitespace-nowrap">
                      3 Acciones
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Item 1 */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">260 Grill & Bar</span>
                        <span className="text-xs font-bold bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded-md">Vence Q4 2026</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                        <span>Superficie: 320 m² · Local 10-01</span>
                        <span className="font-bold text-slate-900">{formatVal(76800)}/mes</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 font-medium truncate">Mariana AI · Legal</span>
                        <button
                          onClick={() => {
                            setActiveTab("legal");
                            setCopilotOpen(true);
                            setActiveAgent("mariana");
                            setQueryResult(
                              "Mariana AI (Legal & Leasing): Propuesta de renovación para 260 Grill & Bar (Local 10-01) redactada con incremento de 4.5% INPC. Bóveda RAG verificada sin conflictos."
                            );
                            triggerToast("Mariana AI generó la propuesta de renovación para 260 Grill & Bar.");
                          }}
                          className="text-xs text-slate-900 font-bold hover:underline cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          Renovar Contrato &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">Cinemex Premium</span>
                        <span className="text-xs font-bold bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded-md">Al Día · 2028</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                        <span>Superficie: 1,180 m² · Local 9-22</span>
                        <span className="font-bold text-slate-900">{formatVal(283200)}/mes</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 flex justify-end">
                        <span className="text-xs text-slate-700 font-bold">Sin Riesgo Activo</span>
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">Local B-14</span>
                        <span className="text-xs font-bold bg-slate-900 text-white px-2.5 py-0.5 rounded-md">320 m² Disponible</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                        <span>Renta Base: {formatVal(115200)}</span>
                        <span className="font-bold text-slate-800">2 Prospectos RAG</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 flex justify-end">
                        <button
                          onClick={() => {
                            setActiveTab("legal");
                            triggerToast("Navegando a Bóveda Legal RAG para revisar expediente Dunkin' Donuts.");
                          }}
                          className="text-xs text-slate-900 font-bold hover:underline cursor-pointer"
                        >
                          Ver Expediente
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SLEEK 1-LINE EXECUTIVE COPILOT BAR (REPLACES CLUTTERED BOTTOM SECTION) */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0" />
                  <div>
                    <h3 className="font-sans text-lg font-bold text-white tracking-tight">
                      Copilot de Asset Management (Renata · Mariana · Diego)
                    </h3>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      3 Agentes autónomos auditando fiscalidad SAT, contratos RAG y mantenimiento en tiempo real.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setCopilotOpen(true)}
                  className="bg-white hover:bg-slate-100 text-slate-900 px-6 py-3 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
                >
                  Abrir Copilot Sidebar
                </button>
              </div>

              {/* RENT ROLL & TENANT ANALYTICS TABLE */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-4 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-sans text-base font-bold text-slate-900 tracking-tight">Rent Roll de Inquilinos & Estatus IA</h3>
                    <p className="text-xs text-slate-500 font-medium">Métrica individual de 84 locales con verificación fiscal y mantenimiento</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setCategoryFilter("ALL")}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${categoryFilter === "ALL" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600"}`}
                      >
                        Todos ({rentRoll.length})
                      </button>
                      <button
                        onClick={() => setCategoryFilter("Restaurante & Bar")}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${categoryFilter === "Restaurante & Bar" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600"}`}
                      >
                        Gastronomía
                      </button>
                      <button
                        onClick={() => setCategoryFilter("Tienda & Moda")}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${categoryFilter === "Tienda & Moda" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600"}`}
                      >
                        Retail
                      </button>
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Estatus: Todos</option>
                      <option value="OK">Al día</option>
                      <option value="ALERT">Alerta SAT / IA</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 font-sans">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-600 border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Local / Inquilino</th>
                        <th className="py-3 px-4">Giro / Zona</th>
                        <th className="py-3 px-4 text-right">Superficie (GLA)</th>
                        <th className="py-3 px-4 text-right">Renta Base</th>
                        <th className="py-3 px-4 text-right">Cuota CAM NNN</th>
                        <th className="py-3 px-4">Estatus Fiscal & IA</th>
                        <th className="py-3 px-4 text-center">Acciones IA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRentRoll.slice(0, 10).map((row) => (
                        <tr key={row.slug} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-xs">{row.name}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{row.unitCode} · {row.tag}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-700">
                              {row.zone}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium">
                            {row.sqm} m² <span className="text-slate-400">({row.sharePct.toFixed(2)}%)</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            {formatMxn(row.rent)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-600 font-medium">
                            {formatMxn((row.rent * 0.12))}
                          </td>
                          <td className="py-3.5 px-4">
                            {row.fiscalAlert ? (
                              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-900 border border-slate-300 px-2.5 py-1 rounded-md text-xs font-bold">
                                Inconsistencia CFDI SAT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-1 rounded-md text-xs font-medium">
                                Al Día
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => {
                                setCopilotOpen(true);
                                setActiveAgent(row.fiscalAlert ? "renata" : "mariana");
                                triggerToast(`Copilot IA activado para ${row.name}`);
                              }}
                              className="bg-white hover:bg-slate-900 hover:text-white text-slate-700 border border-slate-200 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            >
                              Consultar IA
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-3 border-t border-slate-100">
                  <span>Mostrando {Math.min(10, filteredRentRoll.length)} de {rentRoll.length} locales</span>
                  <div className="flex items-center gap-2">
                    <button className="px-3.5 py-1.5 bg-white rounded-xl border border-slate-200 text-slate-700 font-semibold cursor-pointer hover:bg-slate-50">Anterior</button>
                    <button className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl font-bold cursor-pointer">Siguiente</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OTHER DEEP DIVE TABS (Rent Roll, CAM, Mantenimiento, Legal, Universal ERP) */}
          {activeTab === "rentroll" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs font-sans">
              {/* TOP HEADER & ACTION BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Single Source of Truth (SSOT) · Base de Datos Maestra
                    </span>
                  </div>
                  <h2 className="font-sans text-2xl font-bold text-slate-900 mt-1">
                    Rent Roll & Directorio Unificado de Locales
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Registro maestro de 84 locales comerciales. Los cambios aplicados aquí actualizan en tiempo real el Plano Interactivo (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-medium">/directorio</code>) y el Portal del Arrendatario (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-medium">/inquilinos</code>).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      triggerToast("Sincronización forzada con el plano interactivo /directorio y portal /inquilinos.");
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Sincronizar SSOT
                  </button>
                  <button
                    onClick={() => {
                      const nextState = !isEditingRentRoll;
                      setIsEditingRentRoll(nextState);
                      triggerToast(
                        nextState
                          ? "Modo edición activado. Puedes ajustar la renta mensual y superficie de los locales."
                          : "Cambios en Rent Roll guardados y sincronizados con /directorio."
                      );
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    {isEditingRentRoll ? "Guardar Cambios" : "Modo Edición"}
                  </button>
                </div>
              </div>

              {/* EXPECTED VS ACTUAL REVENUE KPI SUMMARY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-display">
                <div className="bg-slate-50 border border-slate-200/90 border-t-2 border-t-slate-900 rounded-xl p-4.5 space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide font-display">Renta Contratada (Esperada)</p>
                  <p className="text-2xl font-bold font-display text-slate-900">{formatMxn(contractedRent)}</p>
                  <p className="text-xs text-slate-500 font-medium font-display">100% de la cuota base esperada</p>
                </div>

                <div className="bg-slate-50 border border-slate-200/90 border-t-2 border-t-slate-900 rounded-xl p-4.5 space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide font-display">Renta Recibida (Real Cobrada)</p>
                  <p className="text-2xl font-bold font-display text-slate-900">{formatVal(contractedRent - fiscalAlertRent)}</p>
                  <p className="text-xs text-slate-600 font-medium font-display">{collectionRate.toFixed(1)}% Eficiencia de Cobranza</p>
                </div>

                <div className="bg-slate-50 border border-slate-300 border-t-2 border-t-slate-900 rounded-xl p-4.5 space-y-1">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide font-display">Variación / Pendiente</p>
                  <p className="text-2xl font-bold font-display text-slate-900">-{formatVal(fiscalAlertRent)}</p>
                  <p className="text-xs text-slate-600 font-medium font-display">1 Alerta CFDI SAT (260 Grill & Bar)</p>
                </div>

                <div className="bg-slate-50 border border-slate-200/90 border-t-2 border-t-slate-900 rounded-xl p-4.5 space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide font-display">Sincronización SSOT</p>
                  <p className="text-2xl font-bold font-display text-slate-900">{rentRoll.length} Locales</p>
                  <p className="text-xs text-slate-500 font-medium font-display">/directorio | /inquilinos</p>
                </div>
              </div>

              {/* SINGLE SOURCE OF TRUTH BANNER WITH ELEGANT SUBTITLE */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-800 font-medium">
                <div className="flex items-center gap-2.5">
                  <div>
                    <span className="font-bold text-slate-900 text-xs">
                      Rent Roll Maestro · Periodo Fiscal: Agosto 2026
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Padrón contractual en tiempo real (GLA Total: {plazaTotalGla.toLocaleString("es-MX")} m² · Superficie Rentable Bruta). Sincronizado automáticamente con cuentas ERP.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg font-bold text-[11px] border border-slate-200 shadow-2xs">
                    <span className="h-2 w-2 rounded-full bg-slate-800" />
                    <span>Sincronizado: 10 Ago 2026 · 14:45 hrs</span>
                  </span>
                </div>
              </div>

              {/* RENT ROLL MASTER TABLE (CLEAN 5-COLUMN EXECUTIVE LEASE LEDGER) */}
              <div className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-700 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="p-3.5">Inquilino & Local</th>
                      <th className="p-3.5 text-right">Superficie</th>
                      <th
                        className="p-3.5 text-right cursor-default select-none"
                        title={`GLA = Gross Leasable Area / Superficie Rentable Bruta (${plazaTotalGla.toLocaleString("es-MX")} m² total)`}
                      >
                        % Participación GLA
                      </th>
                      <th className="p-3.5 text-right font-extrabold">Renta Mensual Contratada</th>
                      <th
                        className="p-3.5 text-center cursor-default select-none"
                        title="SSOT = Single Source of Truth / Fuente Única de Verdad (Información sincronizada en tiempo real)"
                      >
                        Estatus Contractual SSOT
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {rentRoll.map((r) => {
                      const is260Grill = r.name.includes("260 Grill");
                      const isBlueLuna = r.name.includes("Blue Luna");

                      return (
                        <tr key={r.slug} className={`transition-colors ${isEditingRentRoll ? "bg-slate-100/50 hover:bg-slate-100" : "hover:bg-slate-50"}`}>
                          <td className="p-3.5">
                            <p className="font-bold text-slate-900 text-xs">{r.name}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{r.unitCode}</p>
                          </td>
                          <td className="p-3.5 text-right font-medium text-slate-800 whitespace-nowrap">
                            {isEditingRentRoll ? (
                              <input
                                type="number"
                                defaultValue={r.sqm}
                                aria-label={`Superficie m² para ${r.name}`}
                                className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-right font-bold text-slate-900 text-xs focus:border-slate-500 focus:outline-none"
                                onChange={() => triggerToast(`Superficie actualizada para ${r.name}`)}
                              />
                            ) : (
                              `${r.sqm} m²`
                            )}
                          </td>
                          <td className="p-3.5 text-right font-medium text-slate-700 text-xs whitespace-nowrap">{r.sharePct.toFixed(2)}%</td>
                          <td className="p-3.5 text-right font-bold text-slate-900 text-xs whitespace-nowrap">
                            {isEditingRentRoll ? (
                              <input
                                type="number"
                                defaultValue={r.rent}
                                aria-label={`Renta mensual para ${r.name}`}
                                className="w-24 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-right font-bold text-slate-900 text-xs focus:border-slate-500 focus:outline-none"
                                onChange={() => triggerToast(`Renta actualizada para ${r.name}`)}
                              />
                            ) : (
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{formatVal(r.rent)}</p>
                                <p className="text-[10.5px] text-slate-500 font-medium">
                                  {formatVal(Math.round(r.rent / r.sqm))}/m²
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            {is260Grill ? (
                              <button
                                onClick={() => {
                                  setRenewalDraftOpen(true);
                                  triggerToast("Mariana AI generó el borrador de renovación de 260 Grill & Bar.");
                                }}
                                title="Ver borrador de renovación generado por Mariana (Gerente de Contratos)"
                                className={`px-2.5 py-1 rounded-full font-bold text-[10px] cursor-pointer transition-all hover:scale-105 shadow-xs flex items-center gap-1.5 mx-auto ${
                                  renewalSent
                                    ? "bg-slate-100 text-slate-800 border border-slate-200"
                                    : "bg-slate-900 hover:bg-slate-800 text-white"
                                }`}
                              >
                                {!renewalSent && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                                {renewalSent ? "Borrador Enviado a Abogado ✓" : "Renovación Próxima · Mariana AI →"}
                              </button>
                            ) : isBlueLuna ? (
                              <button
                                onClick={() => {
                                  setActiveAgent("mariana");
                                  setCopilotOpen(true);
                                  setQueryResult(
                                    "Mariana AI (Contratos & Arrendamientos): Blue Luna Café (Local 4-16). Póliza de seguro de responsabilidad civil vence en Nov 2026. Recordatorio legal pre-notificado."
                                  );
                                  triggerToast("Mariana AI (Contratos): Expediente Blue Luna Café abierto.");
                                }}
                                title="Ver auditoría de póliza asignada a Mariana AI"
                                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full font-bold text-[10px] cursor-pointer transition-all hover:scale-105 shadow-xs flex items-center gap-1 mx-auto"
                              >
                                Revisar Seguro · Mariana AI →
                              </button>
                            ) : (
                              <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
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

          {activeTab === "cam" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-8 animate-fadeIn text-slate-900 font-sans shadow-sm">
              {/* CONTROLLER HEADER & ACTION BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Módulo de Control Financiero · Renata AI
                    </span>
                  </div>
                  <h2 className="font-sans text-2xl font-bold text-slate-900 mt-1">
                    Renata AI · Fondo CAM NNN & Ingesta de Facturas
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Supervisión de comprobantes y prorrateo de {formatVal(camMonthlyPool)} acumulados entre los 84 locales comerciales.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {!cfdiIssued && (
                    <button
                      onClick={() => {
                        setCfdiIssued(true);
                        triggerToast("Complemento de pago CFDI 4.0 timbrado y enviado al SAT exitosamente.");
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                    >
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      <span>Timbrar Recibo SAT ({formatVal(18400)})</span>
                    </button>
                  )}
                  {cfdiIssued && (
                    <span className="bg-slate-100 text-slate-800 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                      <span>SAT Timbrado</span>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      triggerToast("Factura cargada. Renata calculó el prorrateo automáticamente entre los 84 locales.");
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    + Subir Factura PDF / XML
                  </button>
                </div>
              </div>

              {/* 4 CONTROLLER SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-display">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-1 font-display">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide font-display">Gastos del Mes (CAM)</p>
                  <p className="text-2xl font-bold font-display text-slate-900">{formatVal(camMonthlyPool)}</p>
                  <p className="text-xs text-slate-500 font-display">5 Facturas acumuladas</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-1 font-display">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide font-display">Vía ERP SAP System</p>
                  <p className="text-2xl font-bold font-display text-slate-900">{formatVal(315468)}</p>
                  <p className="text-xs text-slate-500 font-display">2 Facturas (CFE + Securitas)</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-1 font-display">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide font-display">Vía Carga Manual</p>
                  <p className="text-2xl font-bold font-display text-slate-900">{formatVal(90500)}</p>
                  <p className="text-xs text-slate-500 font-display">2 Facturas (Climas HVAC + Diego AI CAP-03)</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-1 font-display">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide font-display">Vía Portal Arrendatario</p>
                  <p className="text-2xl font-bold font-display text-slate-900">{formatVal(98500)}</p>
                  <p className="text-xs text-slate-500 font-display">1 Comprobante (260 Grill & Bar)</p>
                </div>
              </div>

              {/* INVOICES MASTER LEDGER BY SOURCE (MAIN CONTROLLER TOOL) */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-sans text-base font-bold text-slate-900">
                      Registro Completo de Facturas e Ingesta de Gastos
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monitoreo del origen del comprobante (Sistema ERP, Portal Arrendatario o Carga Manual).
                    </p>
                  </div>

                  {/* CONTROLLER SOURCE FILTER BAR */}
                  <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setInvoiceSourceFilter("ALL")}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${invoiceSourceFilter === "ALL" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
                    >
                      Todos (5)
                    </button>
                    <button
                      onClick={() => setInvoiceSourceFilter("ERP")}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${invoiceSourceFilter === "ERP" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
                    >
                      Sistema ERP (2)
                    </button>
                    <button
                      onClick={() => setInvoiceSourceFilter("MANUAL")}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${invoiceSourceFilter === "MANUAL" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
                    >
                      Carga Manual (2)
                    </button>
                    <button
                      onClick={() => setInvoiceSourceFilter("TENANT")}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${invoiceSourceFilter === "TENANT" ? "bg-white text-slate-900 font-bold shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
                    >
                      Arrendatario (1)
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10.5px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-4 whitespace-nowrap">Origen de Ingesta</th>
                        <th className="p-4 whitespace-nowrap">Proveedor / Emisor</th>
                        <th className="p-4 whitespace-nowrap">Concepto del Gasto</th>
                        <th className="p-4 text-right whitespace-nowrap">Monto Total</th>
                        <th className="p-4 whitespace-nowrap">Regla de Distribución</th>
                        <th className="p-4 text-center whitespace-nowrap">Estatus Auditoría</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {(invoiceSourceFilter === "ALL" || invoiceSourceFilter === "ERP") && (
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold">
                              Conector ERP SAP
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-900 whitespace-nowrap">CFE Mexicali</td>
                          <td className="p-4 text-slate-600">Energía Eléctrica (Pasillos y Áreas Comunes)</td>
                          <td className="p-4 text-right font-bold font-sans tabular-nums text-slate-900 whitespace-nowrap">{formatVal(250468)}</td>
                          <td className="p-4 text-slate-500">Prorrateado (m² ÷ {plazaTotalGla.toLocaleString("es-MX")})</td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <span className="text-slate-800 font-bold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">Prorrateado</span>
                          </td>
                        </tr>
                      )}

                      {(invoiceSourceFilter === "ALL" || invoiceSourceFilter === "ERP") && (
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold">
                              Conector ERP SAP
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-900 whitespace-nowrap">Grupo Securitas</td>
                          <td className="p-4 text-slate-600">Vigilancia & Control de Acceso 24/7</td>
                          <td className="p-4 text-right font-bold font-sans tabular-nums text-slate-900 whitespace-nowrap">{formatVal(65000)}</td>
                          <td className="p-4 text-slate-500">Prorrateado (m² ÷ {plazaTotalGla.toLocaleString("es-MX")})</td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <span className="text-slate-800 font-bold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">Prorrateado</span>
                          </td>
                        </tr>
                      )}

                      {(invoiceSourceFilter === "ALL" || invoiceSourceFilter === "MANUAL") && (
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold">
                              Carga Manual Admin
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-900 whitespace-nowrap">Climas de Mexicali</td>
                          <td className="p-4 text-slate-600">Mantenimiento Preventivo HVAC Torre Central</td>
                          <td className="p-4 text-right font-bold font-sans tabular-nums text-slate-900 whitespace-nowrap">{formatVal(38500)}</td>
                          <td className="p-4 text-slate-500">Prorrateado (m² ÷ {plazaTotalGla.toLocaleString("es-MX")})</td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <span className="text-slate-800 font-bold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">Prorrateado</span>
                          </td>
                        </tr>
                      )}

                      {(invoiceSourceFilter === "ALL" || invoiceSourceFilter === "MANUAL") && (
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold">
                              Carga Manual Admin
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-900 whitespace-nowrap">Diego AI · Caso CAP-03</td>
                          <td className="p-4 text-slate-600">Mantenimiento Preventivo Planta de Emergencia Común (Cinemex Premium)</td>
                          <td className="p-4 text-right font-bold font-sans tabular-nums text-slate-900 whitespace-nowrap">{formatVal(52000)}</td>
                          <td className="p-4 text-slate-500">Prorrateado (m² ÷ {plazaTotalGla.toLocaleString("es-MX")})</td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <span className="text-slate-800 font-bold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">Prorrateado</span>
                          </td>
                        </tr>
                      )}

                      {(invoiceSourceFilter === "ALL" || invoiceSourceFilter === "TENANT") && (
                        <tr className="hover:bg-slate-100 transition-colors bg-slate-50">
                          <td className="p-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold">
                              Portal Arrendatario
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-900 whitespace-nowrap">260 Grill & Bar (Local 10-01)</td>
                          <td className="p-4 text-slate-700 font-medium">Comprobante de Pago Renta + Cuota CAM</td>
                          <td className="p-4 text-right font-bold font-sans tabular-nums text-slate-900 whitespace-nowrap">{formatVal(98500)}</td>
                          <td className="p-4 text-slate-600">Asignación Directa Local 10-01</td>
                          <td className="p-4 text-center">
                            {!cfdiIssued ? (
                              <button
                                onClick={() => {
                                  setCfdiIssued(true);
                                  triggerToast("Complemento de pago CFDI 4.0 timbrado exitosamente en el SAT.");
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer shadow-2xs"
                              >
                                Timbrar SAT
                              </button>
                            ) : (
                              <span className="text-slate-800 font-bold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">SAT Timbrado</span>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TENANT PRORATION MATRIX */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-sans text-base font-bold text-slate-900">
                      Tabla de División Final por Inquilino (Cobro NNN)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Desglose individual del prorrateo correspondiente a cada local comercial.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setIsEditingCam(!isEditingCam);
                        triggerToast(
                          isEditingCam
                            ? "Renata AI: Cambios de prorrateo guardados. Reconciliación actualizada."
                            : "Modo Edición Controller activado. Puedes editar Superficie, Renta Base o Administración para cualquier local."
                        );
                        if (isEditingCam) {
                          appendAuditLog("user", "m.hage@lagranvia.com.mx", "Guardó cambios de prorrateo CAM en Modo Edición Controller");
                        }
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isEditingCam
                          ? "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 font-extrabold shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>{isEditingCam ? "Guardar Ajustes Controller" : "Modo Edición Controller"}</span>
                    </button>
                    <button
                      onClick={() => setCamConfirmModal("notify")}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
                      title="Revisar y notificar estado de cuenta a los 84 arrendatarios"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Notificar a Tenants</span>
                    </button>
                    <button
                      onClick={() => setCamConfirmModal("sat_erp")}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
                      title="Revisar y autorizar timbrado SAT con sincronización ERP SAP"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Timbrar SAT & ERP SAP</span>
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-4">Inquilino / Local</th>
                        <th className="p-4 text-right">Superficie</th>
                        <th className="p-4 text-right">% Participación</th>
                        <th className="p-4 text-right">Cuota Base CAM</th>
                        <th className="p-4 text-right">Administración</th>
                        <th className="p-4 text-right">IVA (16%)</th>
                        <th className="p-4 text-right">Total NNN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {editableCamRows.map((c, idx) => (
                        <tr key={c.key} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-900">{c.label}</td>
                          <td className="p-4 text-right font-medium">
                            {isEditingCam ? (
                              <input
                                type="number"
                                value={c.sqm}
                                onChange={(e) => handleCamRowChange(idx, "sqm", e.target.value)}
                                className="w-20 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 text-right font-bold text-slate-900 text-xs focus:border-amber-500 focus:outline-none"
                              />
                            ) : (
                              <span>{c.sqm} m²</span>
                            )}
                          </td>
                          <td className="p-4 text-right font-medium">{c.sharePct.toFixed(2)}%</td>
                          <td className="p-4 text-right font-medium">
                            {isEditingCam ? (
                              <input
                                type="number"
                                value={c.base}
                                onChange={(e) => handleCamRowChange(idx, "base", e.target.value)}
                                className="w-24 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 text-right font-bold text-slate-900 text-xs focus:border-amber-500 focus:outline-none"
                              />
                            ) : (
                              <span>{formatVal(c.base)}</span>
                            )}
                          </td>
                          <td className="p-4 text-right font-medium">
                            {isEditingCam ? (
                              <input
                                type="number"
                                value={c.admin}
                                onChange={(e) => handleCamRowChange(idx, "admin", e.target.value)}
                                className="w-20 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 text-right font-bold text-slate-900 text-xs focus:border-amber-500 focus:outline-none"
                              />
                            ) : (
                              <span>{formatVal(c.admin)}</span>
                            )}
                          </td>
                          <td className="p-4 text-right font-medium">{formatVal(c.iva)}</td>
                          <td className="p-4 text-right font-bold text-slate-900">{formatVal(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-900 text-xs">
                      <tr>
                        <td className="p-4 bg-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="font-extrabold uppercase tracking-wide">
                              TOTAL RECONCILIADO ({editableCamRows.length} LOCALES)
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right bg-slate-900 font-bold tabular-nums">
                          {editableCamRows.reduce((sum, r) => sum + r.sqm, 0).toLocaleString()} m²
                        </td>
                        <td className="p-4 text-right bg-slate-900 font-bold tabular-nums">100.00%</td>
                        <td className="p-4 text-right bg-slate-900 font-extrabold text-emerald-400 tabular-nums">
                          {formatVal(editableCamRows.reduce((sum, r) => sum + r.base, 0))}
                        </td>
                        <td className="p-4 text-right bg-slate-900 font-bold tabular-nums">
                          {formatVal(editableCamRows.reduce((sum, r) => sum + r.admin, 0))}
                        </td>
                        <td className="p-4 text-right bg-slate-900 font-bold tabular-nums">
                          {formatVal(editableCamRows.reduce((sum, r) => sum + r.iva, 0))}
                        </td>
                        <td className="p-4 text-right bg-slate-900 font-extrabold text-emerald-300 text-sm tabular-nums">
                          {formatVal(editableCamRows.reduce((sum, r) => sum + r.total, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* RECONCILIATION AUDIT CARD */}
                {(() => {
                  const cuotaBaseSum = editableCamRows.reduce((sum, r) => sum + r.base, 0);
                  const isReconciled = cuotaBaseSum === camMonthlyPool;
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isReconciled ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span>
                          <strong>Auditoría de Reconciliación Controller:</strong> La suma de Cuotas Base ({formatVal(cuotaBaseSum)}) {isReconciled ? `coincide al 100% con el Fondo CAM Mensual (${formatVal(camMonthlyPool)}). Variación: $0.00 MXN.` : `difiere por ${formatVal(Math.abs(camMonthlyPool - cuotaBaseSum))} del Fondo CAM Mensual (${formatVal(camMonthlyPool)}).`}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === "maint" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs font-sans">
              {/* HEADER & WARRANTY UPLOAD ACTION BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Agente de Mantenimiento & CapEx · Diego AI
                    </span>
                  </div>
                  <h2 className="font-sans text-xl font-bold text-slate-900 mt-1">Diego AI · CapEx, Mantenimiento & Expediente Digital</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Control de pólizas de equipos pesados (HVAC, Elevadores, Subestaciones), bitácora preventiva y reclamación automática de garantías a proveedores.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => triggerToast("Selecciona la Garantía, Póliza o Manual de Equipo (PDF/XML) para indexar en Diego AI...")}
                    className="bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                  >
                    + Cargar Garantía o Manual (PDF)
                  </button>
                  <button
                    onClick={() => {
                      setHvacDispatched(true);
                      triggerToast("Técnico de Climas de Mexicali despachado bajo orden de garantía #HVAC-884.");
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    {hvacDispatched ? "Técnico Despachado ✓" : "Despachar Técnico HVAC"}
                  </button>
                </div>
              </div>

              {/* CALENDARIO DE PRÓXIMOS EVENTOS & APROBACIONES (LANDLORD-FIRST: WHAT NEEDS A DECISION NOW) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-sans text-base font-bold text-slate-900">
                      Calendario de Próximos Eventos
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Mantenimiento preventivo y calibraciones programadas. Diego AI despacha automáticamente hasta {formatVal(diegoThresholdVal)}; por encima requiere tu aprobación.
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-200 shrink-0">
                    {maintenanceEvents.filter((e) => e.costEstimate > diegoThresholdVal && !eventApprovals[e.id]).length} Pendientes de Aprobación
                  </span>
                </div>

                <div className="space-y-2.5">
                  {maintenanceEvents.map((event) => {
                    const needsApproval = event.costEstimate > diegoThresholdVal;
                    const isApproved = eventApprovals[event.id];
                    const isNotified = eventNotified[event.id];
                    return (
                      <div
                        key={event.id}
                        className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border ${
                          needsApproval && !isApproved ? "bg-amber-50 border-amber-300" : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="text-center shrink-0 w-16">
                          <p className="text-xs font-extrabold text-slate-900">{event.date.split(" ")[0]}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{event.date.split(" ")[1]} {event.date.split(" ")[2]}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-xs">{event.title}</p>
                          <p className="text-[11px] text-slate-500">{event.vendor} · {event.category} · Responsable: {event.responsible}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-900 text-xs font-sans tabular-nums">{formatVal(event.costEstimate)}</p>
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                              !needsApproval
                                ? "bg-slate-100 text-slate-700 border border-slate-200"
                                : isApproved
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-amber-100 text-amber-900 border border-amber-300"
                            }`}
                          >
                            {!needsApproval ? "Auto-Aprobado" : isApproved ? "Aprobado" : "Requiere Aprobación"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {needsApproval && !isApproved && (
                            <button
                              onClick={() => setApprovalConfirmEventId(event.id)}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                            >
                              Aprobar Despacho
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEventNotified((prev) => ({ ...prev, [event.id]: true }));
                              triggerToast(`Correo enviado a ${event.responsible} (${event.responsibleEmail}) sobre "${event.title}".`);
                            }}
                            disabled={isNotified}
                            className={`font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all whitespace-nowrap border ${
                              isNotified
                                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-default"
                                : "bg-white hover:bg-slate-100 text-slate-800 border-slate-300 cursor-pointer"
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

              {/* DIEGO AI AGENTIC AUTONOMOUS ACTIONS CONSOLE */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-sm border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="font-sans text-sm font-bold text-white">
                      Consola de Acciones Autónomas del Agente Diego AI
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    CapEx & Infrastructure Guard · 24/7 Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Reclamo Autónomo</p>
                    <p className="font-bold text-white">Ejecución de Garantía HVAC</p>
                    <p className="text-[11px] text-slate-300">Carta enviada a Climas de Mexicali sin costo CAM ($0 MXN).</p>
                  </div>

                  <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Monitoreo IoT</p>
                    <p className="font-bold text-white">Telemetría Chiller Trane</p>
                    <p className="text-[11px] text-slate-300">Presión de freón al 98.4%. 0 anomalías de refrigeración.</p>
                  </div>

                  <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Auditoría CapEx vs CAM</p>
                    <p className="font-bold text-white">Clasificación de Facturas</p>
                    <p className="text-[11px] text-slate-300">Protegió $38,500 MXN de cobro indebido a inquilinos.</p>
                  </div>

                  <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Radar Normativo</p>
                    <p className="font-bold text-white">Certificación NFPA 25</p>
                    <p className="text-[11px] text-slate-300">Prueba de aspersores contra incendio programada.</p>
                  </div>
                </div>
              </div>

              {/* CAPEX COST-RESPONSIBILITY LEDGER (TIES DIEGO'S ACTIVITY TO A REAL $ FIGURE FOR FINANZAS) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-sans text-base font-bold text-slate-900">
                      Registro de Casos CapEx & Responsabilidad de Costo
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cada solicitud de gasto mayor resuelta por Diego AI: quién paga y por qué. Alimenta la tarjeta &ldquo;CapEx Protegido&rdquo; en la Torre de Control CFO.
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-200 shrink-0">
                    {formatVal(diegoProtectedCapex)} Protegidos del P&amp;L
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px] tracking-wider">
                      <tr>
                        <th className="p-3.5">Caso / Inquilino</th>
                        <th className="p-3.5">Tipo de Gasto & Equipo</th>
                        <th className="p-3.5 text-right">Monto</th>
                        <th className="p-3.5">Veredicto Diego AI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {capexCases.map((c) => {
                        const verdictMeta =
                          c.verdict === "RECHAZADO_RESPONSABILIDAD_INQUILINO"
                            ? { label: "Rechazado · Responsabilidad Inquilino", badge: "bg-slate-900 text-white" }
                            : c.verdict === "APROBADO_GARANTIA_COSTO_CERO"
                              ? { label: "Aprobado · Garantía ($0 MXN)", badge: "bg-slate-100 text-slate-800 border border-slate-200" }
                              : { label: "Aprobado · Prorrateo CAM", badge: "bg-amber-100 text-amber-900 border border-amber-300" };
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/90 transition-colors align-top">
                            <td className="p-3.5">
                              <p className="font-bold text-slate-900 text-xs">{c.tenant}</p>
                              <p className="text-[11px] text-slate-500">{c.id}</p>
                            </td>
                            <td className="p-3.5">
                              <p className="text-slate-800 font-semibold">{c.expenseType}</p>
                              <p className="text-[11px] text-slate-500">{c.equipmentModel} · {c.serialNumber}</p>
                            </td>
                            <td className="p-3.5 text-right font-bold font-sans tabular-nums text-slate-900 whitespace-nowrap">
                              {formatVal(c.amount)}
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1 ${verdictMeta.badge}`}>
                                {verdictMeta.label}
                              </span>
                              <p className="text-[11px] text-slate-600 leading-relaxed max-w-md">{c.details}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PREAPPROVED TECHNICIAN ROSTER (CONTROLLER-EDITABLE, MATCHES CAM TABLE EDIT PATTERN) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-sans text-base font-bold text-slate-900">
                      Directorio de Contratistas Preaprobados
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Un contratista por especialidad, listo para contactar sin importar el motivo del ticket.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditingRoster(!isEditingRoster);
                      triggerToast(
                        isEditingRoster
                          ? "Directorio de contratistas actualizado."
                          : "Modo Edición Controller activado. Puedes editar contratista, contacto o cobertura de cualquier especialidad."
                      );
                      if (isEditingRoster) {
                        appendAuditLog("user", "m.hage@lagranvia.com.mx", "Guardó cambios en el Directorio de Contratistas Preaprobados");
                      }
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                      isEditingRoster
                        ? "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 font-extrabold shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>{isEditingRoster ? "Guardar Directorio" : "Modo Edición Controller"}</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px] tracking-wider">
                      <tr>
                        <th className="p-3.5">Especialidad</th>
                        <th className="p-3.5">Contratista</th>
                        <th className="p-3.5">Contacto</th>
                        <th className="p-3.5">Cobertura</th>
                        <th className="p-3.5">SLA En Sitio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {editableTechnicianRoster.map((row, idx) => (
                        <tr key={row.trade} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">{row.trade}</td>
                          <td className="p-3.5">
                            {isEditingRoster ? (
                              <input
                                type="text"
                                value={row.contractor}
                                onChange={(e) => handleTechnicianRosterChange(idx, "contractor", e.target.value)}
                                className="w-full min-w-[180px] bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 font-semibold text-slate-900 text-xs focus:border-amber-500 focus:outline-none"
                              />
                            ) : (
                              <span className="text-slate-800 font-semibold">{row.contractor}</span>
                            )}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            {isEditingRoster ? (
                              <input
                                type="text"
                                value={row.contact}
                                onChange={(e) => handleTechnicianRosterChange(idx, "contact", e.target.value)}
                                className="w-36 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 font-semibold text-slate-900 text-xs focus:border-amber-500 focus:outline-none"
                              />
                            ) : (
                              <a href={`tel:${row.contact.replace(/\s+/g, "")}`} className="text-slate-900 font-bold hover:underline">
                                {row.contact}
                              </a>
                            )}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            {isEditingRoster ? (
                              <input
                                type="text"
                                value={row.coverage}
                                onChange={(e) => handleTechnicianRosterChange(idx, "coverage", e.target.value)}
                                className="w-32 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 font-semibold text-slate-900 text-xs focus:border-amber-500 focus:outline-none"
                              />
                            ) : (
                              <span className="text-slate-600 font-medium">{row.coverage}</span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-600 font-medium whitespace-nowrap">{row.slaOnSite}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* EXPEDIENTE DIGITAL DE GARANTÍAS DE EQUIPOS Y DOCUMENTOS DE INFRAESTRUCTURA */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-sans text-base font-bold text-slate-900">
                      Expediente Digital de Garantías & Pólizas de Equipos
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Diego AI monitorea la vigencia de pólizas de mantenimiento, reclamaciones a fabricantes e historial técnico.
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-200 shrink-0">
                    8 Garantías Indexadas en Diego AI
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
                          ? "bg-slate-900 text-white font-bold shadow-2xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
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
                    <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-slate-400 transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                              HVAC Climatización
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">Serie: TRN-2024-884</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">Chiller Centravac Trane 150 Ton (Torre Central)</h4>
                        </div>
                        <span className="bg-slate-100 text-slate-900 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-slate-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-900 border border-slate-200">garantia_trane_chiller_2024_2029.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>5 Años en Compresor, Condensador & Evaporador</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Climas de Mexicali S.A. de C.V.</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>14 de Noviembre de 2029</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                        <button
                          onClick={() => triggerToast("Diego AI generó carta de reclamo de garantía para Climas de Mexicali.")}
                          className="text-slate-900 hover:text-slate-800 font-bold underline cursor-pointer text-xs"
                        >
                          Generar Reclamo de Garantía →
                        </button>
                        <span className="text-[11px] text-slate-500 font-medium">Revisión Preventiva: Al Día</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 2: THYSSENKRUPP ELEVATOR */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "ELEVATOR") && (
                    <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-slate-400 transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                              Elevadores & Movilidad
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">Serie: TK-MEX-4410</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">Elevador Panorámico ThyssenKrupp (Zona A)</h4>
                        </div>
                        <span className="bg-slate-100 text-slate-900 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-slate-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-900 border border-slate-200">poliza_mantenimiento_thyssenkrupp_2026.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Atención de Urgencia 24/7 & Repuestos Originales</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>TK Elevator México</strong></p>
                        <p>📅 Vencimiento de Póliza: <strong>31 de Diciembre de 2026</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                        <button
                          onClick={() => triggerToast("Diego AI solicitó inspección de rutina a TK Elevator México.")}
                          className="text-slate-900 hover:text-slate-800 font-bold underline cursor-pointer text-xs"
                        >
                          Solicitar Inspección Técnica →
                        </button>
                        <span className="text-[11px] text-slate-500 font-medium">Último Mantenimiento: 25 Jul</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 3: SCHNEIDER SUBSTATION */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "POWER") && (
                    <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-slate-400 transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                              Subestación Eléctrica
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">Serie: SCH-1500-KVA</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">Subestación Eléctrica Schneider 1500 KVA</h4>
                        </div>
                        <span className="bg-slate-100 text-slate-900 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-slate-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-900 border border-slate-200">garantia_subestacion_schneider_2025.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Transformadores de Potencia & Interruptores de Vacío</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Schneider Electric México</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>28 de Febrero de 2028</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                        <button
                          onClick={() => triggerToast("Diego AI descargó el certificado de garantía de Schneider Electric.")}
                          className="text-slate-900 hover:text-slate-800 font-bold underline cursor-pointer text-xs"
                        >
                          Ver Póliza de Garantía →
                        </button>
                        <span className="text-[11px] text-slate-500 font-medium">Carga Actual: 68% Capacity</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 4: MAPEI WATERPROOFING */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "ROOF") && (
                    <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-slate-400 transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                              Impermeabilización Techos
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">Superficie: 8,400 m²</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">Impermeabilización Mapei (Cinemex & Zona B)</h4>
                        </div>
                        <span className="bg-slate-100 text-slate-900 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía 10 Años ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-slate-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-900 border border-slate-200">garantia_impermeabilizacion_mapei_10a.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Garantía de 10 Años Libre de Filtraciones en Techos</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Mapei de México</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>15 de Junio de 2034</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                        <button
                          onClick={() => triggerToast("Diego AI programó la inspección anual previa a la temporada de lluvias.")}
                          className="text-slate-900 hover:text-slate-800 font-bold underline cursor-pointer text-xs"
                        >
                          Programar Inspección Anual →
                        </button>
                        <span className="text-[11px] text-slate-500 font-medium">Estado: 0 Filtraciones</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 5: JOHNSON CONTROLS FIRE PROTECTION (NEW) */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "FIRE") && (
                    <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-slate-400 transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                              Protección Incendio
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">Certificación: NFPA 25</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">Sistema de Aspersión & Bomba SimplexGrinnell</h4>
                        </div>
                        <span className="bg-slate-100 text-slate-900 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-slate-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-900 border border-slate-200">poliza_sistema_contra_incendio_2026.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Certificación NFPA 25 & Reemplazo de Válvulas de Retención</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Johnson Controls Fire Protection</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>30 de Septiembre de 2027</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                        <button
                          onClick={() => triggerToast("Diego AI confirmó la prueba de presión trimestral del sistema contra incendio.")}
                          className="text-slate-900 hover:text-slate-800 font-bold underline cursor-pointer text-xs"
                        >
                          Ver Dictamen Bomberos →
                        </button>
                        <span className="text-[11px] text-slate-500 font-medium">Presión: 140 PSI (OK)</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 6: CANADIAN SOLAR PANELS (NEW) */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "SOLAR") && (
                    <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-slate-400 transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                              Energía Solar Fotovoltaica
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">Capacidad: 350 kWp</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">Arreglo Fotovoltaico Canadian Solar (Techado C)</h4>
                        </div>
                        <span className="bg-slate-100 text-slate-900 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía 25 Años ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-slate-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-900 border border-slate-200">garantia_paneles_solares_canadian_25a.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>25 Años de Rendimiento Fotovoltaico al 85% de Eficiencia</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Canadian Solar México / Enel X</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>10 de Enero de 2048</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                        <button
                          onClick={() => triggerToast("Diego AI generó el reporte de generación limpia del arreglo solar.")}
                          className="text-slate-900 hover:text-slate-800 font-bold underline cursor-pointer text-xs"
                        >
                          Ver Eficiencia Inversores →
                        </button>
                        <span className="text-[11px] text-slate-500 font-medium">Generación: 42 MWh/mes</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 7: HIKVISION / FAAC PARKING (NEW) */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "SECURITY") && (
                    <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-slate-400 transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                              Seguridad & Acceso
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">6 Carriles LPR</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">Barreras Automatizadas & Cámaras FAAC / Hikvision</h4>
                        </div>
                        <span className="bg-slate-100 text-slate-900 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-slate-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-900 border border-slate-200">poliza_barreras_estacionamiento_faac.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Motores Hidráulicos FAAC & Cámaras de Reconocimiento LPR</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Hikvision & FAAC México</strong></p>
                        <p>📅 Vencimiento de Póliza: <strong>18 de Mayo de 2027</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                        <button
                          onClick={() => triggerToast("Diego AI solicitó calibración de la cámara LPR del carril 2.")}
                          className="text-slate-900 hover:text-slate-800 font-bold underline cursor-pointer text-xs"
                        >
                          Calibrar Cámaras LPR →
                        </button>
                        <span className="text-[11px] text-slate-500 font-medium">Uptime: 99.9%</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 8: GRUNDFOS WATER TREATMENT (NEW) */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "PLUMBING") && (
                    <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-slate-400 transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                              Hidráulico & Planta PTAR
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">PTAR 50 m³/día</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">Planta de Tratamiento & Bombas Grundfos</h4>
                        </div>
                        <span className="bg-slate-100 text-slate-900 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-slate-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-900 border border-slate-200">garantia_planta_tratamiento_grundfos.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Bombas Sumergibles, Membranas Biológicas & Control SBR</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Grundfos México</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>05 de Noviembre de 2027</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                        <button
                          onClick={() => triggerToast("Diego AI verificó la calidad de agua tratada para riego de áreas verdes.")}
                          className="text-slate-900 hover:text-slate-800 font-bold underline cursor-pointer text-xs"
                        >
                          Ver Reporte Calidad Agua →
                        </button>
                        <span className="text-[11px] text-slate-500 font-medium">Reutilización: 100% Riego</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "legal" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs font-sans">
              {/* MODULE HEADER & ACTION BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Agente Legal IA · Mariana AI
                    </span>
                  </div>
                  <h2 className="font-sans text-2xl font-bold text-slate-900 mt-1">
                    Mariana AI · Inteligencia Multi-Contrato & Exclusividades
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Supervisión activa de {rentRoll.length} contratos de arrendamiento, consultas legales en tiempo real y dictamen de exclusividades para prospectos.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => {
                      setCopilotOpen(true);
                      setActiveAgent("mariana");
                      triggerToast("Abriendo Copilot Sidebar con Mariana AI (Agente Legal)...");
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                  >
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>Copilot Mariana AI</span>
                  </button>
                  <button
                    onClick={() => {
                      setAttorneyNotified(true);
                      triggerToast("Notificación legal y expediente enviado a despacho de abogados.");
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    {attorneyNotified ? "Notificación Enviada ✓" : "Enviar a Despacho Legal"}
                  </button>
                </div>
              </div>

              {/* SUB-NAVIGATION PILLS BAR */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
                <button
                  onClick={() => setLegalSubTab("expedientes")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    legalSubTab === "expedientes"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  Expedientes & Anomalías (4)
                </button>
                <button
                  onClick={() => setLegalSubTab("consultas")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    legalSubTab === "consultas"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  Consola Legal Mariana AI
                </button>
                <button
                  onClick={() => setLegalSubTab("prospectos")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    legalSubTab === "prospectos"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  Viabilidad de Prospectos (Exclusividades)
                </button>
                <button
                  onClick={() => setLegalSubTab("marco_legal")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    legalSubTab === "marco_legal"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
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
                      <h3 className="font-sans text-base font-bold text-slate-900">
                        Directorio General de Contratos Activos
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Resumen ejecutivo de expedientes. Haz clic en cualquier fila para desplegar el desglose de cláusulas auditadas.
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-200 shrink-0 cursor-default select-none"
                      title="SSOT = Single Source of Truth / Fuente Única de Verdad"
                    >
                      9 de {rentRoll.length} Indexados (SSOT)
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px] tracking-wider">
                        <tr>
                          <th className="p-3.5">Inquilino & Ubicación</th>
                          <th
                            className="p-3.5 cursor-default select-none"
                            title="SSOT = Single Source of Truth / Fuente Única de Verdad (Contrato Base + Póliza de Seguro)"
                          >
                            Expediente SSOT (2 Docs)
                          </th>
                          <th className="p-3.5">Vencimiento Contrato</th>
                          <th className="p-3.5">Garantía / Fianza</th>
                          <th className="p-3.5">Estatus Legal & Fiscal SAT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {[
                          {
                            id: "c-260",
                            brand: "260 Grill & Bar",
                            unit: "Local 10-01",
                            sqm: "320 m²",
                            pdf: "contrato_260_grill_2026_firmado.pdf",
                            insurancePdf: "poliza_seguro_260_grill_2026.pdf",
                            hash: "sha256-8f3a9e2...",
                            vectorChunks: 142,
                            expirationDate: "31 Oct 2026",
                            timeRemaining: "En 2 meses",
                            exclusivityClause: "Cláusula 18.1: Exclusividad en concepto Steakhouse & Gastro-Pub en bloque 10. No afecta cafeterías ni tiendas retail.",
                            inpcClause: "Cláusula 7.2: Incremento anual de Renta Base indexado al INPC publicado por INEGI en Octubre.",
                            penaltyClause: "Cláusula 22.4: Penalización equitativa a 6 meses de Renta Base por rescisión anticipada.",
                            deposit: "$153,600 MXN (2 Meses)",
                            anomaly: "Alerta SAT: Pendiente timbrado CFDI 4.0",
                            status: "Renovación Próxima",
                            statusBadge: "bg-slate-900 text-white",
                            insuranceStatus: "ok",
                          },
                          {
                            id: "c-cinemex",
                            brand: "Cinemex Premium",
                            unit: "Local 9-22",
                            sqm: "1,180 m²",
                            pdf: "contrato_cinemex_premium_2028.pdf",
                            insurancePdf: "poliza_seguro_cinemex_premium_2028.pdf",
                            hash: "sha256-1b4d8c7...",
                            vectorChunks: 580,
                            expirationDate: "15 Jun 2028",
                            timeRemaining: "22 meses vigentes",
                            exclusivityClause: "Cláusula 24.3: Exclusividad territorial absoluta para salas de cine en radio de 5km.",
                            inpcClause: "Cláusula 9.1: Ajuste trienal fijo del +5.0% sobre Renta Base.",
                            penaltyClause: "Cláusula 30.1: Incumplimiento grave faculta rescisión inmediata con retención de fianza.",
                            deposit: "$849,600 MXN (Fianza Banorte)",
                            anomaly: "Sin anomalías. 100% al día.",
                            status: "Vigente SSOT",
                            statusBadge: "bg-slate-100 text-slate-800 border border-slate-200",
                            insuranceStatus: "ok",
                          },
                          {
                            id: "c-blueluna",
                            brand: "Blue Luna Café",
                            unit: "Local 4-16",
                            sqm: "180 m²",
                            pdf: "contrato_blue_luna_cafe_2027.pdf",
                            insurancePdf: "poliza_seguro_blue_luna_cafe_vence_nov2026.pdf",
                            hash: "sha256-9a2c1f4...",
                            vectorChunks: 98,
                            expirationDate: "30 Nov 2027",
                            timeRemaining: "15 meses vigentes",
                            exclusivityClause: "Cláusula 14.2: Exclusividad de café preparado y repostería artesanal únicamente en Zona 4.",
                            inpcClause: "Cláusula 6.1: Ajuste anual INPC + 1.5% cada primero de Enero.",
                            penaltyClause: "Cláusula 19.3: Preaviso de 90 días naturales con indemnización de 3 meses.",
                            deposit: "$130,000 MXN (Carta Crédito)",
                            anomaly: "Alerta Legal: Póliza de seguro vence Nov 2026",
                            status: "Revisar Seguro",
                            statusBadge: "bg-amber-100 text-amber-900 border border-amber-300",
                            insuranceStatus: "warning",
                          },
                          {
                            id: "c-ashley",
                            brand: "Ashley",
                            unit: "Local 9-07",
                            sqm: "1,450 m²",
                            pdf: "contrato_ashley_muebles_2029.pdf",
                            insurancePdf: "poliza_seguro_ashley_muebles_2029.pdf",
                            hash: "sha256-3e7b8a1...",
                            vectorChunks: 310,
                            expirationDate: "15 Mar 2029",
                            timeRemaining: "31 meses vigentes",
                            exclusivityClause: "Cláusula 12.1: Exclusividad en tienda ancla de muebles y decoración para el hogar.",
                            inpcClause: "Cláusula 8.4: Ajuste condicionado a ventas brutas auditadas >$15M MXN.",
                            penaltyClause: "Cláusula 25.2: Penalización de 3 meses de renta base.",
                            deposit: "$1,044,000 MXN (Garantía Santander)",
                            anomaly: "Sin anomalías. 100% al día.",
                            status: "Vigente SSOT",
                            statusBadge: "bg-slate-100 text-slate-800 border border-slate-200",
                            insuranceStatus: "ok",
                          },
                          {
                            id: "c-fairfield",
                            brand: "Fairfield Inn & Suites by Marriott",
                            unit: "Local 8-28",
                            sqm: "850 m²",
                            pdf: "contrato_fairfield_marriott_2027.pdf",
                            insurancePdf: "poliza_seguro_fairfield_marriott_2027.pdf",
                            hash: "sha256-4f9e1d8...",
                            vectorChunks: 215,
                            expirationDate: "15 Dic 2026",
                            timeRemaining: "En 4 meses",
                            exclusivityClause: "Cláusula 10.3: Exclusividad de marca hotelera de servicio completo dentro de la plaza.",
                            inpcClause: "Cláusula 5.2: Ajuste anual INPC INEGI en Enero.",
                            penaltyClause: "Cláusula 16.1: Rescisión anticipada con penalización de 4 meses.",
                            deposit: "$408,000 MXN (Fianza BBVA)",
                            anomaly: "Sin anomalías. Timbrado SAT verificado.",
                            status: "Renovación Próxima",
                            statusBadge: "bg-slate-900 text-white",
                            insuranceStatus: "ok",
                          },
                          {
                            id: "c-holidayinn",
                            brand: "Holiday Inn Express",
                            unit: "Local 8-34",
                            sqm: "850 m²",
                            pdf: "contrato_holiday_inn_express_2028.pdf",
                            insurancePdf: "poliza_seguro_holiday_inn_express_2028.pdf",
                            hash: "sha256-7c2a9b4...",
                            vectorChunks: 180,
                            expirationDate: "30 Sep 2028",
                            timeRemaining: "25 meses vigentes",
                            exclusivityClause: "Cláusula 15.4: Exclusividad de marca hotelera de estadía económica/extendida dentro de la plaza.",
                            inpcClause: "Cláusula 7.1: Ajuste anual INPC en Octubre.",
                            penaltyClause: "Cláusula 21.2: Penalización de 3 meses de renta base.",
                            deposit: "$408,000 MXN (Depósito Scotia)",
                            anomaly: "Alerta SAT: Pendiente timbrado parcial Jul 2026",
                            status: "Alerta SAT",
                            statusBadge: "bg-slate-900 text-white",
                            insuranceStatus: "ok",
                          },
                          {
                            id: "c-bodega8",
                            brand: "Bodega 8",
                            unit: "Local 7-17",
                            sqm: "320 m²",
                            pdf: "contrato_bodega_8_2027.pdf",
                            insurancePdf: "poliza_seguro_bodega_8_2027.pdf",
                            hash: "sha256-5d1b3e9...",
                            vectorChunks: 195,
                            expirationDate: "30 Abr 2027",
                            timeRemaining: "8 meses vigentes",
                            exclusivityClause: "Cláusula 11.2: Concepto de restaurante-bar con terraza. Sin restricción sobre cocina internacional de otros locales.",
                            inpcClause: "Cláusula 6.3: Ajuste INPC anual.",
                            penaltyClause: "Cláusula 18.4: Penalización de 2 meses de renta base.",
                            deposit: "$153,600 MXN (Fianza Banamex)",
                            anomaly: "Sin anomalías. Contrato al día.",
                            status: "Vigente SSOT",
                            statusBadge: "bg-slate-100 text-slate-800 border border-slate-200",
                            insuranceStatus: "ok",
                          },
                          {
                            id: "c-petco",
                            brand: "PETCO",
                            unit: "Local 9-60",
                            sqm: "420 m²",
                            pdf: "contrato_petco_2029.pdf",
                            insurancePdf: "poliza_seguro_petco_2029.pdf",
                            hash: "sha256-2e8f4a1...",
                            vectorChunks: 240,
                            expirationDate: "15 Nov 2029",
                            timeRemaining: "39 meses vigentes",
                            exclusivityClause: "Cláusula 13.1: Exclusividad en tienda de mascotas y servicios veterinarios.",
                            inpcClause: "Cláusula 8.1: Ajuste anual INPC en Noviembre.",
                            penaltyClause: "Cláusula 24.1: Preaviso de 120 días con penalización de 4 meses.",
                            deposit: "$201,600 MXN (Garantía HSBC)",
                            anomaly: "Sin anomalías. 100% al día.",
                            status: "Vigente SSOT",
                            statusBadge: "bg-slate-100 text-slate-800 border border-slate-200",
                            insuranceStatus: "ok",
                          },
                          {
                            id: "c-symmetry",
                            brand: "SYMMETRY GYM Mexicali",
                            unit: "Local 9-72",
                            sqm: "60 m²",
                            pdf: "contrato_symmetry_gym_2030.pdf",
                            insurancePdf: "poliza_seguro_symmetry_gym_2030.pdf",
                            hash: "sha256-9b3c4e2...",
                            vectorChunks: 380,
                            expirationDate: "31 Ene 2030",
                            timeRemaining: "41 meses vigentes",
                            exclusivityClause: "Cláusula 17.2: Operación de gimnasio de alta afluencia.",
                            inpcClause: "Cláusula 9.4: Ajuste bienal fijo +6.0%.",
                            penaltyClause: "Cláusula 28.3: Rescisión por falta de pago consecutiva de 2 meses.",
                            deposit: "$28,800 MXN (Carta Crédito)",
                            anomaly: "Sin anomalías. 100% al día.",
                            status: "Vigente SSOT",
                            statusBadge: "bg-slate-100 text-slate-800 border border-slate-200",
                            insuranceStatus: "ok",
                          },
                          {
                            id: "c-cabanna",
                            brand: "Cabanna",
                            unit: "Local 4-20",
                            sqm: "320 m²",
                            pdf: "contrato_cabanna_2028.pdf",
                            insurancePdf: "poliza_seguro_cabanna_2028.pdf",
                            hash: "sha256-6a1b2c3...",
                            vectorChunks: 490,
                            expirationDate: "31 Ago 2028",
                            timeRemaining: "24 meses vigentes",
                            exclusivityClause: "Cláusula 20.1: Concepto de restaurante casual con menú internacional y terraza al aire libre.",
                            inpcClause: "Cláusula 11.1: Ajuste anual INPC + porcentaje sobre ventas.",
                            penaltyClause: "Cláusula 32.1: Preaviso de 180 días con indemnización de 6 meses.",
                            deposit: "$153,600 MXN (Fianza Santander)",
                            anomaly: "Alerta Legal: Revisión quinquenal de mantenimiento en curso",
                            status: "Revisión Quinquenal",
                            statusBadge: "bg-amber-100 text-amber-900 border border-amber-300",
                            insuranceStatus: "ok",
                          },
                        ].map((c) => (
                          <Fragment key={c.id}>
                            <tr
                              onClick={() => {
                                setInspectedContractId(inspectedContractId === c.id ? null : c.id);
                                triggerToast(`Mariana AI mostró extracto RAG de ${c.pdf}`);
                              }}
                              className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                            >
                              <td className="p-3.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 font-bold text-[10px] select-none">
                                    {inspectedContractId === c.id ? "▲" : "▼"}
                                  </span>
                                  <div>
                                    <p className="font-bold text-slate-900 text-xs">{c.brand}</p>
                                    <p className="text-[11px] text-slate-500">{c.unit} · {c.sqm}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => triggerToast(`Abriendo ${c.pdf} (Contrato SSOT)...`)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2.5 py-1 rounded-lg text-[11px] border border-slate-200 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                                  >
                                    Contrato PDF
                                  </button>
                                  <button
                                    onClick={() => triggerToast(`Abriendo ${c.insurancePdf} (Comprobante de Póliza)...`)}
                                    className={`font-bold px-2.5 py-1 rounded-lg text-[11px] border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                                      c.insuranceStatus === "warning"
                                        ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 font-extrabold"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                                    }`}
                                  >
                                    {c.insuranceStatus === "warning" ? "Póliza (Vence Nov 26)" : "Póliza RC"}
                                  </button>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <p className="font-bold text-slate-900 text-xs">{c.expirationDate}</p>
                                <p className="text-[11px] text-slate-500 font-medium">{c.timeRemaining}</p>
                              </td>
                              <td className="p-3.5 font-semibold text-slate-800 text-xs">{c.deposit}</td>
                              <td className="p-3.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.statusBadge}`}>
                                    {c.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 mt-1 font-medium">{c.anomaly}</p>
                              </td>
                            </tr>

                            {/* EXPANDABLE CLAUSE DETAIL ROW (HIGH-LEGIBILITY EXECUTIVE LIGHT THEME) */}
                            {inspectedContractId === c.id && (
                              <tr className="bg-slate-50/90 text-slate-900 animate-fadeIn border-b-2 border-slate-200">
                                <td colSpan={5} className="p-5 space-y-4 font-sans text-xs">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                                    <div>
                                      <h4 className="font-bold text-sm text-slate-900">
                                        Reconciliación Mariana AI: Contrato Base SSOT vs Póliza de Seguro
                                      </h4>
                                      <p className="text-xs text-slate-500 font-mono mt-0.5">Firma Digital SHA-256: {c.hash}</p>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setCopilotOpen(true);
                                        setActiveAgent("mariana");
                                        setQueryResult(`Mariana AI (Legal Agent): Expediente RAG ${c.pdf} cargado. ¿Qué cláusula deseas auditar sobre ${c.brand}?`);
                                        triggerToast(`Expediente ${c.brand} cargado en Copilot Sidebar.`);
                                      }}
                                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
                                    >
                                      Consultar expediente en Copilot →
                                    </button>
                                  </div>

                                  {/* DUAL DOCUMENT RECONCILIATION BADGE */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-bold text-slate-900">Auditoría SSOT:</span>
                                      <span className="text-slate-700">1. Contrato Base: <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-900 border border-slate-200">{c.pdf}</code></span>
                                      <span className="text-slate-300">|</span>
                                      <span className="text-slate-700">2. Póliza RC: <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-900 border border-slate-200">{c.insurancePdf}</code></span>
                                    </div>
                                    <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 text-xs shrink-0">
                                      Reconciliación: {c.status}
                                    </span>
                                  </div>

                                  {/* 3 HIGH-CONTRAST CLAUSE CARDS */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                      <p className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">Cláusula de Exclusividad</p>
                                      <p className="text-slate-800 text-xs leading-relaxed font-medium">{c.exclusivityClause}</p>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                      <p className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">Ajuste de Renta INPC</p>
                                      <p className="text-slate-800 text-xs leading-relaxed font-medium">{c.inpcClause}</p>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                      <p className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">Penalización & Resguardo</p>
                                      <p className="text-slate-800 text-xs leading-relaxed font-medium">{c.penaltyClause}</p>
                                    </div>
                                  </div>

                                  {c.id === "c-260" && (
                                    <div className="bg-slate-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div>
                                        <p className="text-white font-bold text-xs">Vence {c.expirationDate} ({c.timeRemaining})</p>
                                        <p className="text-slate-300 text-[11px] mt-0.5">
                                          Mariana AI puede redactar el borrador de renovación a partir de {c.pdf}, actualizando solo los parámetros que corresponde.
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setRenewalDraftOpen(true);
                                          triggerToast(`Mariana AI generó el borrador de renovación de ${c.brand}.`);
                                        }}
                                        className="bg-white hover:bg-slate-100 text-slate-900 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
                                      >
                                        {renewalSent ? "Ver Borrador Enviado ✓" : "Generar Borrador de Renovación →"}
                                      </button>
                                    </div>
                                  )}
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

              {/* SUB-TAB 2: CONSOLA DE CONSULTA LEGAL ESTILO CHATGPT CON TARJETAS GRANDES */}
              {legalSubTab === "consultas" && (
                <div className="space-y-6 animate-fadeIn font-sans">
                  {/* CONTINUOUS CONTRACT ANALYTICS KPI CARDS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Cobertura Indexación INPC</span>
                        <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">81 / {rentRoll.length} Contratos</span>
                      </div>
                      <p className="text-xl font-extrabold text-slate-900 tracking-tight">96.4%</p>
                      <p className="text-xs text-slate-600 font-medium">Promedio: INPC + 1.8% · 3 contratos antiguos a renta fija.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Fianzas & Garantías SSOT</span>
                        <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">Resguardo 100%</span>
                      </div>
                      <p className="text-xl font-extrabold text-slate-900 tracking-tight">
                        {currency === "USD" ? "$1.05M USD" : "$18.4M MXN"}
                      </p>
                      <p className="text-xs text-slate-600 font-medium">Equivalente a 2.4 meses promedio de renta por local.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Pólizas RC Vigentes</span>
                        <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded">2 por renovar</span>
                      </div>
                      <p className="text-xl font-extrabold text-slate-900 tracking-tight">97.5%</p>
                      <p className="text-xs text-slate-600 font-medium">260 Grill & Blue Luna Café notificados por Mariana AI.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Exclusividades Protegidas</span>
                        <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">0 Colisiones</span>
                      </div>
                      <p className="text-xl font-extrabold text-slate-900 tracking-tight">14 Giros</p>
                      <p className="text-xs text-slate-600 font-medium">Zonas A, B y C monitoreadas en tiempo real.</p>
                    </div>
                  </div>

                  {/* CHATGPT-STYLE MAIN HERO PROMPT COMPOSER */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-slate-900" />
                        <h3 className="font-sans text-lg sm:text-xl font-extrabold text-slate-900">
                          Preguntar a Mariana AI sobre los {rentRoll.length} Contratos
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                        Haz clic en cualquier pregunta frecuente abajo o escribe tu consulta legal sobre rentas, depósitos, exclusividades o penalizaciones:
                      </p>
                    </div>

                    {/* PROMPT COMPOSER INPUT BOX */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="text"
                        value={ragQueryText}
                        onChange={(e) => setRagQueryText(e.target.value)}
                        placeholder="Ej: ¿Qué contratos contemplan derecho de preferencia para renovación en 2026?..."
                        className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-5 py-3.5 text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 font-semibold shadow-inner transition-all"
                      />
                      <button
                        onClick={() => {
                          if (!ragQueryText) return;
                          setActiveRagQueryResult(
                            `Dictamen Mariana AI: Para la consulta "${ragQueryText}", se analizaron simultáneamente los ${rentRoll.length} expedientes contractuales. Se identificaron 3 contratos con derecho de preferencia explícito (260 Grill & Bar, Cinemex Premium y Ashley), sujetos a notificación escrita con 90 días de anticipación al vencimiento.`
                          );
                          triggerToast("Mariana AI procesó la consulta legal.");
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3.5 rounded-2xl text-xs sm:text-sm transition-all cursor-pointer shrink-0 shadow-md flex items-center justify-center gap-2"
                      >
                        <span>Consultar Contratos →</span>
                      </button>
                    </div>

                    {/* CHATGPT-STYLE LARGE FAQ PROMPT CARDS GRID (4 LARGE INTERACTIVE CARDS) */}
                    <div className="space-y-3 pt-2">
                      <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                        Preguntas Frecuentes Reconciliadas (Haz Clic para Probar):
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        {/* FAQ CARD 1: INPC */}
                        <div
                          onClick={() => {
                            const q = "¿Cuáles contratos se ajustan con el incremento de inflación INPC en Q4 2026?";
                            setRagQueryText(q);
                            setActiveRagQueryResult(
                              `Dictamen Mariana AI (Ajuste INPC Q4): El 96.2% de los ${rentRoll.length} contratos contemplan incremento anual indexado al INPC + 1.8%. En Q4 2026 (1 de Octubre), aplica el ajuste proyectado para Holiday Inn Express (contrato_holiday_inn_express_2028.pdf, Cláusula 7.1) y Blue Luna Café (contrato_blue_luna_cafe_2027.pdf, Cláusula 6.1). Las notificaciones de cobro están pre-generadas.`
                            );
                            triggerToast("Mariana AI analizó los ajustes INPC.");
                          }}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-2xl p-4 cursor-pointer transition-all hover:border-slate-400 space-y-1.5 group shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                              Ajuste INPC
                            </span>
                            <span className="text-xs text-slate-400 font-bold group-hover:text-slate-900 transition-colors">Probar →</span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            ¿Cuáles contratos se ajustan con la inflación en Octubre 2026?
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            Consulta incrementos anuales INPC programados en Q4 para Holiday Inn Express y Blue Luna Café.
                          </p>
                        </div>

                        {/* FAQ CARD 2: PENALIZACIONES */}
                        <div
                          onClick={() => {
                            const q = "¿Qué inquilinos tienen penalización por término anticipado mayores a 3 meses de renta?";
                            setRagQueryText(q);
                            setActiveRagQueryResult(
                              `Dictamen Mariana AI (Penalizaciones): De los ${rentRoll.length} contratos, únicamente 2 contemplan retención y pena convencional superior a 3 meses: Cinemex Premium (retención total de fianza + 6 meses) y 260 Grill & Bar (6 meses de renta fija). El 97% restante prevé la pena estándar de 3 meses conforme al Código Civil de BC.`
                            );
                            triggerToast("Mariana AI analizó penalizaciones por rescisión.");
                          }}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-2xl p-4 cursor-pointer transition-all hover:border-slate-400 space-y-1.5 group shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                              Rescisión & Penalización
                            </span>
                            <span className="text-xs text-slate-400 font-bold group-hover:text-slate-900 transition-colors">Probar →</span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            ¿Qué inquilinos tienen penalización por término anticipado mayores a 3 meses?
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            Audita cláusulas de retención de fianza y penalizaciones de salida voluntaria.
                          </p>
                        </div>

                        {/* FAQ CARD 3: FIANZAS */}
                        <div
                          onClick={() => {
                            const q = "Compara los depósitos en garantía de Cinemex Premium vs 260 Grill & Bar";
                            setRagQueryText(q);
                            setActiveRagQueryResult(
                              `Dictamen Mariana AI (Comparativa de Garantías): Cinemex Premium mantiene en resguardo un depósito equivalente a 3 meses de renta ($849,600 MXN en fideicomiso), mientras que 260 Grill & Bar mantiene 2 meses de renta ($153,600 MXN). Ambos expedientes tienen sus pólizas de fianza respaldadas al 100%.`
                            );
                            triggerToast("Mariana AI ejecutó comparativa de garantias.");
                          }}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-2xl p-4 cursor-pointer transition-all hover:border-slate-400 space-y-1.5 group shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                              Garantías SSOT
                            </span>
                            <span className="text-xs text-slate-400 font-bold group-hover:text-slate-900 transition-colors">Probar →</span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            Compara depósitos en garantía de Cinemex Premium vs 260 Grill & Bar
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            Desglose de montos en resguardo y meses de renta en fideicomiso administrado.
                          </p>
                        </div>

                        {/* FAQ CARD 4: PRÓRROGAS */}
                        <div
                          onClick={() => {
                            const q = "¿Cuáles contratos tienen opción a prórroga automática y derecho del tanto?";
                            setRagQueryText(q);
                            setActiveRagQueryResult(
                              `Dictamen Mariana AI (Opción a Prórroga): Se identificaron 3 contratos con opción preferencial a prórroga quinquenal: Blue Luna Café (vence Nov 2027, ventana de ejercicio en Ago 2027), Ashley (vence Mar 2029) y Cinemex Premium (vence Jun 2028). Todos exigen aviso formal escrito con 90 días de anticipación.`
                            );
                            triggerToast("Mariana AI verificó cláusulas de prórroga.");
                          }}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-2xl p-4 cursor-pointer transition-all hover:border-slate-400 space-y-1.5 group shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                              Prórrogas & Derecho del Tanto
                            </span>
                            <span className="text-xs text-slate-400 font-bold group-hover:text-slate-900 transition-colors">Probar →</span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            ¿Cuáles contratos tienen opción a prórroga automática y derecho del tanto?
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            Revisa los 90 días de notificación obligatoria previa al vencimiento del arrendamiento.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ACTIVE CHATGPT RESPONSE CONTAINER (HIGH LEGIBILITY) */}
                    {activeRagQueryResult && (
                      <div className="bg-slate-50 border-2 border-slate-900 p-6 rounded-2xl space-y-4 shadow-md animate-fadeIn mt-4 font-sans">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                            <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                              Dictamen Emitido por Mariana AI (Agente Legal SSOT)
                            </span>
                          </div>
                          <button
                            onClick={() => setActiveRagQueryResult(null)}
                            className="text-slate-600 hover:text-slate-900 font-bold text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-300 cursor-pointer shadow-2xs"
                          >
                            Cerrar Dictamen ✕
                          </button>
                        </div>

                        <p className="leading-relaxed text-slate-900 font-semibold text-sm sm:text-base bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
                          {activeRagQueryResult}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                          <span className="text-slate-500 font-mono">Verificación SHA-256: 8f4a9b2c | {rentRoll.length} Contratos Auditados</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => triggerToast("Dictamen legal copiado al portapapeles.")}
                              className="bg-white hover:bg-slate-100 text-slate-800 font-bold px-3.5 py-1.5 rounded-lg border border-slate-300 transition-all cursor-pointer shadow-2xs text-xs"
                            >
                              Copiar Respuesta
                            </button>
                            <button
                              onClick={() => {
                                setAttorneyNotified(true);
                                triggerToast("Dictamen y expediente enviado al despacho de abogados.");
                              }}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs text-xs"
                            >
                              Enviar a Despacho Legal →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AUTOMATED LEGAL INSIGHTS & RISK FEED */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Hallazgos Automatizados por Análisis Continuo de Mariana AI
                      </h4>
                      <span className="text-xs font-bold text-slate-500">Actualizado hoy a las 06:00 hrs</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                            Ajuste de Renta INPC
                          </span>
                          <span className="text-xs font-bold text-slate-500">Q4 2026</span>
                        </div>
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900">Aumento Programado Holiday Inn & Blue Luna</h5>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Mariana AI identificó que el 1 de Octubre de 2026 aplica el ajuste INPC (Cláusula 7.1) en Holiday Inn Express y Blue Luna Café. Las notificaciones legales ya están listas.
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                            Renovación Póliza RC
                          </span>
                          <span className="text-xs font-bold text-slate-500">Vence 31 Ago</span>
                        </div>
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900">Póliza Seguro 260 Grill & Bar</h5>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          La póliza de seguro de responsabilidad civil por $5.0M MXN vence en 21 días. Mariana AI envió recordatorio automático a la gerencia del restaurante.
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                            Prórroga Contractual
                          </span>
                          <span className="text-xs font-bold text-slate-500">Ago 2027</span>
                        </div>
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900">Derecho del Tanto Blue Luna Café</h5>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Blue Luna Café cuenta con ventana de notificación previa de 90 días (Ago 2027) para ejercer su opción a prórroga quinquenal en Zona 4.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: EVALUADOR DE VIABILIDAD DE NUEVOS INQUILINOS (EXCLUSIVIDADES) */}
              {legalSubTab === "prospectos" && (
                <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-6 space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 bg-slate-200 px-2.5 py-0.5 rounded-md">
                          Inteligencia de Arrendamiento
                        </span>
                        <h3 className="font-sans text-base font-bold text-slate-900">
                          Evaluador de Viabilidad Legal de Nuevos Inquilinos (Exclusividades RAG)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Mariana AI cruza el giro y ubicación del prospecto contra los {rentRoll.length} contratos vigentes para prevenir violaciones de exclusividad.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 shrink-0">
                      {rentRoll.length} Contratos Audibles
                    </span>
                  </div>

                  {/* PRESET PROSPECT SELECTOR BAR */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
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
                              triggerToast(`Mariana AI ejecutó auditoría RAG para ${p.brand}...`);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900"
                                : "bg-white hover:bg-slate-100 text-slate-900 border-slate-200 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs">{p.brand}</span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isSelected ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>
                                {p.tag}
                              </span>
                            </div>
                            <p className={`text-[11px] mt-1 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>{p.unit}</p>
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
                          className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-500 font-medium"
                        />
                        <select
                          value={customProspectCategory}
                          onChange={(e) => setCustomProspectCategory(e.target.value)}
                          className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
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
                          triggerToast(`Mariana AI ejecutó auditoría RAG cruzada para ${customProspectBrand}...`);
                        }}
                        className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all cursor-pointer shrink-0 shadow-2xs"
                      >
                        Auditar con Mariana AI
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
                          reasoning: `Dictamen Mariana AI (RAG Legal Audit): VIABLE SIN CONFLICTO. Tras auditar la marca ${customProspectBrand} (${customProspectCategory}) contra el índice vectorial de los ${rentRoll.length} contratos de La Gran Vía, Mariana AI confirma que no se detectaron cláusulas de exclusividad ni radio restrictivo en su categoría comercial.`,
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
                            reasoning: "Dictamen Mariana AI (RAG Legal Audit): VIABLE SIN CONFLICTO DE EXCLUSIVIDAD. El contrato de Blue Luna Café (contrato_blue_luna_cafe_2027.pdf, Cláusula 14.2) limita estrictamente la exclusividad de expendio de café preparado a la crujía de Zona 4 (Local 4-16). El Local B-14 está ubicado en Zona B (Zona Gastronómica Exterior), fuera de la delimitación territorial de exclusividad. Asimismo, no colisiona con 260 Grill & Bar ni Cinemex Premium.",
                            conflictingContract: "Ninguno (Local B-14 fuera de Zona 4)",
                            snippet: "Cláusula 14.2 de Blue Luna Café: 'El derecho de exclusividad para expendio de café de especialidad comprende única y exclusivamente la crujía de Zona 4 del inmueble comercial.'",
                          },
                          {
                            brand: "Krispy Kreme",
                            category: "Donas & Café",
                            requestedUnit: "Local A-08 (140 m²)",
                            zone: "Zona A",
                            viable: false,
                            reasoning: "Dictamen Mariana AI (RAG Legal Audit): CONFLICTO DETECTADO (IMPROCEDENTE). El Local A-08 colinda directamente con el pasillo central de Zona 4. El contrato vigente de Blue Luna Café (contrato_blue_luna_cafe_2027.pdf, Cláusula 14.2) otorga exclusividad sobre conceptos de café preparado y repostería en toda la Zona 4. El arrendamiento a Krispy Kreme en esta ubicación provocaría una demanda por rescisión con penalización a favor de Blue Luna Café.",
                            conflictingContract: "contrato_blue_luna_cafe_2027.pdf (Cláusula 14.2)",
                            snippet: "Cláusula 14.2 de Blue Luna Café: 'El Arrendador se obliga expresamente a no arrendar ni subarrendar ningún local comercial de la Zona 4 a empresas cuyo giro principal sea el expendio de café o donas.'",
                          },
                          {
                            brand: "Buffalo Wild Wings",
                            category: "Sports Bar & Alitas",
                            requestedUnit: "Local 10-04 (450 m²)",
                            zone: "Zona 10",
                            viable: false,
                            reasoning: "Dictamen Mariana AI (RAG Legal Audit): CONFLICTO DETECTADO (IMPROCEDENTE). El contrato firmado con 260 Grill & Bar (contrato_260_grill_2026_firmado.pdf, Cláusula 18.1) estipula un radio de exclusividad de 50 metros para conceptos de Sports Bar gastronómico con transmisión deportiva en pantallas gigantes. El Local 10-04 se encuentra a sólo 15 metros del Local 10-01.",
                            conflictingContract: "contrato_260_grill_2026_firmado.pdf (Cláusula 18.1)",
                            snippet: "Cláusula 18.1 de 260 Grill: 'Queda prohibida la instalación de Sports Bar u hostelería con pantalla gigante dentro de los locales contiguos del mismo bloque 10.'",
                          },
                          {
                            brand: "Planet Fitness",
                            category: "Gimnasio & Salud",
                            requestedUnit: "Local C-02 (850 m²)",
                            zone: "Zona C",
                            viable: true,
                            reasoning: `Dictamen Mariana AI (RAG Legal Audit): VIABLE SIN CONFLICTO. Ningún contrato vigente en el índice RAG de los ${rentRoll.length} inquilinos de La Gran Vía contempla cláusulas de exclusividad en giros de acondicionamiento físico o gimnasios. Operación 100% procedente.`,
                            conflictingContract: `Ninguno (0 Conflictos en ${rentRoll.length} contratos SSOT)`,
                            snippet: "Bóveda Legal RAG: 'No existen cláusulas restrictivas relativas a centros de salud, fitness o gimnasios en la plaza.'",
                          },
                        ][selectedProspectIndex];

                    return (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="h-3 w-3 rounded-full bg-slate-900 shrink-0" />
                            <div>
                              <h4 className="font-sans font-bold text-slate-900 text-sm">
                                Dictamen RAG: {prospect.brand} ({prospect.category})
                              </h4>
                              <p className="text-xs text-slate-500 font-medium">Espacio evaluado: {prospect.requestedUnit}</p>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${
                              prospect.viable
                                ? "bg-slate-100 text-slate-900 border-slate-300"
                                : "bg-slate-900 text-white border-slate-900"
                            }`}
                          >
                            {prospect.viable ? "VIABLE (SIN CONFLICTOS)" : "CONFLICTO DE EXCLUSIVIDAD"}
                          </span>
                        </div>

                        <div className="space-y-3 text-xs">
                          <p className="text-slate-800 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                            {prospect.reasoning}
                          </p>

                          <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-1.5 shadow-2xs font-sans">
                            <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold">
                              <span>Evidencia RAG Extraída ({prospect.conflictingContract}):</span>
                              <span className="text-slate-400">Páginas de Contrato Verificadas</span>
                            </div>
                            <p className="italic text-slate-200 text-xs font-serif">&ldquo;{prospect.snippet}&rdquo;</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* SUB-TAB 4: MARCO JURÍDICO & RADAR DE LEYES (LEYES FEDERALES & BAJA CALIFORNIA) */}
              {legalSubTab === "marco_legal" && (
                <div className="space-y-6 animate-fadeIn font-sans">
                  {/* RADAR HEADER BANNER */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 bg-slate-200 px-2.5 py-0.5 rounded-md">
                            Supervisión Normativa
                          </span>
                          <h3 className="font-sans text-base font-bold text-slate-900">
                            Radar de Leyes & Reformas Legislativas (DOF & Baja California)
                          </h3>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Mariana AI monitorea continuamente las publicaciones del Diario Oficial de la Federación (DOF) y del Periódico Oficial de Baja California (POE) para verificar automáticamente los {rentRoll.length} contratos vigentes ante cambios legales.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          onClick={() => triggerToast("Selecciona el archivo PDF o XML del Código o Reforma Legal para indexar en Mariana AI...")}
                          className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                        >
                          + Cargar Nueva Ley (PDF/XML)
                        </button>
                        <button
                          onClick={() => {
                            const nowStr = `Hoy, 10 Ago 2026 · ${new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} hrs`;
                            setLastLawScanDate(nowStr);
                            triggerToast(`Mariana AI consultó DOF y POE Baja California. 0 reformas recientes afectan los ${rentRoll.length} contratos.`);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                        >
                          Verificar Reformas Ahora
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 font-medium pt-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-800" />
                        <span>Última Verificación de Leyes: <strong>{lastLawScanDate}</strong></span>
                      </div>
                      <span className="bg-white text-slate-800 font-bold px-3 py-1 rounded-lg border border-slate-200 text-[11px]">
                        {rentRoll.length} Contratos Auditados vs Normativa BC & Federal
                      </span>
                    </div>
                  </div>

                  {/* 4 INGESTED LAW FRAMEWORK CARDS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* LAW CARD 1: CÓDIGO CIVIL BAJA CALIFORNIA */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs hover:border-slate-400 transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                              Estatal · Baja California
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">Art. 2270 - 2345</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">
                            Código Civil para el Estado de Baja California
                          </h4>
                        </div>
                        <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Vigente POE 2026
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        Regula los requisitos formales del arrendamiento comercial en Mexicali y Baja California: plazos de renovación por buena fe, derecho del tanto y reglas de rescisión por mora en el estado.
                      </p>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Estado de Contratos en Plaza:</span>
                        <span className="text-slate-900 font-extrabold">{rentRoll.length} de {rentRoll.length} Cumplen 100% ✓</span>
                      </div>
                    </div>

                    {/* LAW CARD 2: CÓDIGO CIVIL FEDERAL */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs hover:border-slate-400 transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                              Federal · México
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">Art. 2398 - 2499</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">
                            Código Civil Federal (DOF Última Reforma 2026)
                          </h4>
                        </div>
                        <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Vigente DOF 2026
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        Normativa supletoria nacional para la interpretación de convenios mercantiles, penas convencionales por rescisión anticipada e incremento anual de rentas indexado al INPC.
                      </p>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Estado de Contratos en Plaza:</span>
                        <span className="text-slate-900 font-extrabold">{rentRoll.length} de {rentRoll.length} Cumplen 100% ✓</span>
                      </div>
                    </div>

                    {/* LAW CARD 3: LEY DE EXTINCIÓN DE DOMINIO */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs hover:border-slate-400 transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                              Federal · Penal / Fiscal
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">Art. 8 Cláusulas</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">
                            Ley Nacional de Extinción de Dominio
                          </h4>
                        </div>
                        <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Auditoría 100%
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        Exige la inclusión obligatoria de la cláusula de deslinde de responsabilidad penal y uso exclusivo para actividades lícitas en todos los locales comerciales de La Gran Vía.
                      </p>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Cláusula de Deslinde Incluida:</span>
                        <span className="text-slate-900 font-extrabold">{rentRoll.length} de {rentRoll.length} Protegidos ✓</span>
                      </div>
                    </div>

                    {/* LAW CARD 4: CÓDIGO FISCAL SAT CFDI 4.0 */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs hover:border-slate-400 transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                              Federal · SAT Fiscal
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">CFDI 4.0</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">
                            Código Fiscal de la Federación (SAT Arrendamiento)
                          </h4>
                        </div>
                        <span className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          1 Alerta Timbrado
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        Regula la obligación fiscal de expedir y timbrar comprobantes fiscales digitales por internet (CFDI 4.0) por rentas cobradas dentro de las 72 horas posteriores a la recolección.
                      </p>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Estatus Fiscal SAT:</span>
                        <span className="text-slate-900 font-extrabold">78 al día · 1 Timbrado Pendiente</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "erp" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs font-sans text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <h2 className="font-sans text-xl font-bold text-slate-900">Conector ERP Universal Sync</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">Sincronización automatizada con SAP, Yardi, RealPage y SAARI ERP</p>
                </div>
                <span className="bg-slate-100 text-slate-800 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-bold">
                  Sincronización Activa (200 OK)
                </span>
              </div>

              <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl border border-slate-800 text-xs space-y-2.5 max-h-64 overflow-y-auto leading-relaxed shadow-sm font-sans">
                <p className="text-slate-300 font-semibold">[ERP-SYNC 14:58:12] POST /api/v2/erp/batch-ingest ... 200 OK (Universal Adapter)</p>
                <p>[ERP-SYNC 14:58:14] Sincronizados 84 locales comerciales para La Gran Vía Mexicali.</p>
                <p>[ERP-SYNC 14:58:15] Validado Fondo CAM: {formatVal(camMonthlyPool)} MXN contra 84 contratos vigentes.</p>
                <p>[ERP-SYNC 14:58:16] Adaptador Neutral: Conectado a ERP SAP (Esquema detectado automáticamente).</p>
              </div>
            </div>
          )}

          {/* TAB 7: GOBIERNO, PERMISOS RBAC Y BITÁCORA DE AUDITORÍA */}
          {activeTab === "rbac" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-7 animate-fadeIn shadow-xs font-sans text-slate-900">
              {/* HEADER & NEW USER ACTION BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-slate-900" />
                    <span className="text-sm font-bold uppercase tracking-wider text-slate-600">
                      Gobierno & Seguridad de la Plataforma
                    </span>
                  </div>
                  <h2 className="font-sans text-2xl font-bold text-slate-900 mt-1">
                    Control de Accesos RBAC & Bitácora de Auditoría Inmutable
                  </h2>
                  <p className="text-sm text-slate-600 font-medium mt-1">
                    El Administrador General dicta los roles ejecutivos, restringe accesos por módulo y supervisa los registros de auditoría SHA-256.
                  </p>
                </div>

                <button
                  onClick={() => triggerToast("Abriendo formulario para invitar nuevo usuario corporativo y asignar perfil RBAC...")}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all cursor-pointer shadow-xs shrink-0"
                >
                  Invitar Usuario / Asignar Perfil
                </button>
              </div>

              {/* 4 GOVERNANCE SUMMARY METRICS CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 font-display">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-1.5">
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Usuarios Corporativos</p>
                  <p className="text-3xl font-bold text-slate-900">6 Usuarios</p>
                  <p className="text-sm text-slate-600 font-medium">5 Activos · 1 Restringido</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-1.5">
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Perfiles Definidos</p>
                  <p className="text-3xl font-bold text-slate-900">5 Roles RBAC</p>
                  <p className="text-sm text-slate-600 font-medium">Super Admin, CFO, Ops, Legal, Audit</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-1.5">
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Integridad de Auditoría</p>
                  <p className="text-3xl font-bold text-slate-900">SHA-256 100%</p>
                  <p className="text-sm text-slate-600 font-medium">Sin alteración de registros</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-1.5">
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">Sesiones Activas</p>
                  <p className="text-3xl font-bold text-slate-900">2 Sesiones</p>
                  <p className="text-sm text-slate-600 font-medium">Mexicali HQ & Tijuana Office</p>
                </div>
              </div>

              {/* USER MANAGEMENT & GRANULAR MODULE PERMISSION MATRIX */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-sans text-lg font-bold text-slate-900">
                      Matriz de Usuarios & Permisos por Módulo Operativo
                    </h3>
                    <p className="text-sm text-slate-600 font-medium mt-0.5">
                      Asignación de privilegios de lectura, escritura y ejecución de agentes por cada torre de control.
                    </p>
                  </div>
                  <span className="text-sm font-bold bg-slate-100 text-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-300">
                    Control de Permisos Activo
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[11px] sm:text-xs tracking-wider border-b border-slate-300">
                      <tr>
                        <th className="py-3 px-3">Usuario & Perfil</th>
                        <th className="py-3 px-1 text-center">Torre CFO</th>
                        <th className="py-3 px-1 text-center">Rent Roll</th>
                        <th className="py-3 px-1 text-center">Renata CAM</th>
                        <th className="py-3 px-1 text-center">Diego CapEx</th>
                        <th className="py-3 px-1 text-center">Mariana Legal</th>
                        <th className="py-3 px-1 text-center">Audit Logs</th>
                        <th className="py-3 px-3 text-right">Estatus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                      {/* USER 1: M. HAGE - PROPIETARIO / SUPER ADMIN */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 font-mono text-xs sm:text-sm">m.hage@lagranvia.com.mx</div>
                          <div className="text-[11px] sm:text-xs text-slate-600 font-medium">Propietario / Super Admin</div>
                        </td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" checked readOnly className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" checked readOnly className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" checked readOnly className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" checked readOnly className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" checked readOnly className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" checked readOnly className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-3 text-right">
                          <span className="bg-slate-900 text-white font-bold px-2.5 py-1 rounded-md text-xs inline-block">Acceso Total</span>
                        </td>
                      </tr>

                      {/* USER 2: A. LOPEZ - DIRECTOR DE OPERACIONES & CAPEX */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 font-mono text-xs sm:text-sm">a.lopez@lagranvia.com.mx</div>
                          <div className="text-[11px] sm:text-xs text-slate-600 font-medium">Dir. Operaciones & CapEx</div>
                        </td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" onChange={() => triggerToast("Permiso actualizado.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" defaultChecked onChange={() => triggerToast("Permiso Rent Roll actualizado para a.lopez@lagranvia.com.mx.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" onChange={() => triggerToast("Permiso actualizado.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" defaultChecked onChange={() => triggerToast("Permiso Diego CapEx actualizado para a.lopez@lagranvia.com.mx.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" onChange={() => triggerToast("Permiso actualizado.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" defaultChecked onChange={() => triggerToast("Permiso Audit Logs actualizado.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-3 text-right">
                          <span className="bg-slate-100 text-slate-900 border border-slate-300 font-bold px-2.5 py-1 rounded-md text-xs inline-block">Operaciones</span>
                        </td>
                      </tr>

                      {/* USER 3: CONTABILIDAD@LAGRANVIA.COM.MX - CFO & FINANZAS */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 font-mono text-xs sm:text-sm">contabilidad@lagranvia.com.mx</div>
                          <div className="text-[11px] sm:text-xs text-slate-600 font-medium">Dir. Finanzas & SAT CFDI</div>
                        </td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" defaultChecked onChange={() => triggerToast("Permiso Torre CFO actualizado para Contabilidad.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" defaultChecked onChange={() => triggerToast("Permiso Rent Roll actualizado para Contabilidad.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" defaultChecked onChange={() => triggerToast("Permiso Renata CAM actualizado para Contabilidad.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" defaultChecked onChange={() => triggerToast("Permiso Diego CapEx actualizado para Contabilidad.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" onChange={() => triggerToast("Acceso Legal actualizado para Contabilidad.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" defaultChecked onChange={() => triggerToast("Permiso Audit Logs actualizado para Contabilidad.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-3 text-right">
                          <span className="bg-slate-100 text-slate-900 border border-slate-300 font-bold px-2.5 py-1 rounded-md text-xs inline-block">Finanzas</span>
                        </td>
                      </tr>

                      {/* USER 4: JURIDICO@LAGRANVIA.COM.MX - LEGAL COUNSEL */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 font-mono text-xs sm:text-sm">juridico@lagranvia.com.mx</div>
                          <div className="text-[11px] sm:text-xs text-slate-600 font-medium">Dir. Legal & Contratos</div>
                        </td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" onChange={() => triggerToast("Permiso actualizado.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" defaultChecked onChange={() => triggerToast("Permiso actualizado.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" onChange={() => triggerToast("Permiso actualizado.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" onChange={() => triggerToast("Permiso actualizado.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" defaultChecked onChange={() => triggerToast("Permiso Mariana Legal actualizado para Jurídico.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-1 text-center"><input type="checkbox" defaultChecked onChange={() => triggerToast("Permiso Audit Logs actualizado.")} className="h-4 w-4 accent-slate-900 rounded" /></td>
                        <td className="py-3 px-3 text-right">
                          <span className="bg-slate-100 text-slate-900 border border-slate-300 font-bold px-2.5 py-1 rounded-md text-xs inline-block">Legal</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PROMINENT EMERGENCY KILL-SWITCH BANNER */}
              <div className={`p-5 rounded-2xl border-2 transition-all font-sans flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                killSwitchActive
                  ? "bg-slate-900 border-red-500 text-white shadow-md"
                  : "bg-red-50 border-red-200 text-slate-900"
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-3 w-3 rounded-full ${killSwitchActive ? "bg-red-500 animate-pulse" : "bg-red-600"}`} />
                    <span className="font-bold text-base uppercase tracking-wide">
                      {killSwitchActive ? "MODO DE EMERGENCIA ACTIVO: AUTOMATIZACIONES CONGELADAS" : "INTERRUPTOR DE EMERGENCIA DEL SISTEMA (KILL-SWITCH)"}
                    </span>
                  </div>
                  <p className={`text-sm font-medium leading-relaxed ${killSwitchActive ? "text-slate-200" : "text-slate-700"}`}>
                    {killSwitchActive
                      ? "Todas las ejecuciones autónomas de Diego AI, timbrados SAT de Renata AI y accesos automatizados han sido suspendidos por instrucción del Administrador General."
                      : "Permite al Administrador General congelar de forma inmediata la ejecución autónoma de agentes (Diego AI, Renata AI) y timbrados SAT en caso de mantenimiento o auditoría."}
                  </p>
                </div>

                <button
                  onClick={() => {
                    const nextState = !killSwitchActive;
                    setKillSwitchActive(nextState);
                    triggerToast(nextState ? "INTERRUPTOR DE EMERGENCIA ACTIVADO: Automatizaciones congeladas." : "Modo de emergencia desactivado: Operaciones autónomas reanudadas.");
                  }}
                  className={`px-6 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all cursor-pointer shadow-md shrink-0 whitespace-nowrap ${
                    killSwitchActive
                      ? "bg-white text-slate-900 hover:bg-slate-100"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {killSwitchActive ? "RESTABLECER OPERACIONES AUTÓNOMAS" : "ACTIVAR KILL-SWITCH DE EMERGENCIA"}
                </button>
              </div>

              {/* ENTERPRISE AI AUTONOMY & SECURITY GOVERNANCE POLICIES */}
              <div className="space-y-4 pt-2">
                <div>
                  <h3 className="font-sans text-lg font-bold text-slate-900">
                    Límites de Autonomía de Agentes IA & Gobernanza de Seguridad
                  </h3>
                  <p className="text-sm text-slate-600 font-medium mt-0.5">
                    Configuración de umbrales financieros para ejecución autónoma, autenticación SSO y políticas de seguridad.
                  </p>
                </div>

                <div className="space-y-4 text-sm font-sans">
                  {/* POLICY 1: DIEGO AI SPENDING THRESHOLD */}
                  <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 text-base">Diego AI · Umbral CapEx</span>
                          <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-0.5 rounded">
                            ${diegoThresholdVal.toLocaleString()} MXN Max
                          </span>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed font-medium">
                          Diego AI puede despachar proveedores de mantenimiento automáticamente en órdenes de hasta ${diegoThresholdVal.toLocaleString()} MXN. Montos mayores requieren firma dual Admin.
                        </p>
                      </div>

                      {editingPolicyCard !== "diego" && (
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-xs font-bold text-slate-900">
                            <span className="text-slate-500">Estatus: </span>
                            <span className="text-slate-900">{diegoAutoMode ? "Piloto Automático Activo" : "Supervisión Manual"}</span>
                          </div>
                          <button
                            onClick={() => setEditingPolicyCard("diego")}
                            className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            Editar Configuración →
                          </button>
                        </div>
                      )}
                    </div>

                    {editingPolicyCard === "diego" && (
                      <div className="p-4 bg-white border border-slate-300 rounded-xl space-y-3 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="block text-xs font-bold text-slate-700">
                            Monto Máximo Autónomo (MXN):
                            <input
                              type="number"
                              step={5000}
                              value={diegoThresholdVal}
                              onChange={(e) => setDiegoThresholdVal(Number(e.target.value))}
                              className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                            />
                          </label>

                          <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-2.5 text-sm font-bold text-slate-900 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={diegoAutoMode}
                                onChange={(e) => setDiegoAutoMode(e.target.checked)}
                                className="h-5 w-5 accent-slate-900 rounded"
                              />
                              Piloto Automático Activo
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setEditingPolicyCard(null);
                              triggerToast(`Umbral de Diego AI actualizado a $${diegoThresholdVal.toLocaleString()} MXN.`);
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Guardar Cambios
                          </button>
                          <button
                            onClick={() => setEditingPolicyCard(null)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* POLICY 2: RENATA AI SAT COMPLIANCE */}
                  <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 text-base">Renata AI · Timbrado SAT</span>
                          <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-0.5 rounded">
                            {renataAutoMode ? "CFDI 4.0 Auto" : "Manual"}
                          </span>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed font-medium">
                          Emisión automatizada de complementos de pago PPD/PUE en recolección de rentas dentro de las 72 horas exigidas por el CFF SAT.
                        </p>
                      </div>

                      {editingPolicyCard !== "renata" && (
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-xs font-bold text-slate-900">
                            <span className="text-slate-500">PAC Autorizado: </span>
                            <span className="text-slate-900">{renataAutoMode ? "Validado (0 Errores)" : "Revisión Previa"}</span>
                          </div>
                          <button
                            onClick={() => setEditingPolicyCard("renata")}
                            className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            Editar Configuración →
                          </button>
                        </div>
                      )}
                    </div>

                    {editingPolicyCard === "renata" && (
                      <div className="p-4 bg-white border border-slate-300 rounded-xl space-y-3 animate-fadeIn">
                        <label className="flex items-center gap-2.5 text-sm font-bold text-slate-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={renataAutoMode}
                            onChange={(e) => setRenataAutoMode(e.target.checked)}
                            className="h-5 w-5 accent-slate-900 rounded"
                          />
                          Timbrado Automático PAC Directo
                        </label>
                        <p className="text-xs text-slate-600 font-medium">
                          Conecta directamente con el Proveedor Autorizado de Certificación (PAC) del SAT sin requerir validación manual previa.
                        </p>

                        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setEditingPolicyCard(null);
                              triggerToast("Política de timbrado de Renata AI actualizada.");
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Guardar Cambios
                          </button>
                          <button
                            onClick={() => setEditingPolicyCard(null)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* POLICY 3: SSO & GEO-FENCING */}
                  <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 text-base">SSO & Geo-Fencing IP</span>
                          <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-0.5 rounded">
                            Mexicali & Tijuana
                          </span>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed font-medium">
                          Acceso restringido a rangos de IP autorizados de las corporativas Mexicali HQ y Tijuana, con autenticación obligatoria 2FA / WebAuthn Passkeys.
                        </p>
                      </div>

                      {editingPolicyCard !== "sso" && (
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-xs font-bold text-slate-900">
                            <span className="text-slate-500">Autenticación: </span>
                            <span className="text-slate-900">{ssoEnforcedMode ? "SAML 2.0 / 2FA Enforced" : "Estándar"}</span>
                          </div>
                          <button
                            onClick={() => setEditingPolicyCard("sso")}
                            className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            Editar Configuración →
                          </button>
                        </div>
                      )}
                    </div>

                    {editingPolicyCard === "sso" && (
                      <div className="p-4 bg-white border border-slate-300 rounded-xl space-y-3 animate-fadeIn">
                        <label className="flex items-center gap-2.5 text-sm font-bold text-slate-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ssoEnforcedMode}
                            onChange={(e) => setSsoEnforcedMode(e.target.checked)}
                            className="h-5 w-5 accent-slate-900 rounded"
                          />
                          SAML 2.0 / 2FA Obligatorio con Passkeys
                        </label>
                        <p className="text-xs text-slate-600 font-medium">
                          Geo-Fencing restringido a rangos corporativos Mexicali HQ (189.210.42.0/24) y Tijuana (201.140.88.0/24).
                        </p>

                        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setEditingPolicyCard(null);
                              triggerToast("Política SSO & Geo-Fencing actualizada.");
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Guardar Cambios
                          </button>
                          <button
                            onClick={() => setEditingPolicyCard(null)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
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
                    <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-2xs">
                      <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-sans text-lg font-bold text-slate-900">
                          Bitácora Inmutable de Auditoría
                        </h3>
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          En Vivo
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cada aprobación Tier 3 en esta sesión (CAM, renovaciones, despachos CapEx) se añade aquí — verificado con hash SHA-256 por entrada.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 sm:pl-12">
                    <span className="text-xs text-slate-700 font-bold bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
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
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-2xs"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Exportar CSV
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    value={auditLogFilter}
                    onChange={(e) => setAuditLogFilter(e.target.value)}
                    placeholder="Filtrar por usuario, agente o acción (ej: CFDI, m.hage, diego_ai_agent)..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 font-medium transition-all"
                  />
                </div>

                {(() => {
                  const q = auditLogFilter.trim().toLowerCase();
                  const filtered = [...auditLog]
                    .reverse()
                    .filter((e) => !q || e.actor.toLowerCase().includes(q) || e.action.toLowerCase().includes(q) || e.actorType.includes(q));

                  return (
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-md overflow-hidden">
                      <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-2.5 border-b border-slate-800 bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <span>Actor</span>
                        <span>Acción Registrada</span>
                        <span className="text-right">Verificación</span>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/70">
                        {filtered.length === 0 ? (
                          <p className="text-slate-500 text-xs p-6 text-center">Sin resultados para &quot;{auditLogFilter}&quot;.</p>
                        ) : (
                          filtered.map((e, idx) => (
                            <div
                              key={e.id}
                              className={`grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3.5 hover:bg-slate-900/70 transition-colors ${idx === 0 ? "bg-slate-900/40" : ""}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                                    e.actorType === "user"
                                      ? "bg-slate-800 border-slate-700 text-slate-200"
                                      : "bg-emerald-950 border-emerald-800 text-emerald-400"
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
                                  <p className="text-xs font-bold text-slate-100 truncate">{e.actor}</p>
                                  <p className="text-[10.5px] text-slate-500 font-mono">{e.timestamp}{e.actorType === "user" ? " · 189.210.42.10" : ""}</p>
                                </div>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed self-center">{e.action}</p>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span
                                  className={`text-[9.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                    e.actorType === "user"
                                      ? "bg-slate-800 text-slate-300 border border-slate-700"
                                      : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                  }`}
                                >
                                  {e.actorType === "user" ? "Usuario" : "Agente IA"}
                                </span>
                                <span className="text-[10px] font-mono text-slate-600" title="Hash SHA-256 de la entrada">
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
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between animate-slideLeft font-sans">
          <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              <h3 className="font-sans font-bold text-sm">Copilot Sidebar</h3>
            </div>
            <button
              onClick={() => setCopilotOpen(false)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer font-bold"
            >
              Cerrar
            </button>
          </div>

          <div className="p-3 bg-slate-100 border-b border-slate-200 flex gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveAgent("renata")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeAgent === "renata" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Renata (CAM)
            </button>
            <button
              onClick={() => setActiveAgent("mariana")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeAgent === "mariana" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mariana (Legal)
            </button>
            <button
              onClick={() => setActiveAgent("diego")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeAgent === "diego" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Diego (CapEx)
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wide block">
                Alerta Detectada por el Agente
              </span>
              <p className="text-slate-700 leading-relaxed font-medium text-xs">
                {activeAgent === "renata" && "260 Grill & Bar presenta inconsistencia CFDI 4.0 ($98,500 MXN pagados sin complemento)."}
                {activeAgent === "mariana" && "Solicitud de Krispy Kreme viola la exclusividad de café de Blue Luna Café (Cláusula 14.2)."}
                {activeAgent === "diego" && "Equipo HVAC de Mexicali Climas en garantía vigente (Serie: MX-HVAC-9902)."}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Consulta al Agente</span>
                <span className="font-bold text-slate-900">{activeAgent.toUpperCase()} AI</span>
              </div>
              <p className="font-bold text-slate-900 text-xs">
                {activeAgent === "renata" && renataReplies[0].query}
                {activeAgent === "mariana" && marianaReplies[0].query}
                {activeAgent === "diego" && diegoReplies[0].query}
              </p>
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 leading-relaxed text-xs font-medium shadow-2xs">
                {activeAgent === "renata" && renataReplies[0].answer}
                {activeAgent === "mariana" && marianaReplies[0].answer}
                {activeAgent === "diego" && diegoReplies[0].answer}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-slate-200 bg-slate-50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                triggerToast(`Consulta procesada por ${activeAgent.toUpperCase()} AI`);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Pregunta a la IA sobre la plaza..."
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium"
              />
              <button
                type="submit"
                className="bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800 transition-colors shadow-xs"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CAM CONFIRMATION MODAL */}
      {camConfirmModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 font-sans">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Renata AI · Confirmación de Operación Financiera
                </span>
                <button
                  onClick={() => setCamConfirmModal(null)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg font-bold"
                  aria-label="Cerrar ventana"
                >
                  ✕
                </button>
              </div>
              <h3 className="text-xl font-bold mt-2">
                {camConfirmModal === "notify"
                  ? "Confirmar Notificación a Tenants"
                  : "Confirmar Timbrado SAT & ERP SAP"}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {camConfirmModal === "notify"
                  ? "Revisión previa a la distribución masiva de los Estados de Cuenta CAM NNN (Agosto 2026)."
                  : "Generación de comprobantes fiscales CFDI 4.0 y registro automático en Cuentas por Cobrar."}
              </p>
            </div>

            {/* Modal Content Details */}
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <p className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
                  Resumen de la Transacción
                </p>
                {camConfirmModal === "notify" ? (
                  <div className="space-y-2 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Destinatarios:</span>
                      <span className="font-bold text-slate-900">84 Arrendatarios (Contactos de Finanzas)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Monto Total Prorrateado:</span>
                      <span className="font-bold text-slate-900">{formatVal(camMonthlyPool)} MXN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Canal de Envío:</span>
                      <span className="font-bold text-slate-900">Correo Directo + Portal Arrendatario (/inquilinos)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Archivos Adjuntos:</span>
                      <span className="font-bold text-slate-900">Estado de Cuenta PDF + Anexo de Gastos Comunes</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Lote de Facturación:</span>
                      <span className="font-bold text-slate-900">84 Facturas Individuales NNN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Régimen & Timbrado:</span>
                      <span className="font-bold text-slate-900">SAT CFDI 4.0 (Gastos NNN)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Integración ERP:</span>
                      <span className="font-bold text-slate-900">Módulo FI-AR (Cuentas por Cobrar SAP)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Monto Total a Timbrar:</span>
                      <span className="font-bold text-slate-900">{formatVal(camMonthlyPool)} MXN</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900">
                <p className="font-bold text-xs">Aviso de Responsabilidad Financiera</p>
                <p className="text-[11.5px] mt-0.5 text-amber-800">
                  {camConfirmModal === "notify"
                    ? "Al autorizar, los 84 arrendatarios recibirán una notificación formal con el cobro de CAM correspondiente al mes en curso."
                    : "Al autorizar, se generará el timbre fiscal ante el SAT y se afectará la cartera de Cuentas por Cobrar en el sistema ERP."}
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setCamConfirmModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (camConfirmModal === "notify") {
                    triggerToast("Renata AI: Notificaciones de Estado de Cuenta enviadas a los 84 arrendatarios.");
                    appendAuditLog("user", "m.hage@lagranvia.com.mx", `Aprobó envío de Estado de Cuenta CAM NNN a ${rentRoll.length} arrendatarios`);
                  } else {
                    setCfdiIssued(true);
                    triggerToast("Renata AI: 84 facturas CFDI 4.0 timbradas en SAT y registradas en ERP SAP.");
                    appendAuditLog("user", "m.hage@lagranvia.com.mx", `Aprobó timbrado SAT CFDI 4.0 para ${rentRoll.length} facturas y sincronización ERP SAP`);
                  }
                  setCamConfirmModal(null);
                }}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer shadow-sm ${
                  camConfirmModal === "notify" ? "bg-slate-900 hover:bg-slate-800" : "bg-emerald-700 hover:bg-emerald-800"
                }`}
              >
                {camConfirmModal === "notify"
                  ? "Aprobar y Enviar Notificaciones"
                  : "Aprobar Timbrado & Sincronizar ERP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MARIANA AI · RENEWAL DRAFT MODAL (260 GRILL & BAR / LOCAL 10-01) */}
      {renewalDraftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden text-slate-900 font-sans max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white p-6 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Mariana AI · Borrador de Renovación
                </span>
                <button
                  onClick={() => setRenewalDraftOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg font-bold"
                  aria-label="Cerrar ventana"
                >
                  ✕
                </button>
              </div>
              <h3 className="text-xl font-bold mt-2">260 Grill & Bar · Local 10-01</h3>
              <p className="text-xs text-slate-300 mt-1">
                Generado a partir de contrato_260_grill_2026_firmado.pdf. Vence 31 Oct 2026 (En 2 meses).
              </p>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="font-bold text-amber-900 text-xs uppercase tracking-wide border-b border-amber-200 pb-2">
                    Parámetros Actualizados
                  </p>
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-amber-800 font-semibold text-[11px]">Renta Base Mensual</p>
                      <p className="font-bold text-slate-900">$76,800 → $80,256 MXN</p>
                      <p className="text-amber-800 text-[11px]">+4.5% INPC (Cláusula 7.2)</p>
                    </div>
                    <div>
                      <p className="text-amber-800 font-semibold text-[11px]">Vigencia del Contrato</p>
                      <p className="font-bold text-slate-900">31 Oct 2026 → 31 Oct 2031</p>
                      <p className="text-amber-800 text-[11px]">Nuevo periodo: 5 años</p>
                    </div>
                    <div>
                      <p className="text-amber-800 font-semibold text-[11px]">Depósito en Garantía</p>
                      <p className="font-bold text-slate-900">$153,600 → $160,512 MXN</p>
                      <p className="text-amber-800 text-[11px]">2 meses de la nueva renta base</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="font-bold text-slate-700 text-xs uppercase tracking-wide border-b border-slate-200 pb-2">
                    Parámetros Sin Cambios
                  </p>
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-slate-500 font-semibold text-[11px]">Superficie & Ubicación</p>
                      <p className="font-bold text-slate-900">320 m² · Local 10-01</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold text-[11px]">Cláusula 18.1 · Exclusividad</p>
                      <p className="text-slate-700 leading-relaxed">Steakhouse & Gastro-Pub en bloque 10. No afecta cafeterías ni tiendas retail.</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold text-[11px]">Cláusula 22.4 · Penalización</p>
                      <p className="text-slate-700 leading-relaxed">Equitativa a 6 meses de Renta Base por rescisión anticipada.</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-semibold text-[11px]">Cláusula 7.2 · Mecanismo de Ajuste</p>
                      <p className="text-slate-700 leading-relaxed">Incremento anual indexado al INPC publicado por INEGI en Octubre.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-700">
                <p className="font-bold text-xs text-slate-900">Nota de Mariana AI</p>
                <p className="text-[11.5px] mt-0.5 leading-relaxed">
                  Borrador redactado sobre el contrato vigente — solo se modifican los tres parámetros marcados arriba; el resto del clausulado permanece idéntico al documento firmado. Listo para revisión de asesoría legal externa antes de notificar al inquilino.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setRenewalDraftOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setRenewalDraftOpen(false);
                  if (!renewalSent) setRenewalConfirmOpen(true);
                }}
                disabled={renewalSent}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer shadow-sm ${
                  renewalSent ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {renewalSent ? "Ya Enviado al Abogado ✓" : "Enviar Borrador al Abogado para Revisión →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MARIANA AI · RENEWAL SEND CONFIRMATION MODAL (TIER 3 HUMAN GATE) */}
      {renewalConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 font-sans">
            <div className="bg-slate-900 text-white p-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Mariana AI · Confirmación de Envío Legal
                </span>
                <button
                  onClick={() => setRenewalConfirmOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg font-bold"
                  aria-label="Cerrar ventana"
                >
                  ✕
                </button>
              </div>
              <h3 className="text-xl font-bold mt-2">Confirmar Envío a Asesoría Legal</h3>
              <p className="text-xs text-slate-300 mt-1">
                Revisión previa al envío del borrador de renovación de 260 Grill & Bar.
              </p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <p className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
                  Resumen de la Transacción
                </p>
                <div className="space-y-2 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Documento:</span>
                    <span className="font-bold text-slate-900">Borrador de Renovación · 260 Grill & Bar</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Destinatario:</span>
                    <span className="font-bold text-slate-900">Asesoría Legal Externa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Cambio Propuesto:</span>
                    <span className="font-bold text-slate-900">$76,800 → $80,256 MXN/mes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Nueva Vigencia:</span>
                    <span className="font-bold text-slate-900">Hasta 31 Oct 2031</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900">
                <p className="font-bold text-xs">Aviso de Responsabilidad Legal</p>
                <p className="text-[11.5px] mt-0.5 text-amber-800">
                  Al autorizar, el borrador se enviará a la asesoría legal externa para revisión. El inquilino no será notificado hasta que el abogado apruebe el documento — esta acción no compromete al propietario ni al inquilino por sí sola.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setRenewalConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setRenewalSent(true);
                  setRenewalConfirmOpen(false);
                  triggerToast("Mariana AI: Borrador de renovación enviado a la asesoría legal externa para revisión.");
                  appendAuditLog("user", "m.hage@lagranvia.com.mx", "Aprobó envío de borrador de renovación (260 Grill & Bar) a asesoría legal externa");
                }}
                className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer shadow-sm bg-emerald-700 hover:bg-emerald-800"
              >
                Aprobar y Enviar a Abogado →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIEGO AI · MAINTENANCE EVENT APPROVAL MODAL (TIER 3 HUMAN GATE — SPEND ABOVE AUTO-APPROVE THRESHOLD) */}
      {approvalConfirmEventId !== null && (() => {
        const event = maintenanceEvents.find((e) => e.id === approvalConfirmEventId);
        if (!event) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 font-sans">
              <div className="bg-slate-900 text-white p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Diego AI · Confirmación de Despacho
                  </span>
                  <button
                    onClick={() => setApprovalConfirmEventId(null)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer text-lg font-bold"
                    aria-label="Cerrar ventana"
                  >
                    ✕
                  </button>
                </div>
                <h3 className="text-xl font-bold mt-2">{event.title}</h3>
                <p className="text-xs text-slate-300 mt-1">
                  {formatVal(event.costEstimate)} excede el umbral de auto-aprobación ({formatVal(diegoThresholdVal)}) — requiere tu firma.
                </p>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <p className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
                    Resumen del Despacho
                  </p>
                  <div className="space-y-2 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Contratista:</span>
                      <span className="font-bold text-slate-900">{event.vendor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Categoría:</span>
                      <span className="font-bold text-slate-900">{event.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Fecha Programada:</span>
                      <span className="font-bold text-slate-900">{event.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Costo Estimado:</span>
                      <span className="font-bold text-slate-900">{formatVal(event.costEstimate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Responsable:</span>
                      <span className="font-bold text-slate-900">{event.responsible}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900">
                  <p className="font-bold text-xs">Aviso de Autorización de Gasto</p>
                  <p className="text-[11.5px] mt-0.5 text-amber-800">
                    Al aprobar, Diego AI despachará a {event.vendor} bajo el umbral vigente de Firma Dual Admin. El gasto quedará registrado en el Registro de Casos CapEx.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={() => setApprovalConfirmEventId(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setEventApprovals((prev) => ({ ...prev, [event.id]: true }));
                    setApprovalConfirmEventId(null);
                    triggerToast(`Diego AI: Despacho aprobado — ${event.vendor} programado para ${event.date}.`);
                    appendAuditLog("user", "m.hage@lagranvia.com.mx", `Aprobó despacho de ${formatVal(event.costEstimate)} a ${event.vendor} (${event.title})`);
                  }}
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors cursor-pointer shadow-sm bg-emerald-700 hover:bg-emerald-800"
                >
                  Aprobar y Programar Despacho →
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
