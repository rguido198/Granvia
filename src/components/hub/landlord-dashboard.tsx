"use client";

import { useState } from "react";
import Link from "next/link";
import { TENANTS } from "@/content/tenants";

type ActiveTab = "overview" | "leasing" | "maint" | "cam" | "saari";
type ThemeMode = "slate" | "sand";

interface ApplicantCase {
  id: string;
  brand: string;
  category: string;
  menu: string;
  sqm: number;
  conflictingTenant: string;
  conflictingClause: string;
  status: "RECHAZADO" | "CONDICIONADO" | "APROBADO";
  reasoning: string;
  rentLossPrevented: string;
  contractPdfName: string;
  contractPdfPage: string;
  contractExactSnippet: string;
  overlapScore: string;
  legalFilter: string;
}

interface CapexCase {
  id: string;
  tenant: string;
  expenseType: string;
  amount: number;
  isQuestionable: boolean;
  verdict: "RECHAZADO_RESPONSABILIDAD_INQUILINO" | "APROBADO_GARANTIA_COSTO_CERO" | "APROBADO_PRORRATEO_CAM";
  details: string;
}

const LEASING_APPLICANTS: ApplicantCase[] = [
  {
    id: "SOL-01",
    brand: "Starbucks Reserve",
    category: "Cafetería & Bar de Espresso",
    menu: "Café espresso, bebidas frías, repostería importada",
    sqm: 190,
    conflictingTenant: "Blue Luna Café (Local B-02 / Zona 4)",
    conflictingClause: "Cláusula #14: Exclusividad absoluta en venta de café preparado & bar de espresso.",
    status: "RECHAZADO",
    reasoning: "Imposible arrendar. Solapamiento directo del 98.4% en menú de café espresso. Incumplimiento directo del contrato vigente de Blue Luna Café. Riesgo de demanda legal inmediata y pérdida de renta de $65,000 MXN/mes.",
    rentLossPrevented: "$780,000 MXN / año",
    contractPdfName: "Contrato_Arrendamiento_BlueLuna_LocB02_Firmado.pdf",
    contractPdfPage: "Página 12, Párrafo 3.4 (Sección de Exclusividades)",
    contractExactSnippet: '"...EL ARRENDADOR otorga al ARRENDATARIO exclusividad comercial absoluta dentro de la Zona 4 de Plaza La Gran Vía, prohibiendo expresamente la instalación de cualquier negocio o franquicia cuyo giro principal o secundario sea la venta de café espresso preparado, bebidas a base de café o bar de especialidad durante los 60 meses de vigencia del contrato..."',
    overlapScore: "98.4% Coincidencia Semántica de Menú",
    legalFilter: "Cumplimiento Estricto de Contrato Vigente",
  },
  {
    id: "SOL-02",
    brand: "Krispy Kreme",
    category: "Donas & Repostería Glaseada",
    menu: "Donas glaseadas, café americano, pan dulce",
    sqm: 110,
    conflictingTenant: "La Purísima Bakery (Local B-05 / Zona 4)",
    conflictingClause: "Cláusula #08: Exclusividad en productos de postres y repostería glaseada.",
    status: "RECHAZADO",
    reasoning: "Violación de pacto de no-competencia de La Purísima Bakery. El algoritmo de Mariana detectó solapamiento directo en categoría 'postres/repostería glaseada'.",
    rentLossPrevented: "$540,000 MXN / año",
    contractPdfName: "Contrato_LaPurisima_Bakery_LocB05_Firmado.pdf",
    contractPdfPage: "Página 8, Párrafo 2.1 (Protección de Giro)",
    contractExactSnippet: '"...Queda strictly prohibido a la administración de Plaza La Gran Vía arrendar locales adyacentes a competidores directos en la categoría de repostería fina, donas glaseadas o panadería artesanal..."',
    overlapScore: "91.2% Coincidencia en Repostería",
    legalFilter: "Protección de Arrendatario Ancla de Repostería",
  },
  {
    id: "SOL-03",
    brand: "La Vicenta Tacos & Parrilla",
    category: "Restaurante Mexicano & Cortes de Carne",
    menu: "Tacos de arrachera, ensaladas verdes, margaritas",
    sqm: 240,
    conflictingTenant: "Alma Verde (Local B-10 / Zona 7)",
    conflictingClause: "Cláusula #22: Exclusividad genérica en 'comida saludable y ensaladas'.",
    status: "CONDICIONADO",
    reasoning: "Conflicto parcial en ensaladas. Sin embargo, tras aplicar el filtro de Ley Antimonopolio (LFCE §3), la exclusividad genérica de Alma Verde es legalmente excesiva. Se aprueba condicionando el menú a no vender ensaladas bowls como plato fuerte.",
    rentLossPrevented: "Aprobación Viable ($1,150,000 MXN Renta Nueva)",
    contractPdfName: "Contrato_AlmaVerde_LocB10_Firmado.pdf",
    contractPdfPage: "Página 15, Párrafo 5.2 (Filtro Antimonopolio LFCE)",
    contractExactSnippet: '"...Las partes acuerdan que la restricción de giro sobre ensaladas aplica únicamente a conceptos dedicados 100% a bowls saludables, no limitando la venta de acompañamientos en restaurantes de especialidad de carne..."',
    overlapScore: "24.5% Coincidencia Menor (Ajustable)",
    legalFilter: "Ley Federal de Competencia Económica (LFCE §3)",
  },
];

const CAPEX_CASES: CapexCase[] = [
  {
    id: "CAP-01",
    tenant: "Derma Club Farmacia Dermatológica",
    expenseType: "Remodelación de Luminarias Decorativas Interiores",
    amount: 78000,
    isQuestionable: true,
    verdict: "RECHAZADO_RESPONSABILIDAD_INQUILINO",
    details: "RECHAZADO: Solicitud improcedente. El contrato de arrendamiento (Sección 12) establece que la iluminación estética interior es responsabilidad 100% del arrendatario.",
  },
  {
    id: "CAP-02",
    tenant: "Ashley Furniture",
    expenseType: "Falla de Compresor HVAC 15 Toneladas (Calor 44°C Mexicali)",
    amount: 145000,
    isQuestionable: false,
    verdict: "APROBADO_GARANTIA_COSTO_CERO",
    details: "GARANTÍA APLICADA ($0 COSTO PROPIETARIO): Diego verificó número de serie Carrier #CR-884920. El reemplazo está cubierto al 100% por póliza de fábrica de Carrier.",
  },
  {
    id: "CAP-03",
    tenant: "Cinemex Premium",
    expenseType: "Mantenimiento Preventivo de Planta de Emergencia Común",
    amount: 52000,
    isQuestionable: false,
    verdict: "APROBADO_PRORRATEO_CAM",
    details: "APROBADO PARA CAM: Gasto de infraestructura común prorrateable entre todos los locales en la liquidación NNN del mes.",
  },
];

function getTenantSqm(name: string, index: number): number {
  if (name.includes("Ashley")) return 1450;
  if (name.includes("Cinemex")) return 1180;
  if (name.includes("Buffalo")) return 650;
  if (name.includes("Fairfield") || name.includes("Holiday Inn")) return 850;
  if (name.includes("Cabanna") || name.includes("Bodega 8") || name.includes("260 Grill")) return 320;
  if (name.includes("Banorte") || name.includes("Banregio") || name.includes("Santander")) return 210;
  if (name.includes("PETCO")) return 420;
  if (name.includes("Alma Verde")) return 220;
  if (name.includes("Blue Luna")) return 180;
  if (name.includes("IHOP")) return 340;
  return Math.max(45, 80 - (index % 15) * 2);
}

export function LandlordDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [themeMode, setThemeMode] = useState<ThemeMode>("slate"); // Default to sleek institutional slate
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "ok" | "sat" | "excl">("all");

  const [selectedLeasingApp, setSelectedLeasingApp] = useState<ApplicantCase>(LEASING_APPLICANTS[0]);
  const [selectedCapex, setSelectedCapex] = useState<CapexCase>(CAPEX_CASES[0]);
  const [attorneySent, setAttorneySent] = useState(false);

  // Mariana AI RAG Assistant State
  const [marianaQuery, setMarianaQuery] = useState("");
  const [marianaChatHistory, setMarianaChatHistory] = useState<{ query: string; answer: string; refPdf?: string; refClause?: string }[]>([
    {
      query: "¿Cuál es la exclusividad exacta de Blue Luna Café y por qué bloqueó a Starbucks?",
      answer: "Blue Luna Café (Local B-02, Zona 4) cuenta con la Cláusula #14 en su contrato vigente (2023-2028). Otorga exclusividad comercial absoluta en la venta de café espresso y especialidad en Zona 4. La propuesta de Starbucks Reserve presentaba un 98.4% de solapamiento semántico en menú.",
      refPdf: "Contrato_Arrendamiento_BlueLuna_LocB02_Firmado.pdf",
      refClause: "Página 12, Cláusula 14",
    },
  ]);

  // Diego AI CapEx & Operations Assistant State
  const [diegoQuery, setDiegoQuery] = useState("");
  const [diegoNotificationSent, setDiegoNotificationSent] = useState(false);
  const [diegoChatHistory, setDiegoChatHistory] = useState<{ query: string; answer: string; refCert?: string; refClause?: string }[]>([
    {
      query: "¿Por qué el reemplazo de compresor HVAC de Ashley Furniture no le cuesta al propietario?",
      answer: "Diego verificó el número de serie Carrier #CR-884920. La póliza de garantía del fabricante Carrier cubre fallas mecánicas de compresores de 15 toneladas durante 5 años (vigente hasta Noviembre 2028). Se tramitó la sustitución sin costo para el propietario ($0 MXN).",
      refCert: "Poliza_Garantia_Carrier_Ashley_HVAC.pdf",
      refClause: "Serie #CR-884920 (Cobertura 100% Fábrica)",
    },
  ]);

  // Renata AI Fiscal SAT & CAM Assistant State
  const [renataQuery, setRenataQuery] = useState("");
  const [renataCfdiIssued, setRenataCfdiIssued] = useState(false);
  const [renataChatHistory, setRenataChatHistory] = useState<{ query: string; answer: string; refSat?: string; refClause?: string }[]>([
    {
      query: "¿Por qué MINT Boutique registró una alerta fiscal SAT CFDI 4.0?",
      answer: "MINT Boutique pagó $32,000 MXN mediante transferencia registrando el método PUE (Pago en una sola exhibición), pero la factura original se emitió bajo el régimen PPD (Pago en parcialidades). Renata detectó la discrepancia antes de la declaración mensual del SAT para auto-emitir el Complemento de Recepción de Pagos sin sanción.",
      refSat: "CFDI_4.0_Complemento_Pago_SAT_MINT.xml",
      refClause: "Anexo 20 RMF SAT §2.7.1.35",
    },
  ]);

  // SAARI ERP State
  const [saariDirection, setSaariDirection] = useState<"inbound" | "outbound">("inbound");
  const [saariProcessed, setSaariProcessed] = useState(false);

  // Compute exact total GLA and occupied metrics
  const totalOccupiedSqm = TENANTS.reduce((sum, t, idx) => sum + getTenantSqm(t.name, idx), 0);
  const vacancySqm = 445;
  const plazaTotalGla = totalOccupiedSqm + vacancySqm;

  // Filtered tenants for search & category filters
  const filteredTenants = TENANTS.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tag.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const isSatError = t.name.includes("MINT");
    const isExclusivityHold = t.name.includes("Alma Verde") || t.name.includes("Blue Luna") || t.name.includes("La Purísima");

    if (filterCategory === "ok") return !isSatError;
    if (filterCategory === "sat") return isSatError;
    if (filterCategory === "excl") return isExclusivityHold;
    return true;
  });

  // Dynamic style classes based on themeMode
  const isSlate = themeMode === "slate";

  const containerBg = isSlate ? "bg-[#0c0e14] text-slate-100 font-sans" : "bg-sand-100 text-ink font-sans";
  const sidebarBg = isSlate
    ? "bg-[#141722] border-r border-white/10 shadow-md text-slate-200"
    : "bg-sand-50 border-r border-hairline shadow-2xs text-ink";
  const cardBg = isSlate
    ? "bg-[#181c28] border border-white/10 rounded-sm shadow-md"
    : "bg-sand-50 border border-hairline rounded-sm shadow-2xs";
  const headerBg = isSlate ? "border-b border-white/10" : "border-b border-hairline-strong";
  const duneCardBg = isSlate
    ? "bg-[#090b10] text-slate-100 rounded-sm border border-white/10 shadow-md"
    : "bg-dune-900 text-sand-100 rounded-sm border border-dune-800 shadow-md";
  const innerCardBg = isSlate ? "bg-[#202534] border border-white/10" : "bg-sand-100 border border-hairline";
  const textMuted = isSlate ? "text-slate-400" : "text-ink-400";
  const textBody = isSlate ? "text-slate-200" : "text-ink-700";
  const borderHairline = isSlate ? "border-white/10" : "border-hairline";
  const tableHeaderBg = isSlate ? "bg-[#11131c] text-slate-400" : "bg-sand-200/80 text-ink-500";

  return (
    <div className={`min-h-screen ${containerBg} flex flex-col md:flex-row transition-colors duration-300`}>
      {/* ---------------- 1. BARRA LATERAL OPERATIVA ---------------- */}
      <aside className={`w-full md:w-68 ${sidebarBg} p-5 flex flex-col justify-between shrink-0 md:sticky md:top-0 md:h-screen transition-colors`}>
        <div className="space-y-6">
          {/* Logo Oficial de La Gran Vía */}
          <div className="px-1 py-1">
            <Link href="/" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/la-gran-via-logo-horizontal.png"
                alt="La Gran Vía Mexicali"
                className={`h-12 w-auto object-contain ${isSlate ? "brightness-125 contrast-125" : ""}`}
              />
            </Link>
            <div className={`mt-2.5 pt-2 ${borderHairline} border-t flex items-center justify-between font-sans text-[10px] ${textMuted}`}>
              <span>TORRE DE CONTROL AI</span>
              <span className="font-semibold text-terra font-sans">7,550 m² GLA</span>
            </div>
          </div>

          {/* Menú de Navegación Principal */}
          <nav className="space-y-1.5">
            <span className={`px-2 font-sans text-[10px] font-bold ${textMuted} uppercase tracking-widest block mb-2`}>
              Consola Operativa
            </span>

            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-all cursor-pointer ${
                activeTab === "overview"
                  ? isSlate
                    ? "bg-terra text-white font-semibold shadow-xs"
                    : "bg-dune-900 text-sand-100 font-semibold shadow-xs"
                  : isSlate
                  ? "text-slate-300 hover:text-white hover:bg-white/5"
                  : "text-ink-700 hover:text-ink hover:bg-sand-200/60"
              }`}
            >
              <span className="truncate">Resumen Rent Roll ({TENANTS.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("leasing")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-all cursor-pointer ${
                activeTab === "leasing"
                  ? isSlate
                    ? "bg-terra text-white font-semibold shadow-xs"
                    : "bg-dune-900 text-sand-100 font-semibold shadow-xs"
                  : isSlate
                  ? "text-slate-300 hover:text-white hover:bg-white/5"
                  : "text-ink-700 hover:text-ink hover:bg-sand-200/60"
              }`}
            >
              <span className="truncate">Arrendamiento (Mariana)</span>
              <span className="px-1.5 py-0.5 rounded-xs bg-pine/15 text-pine font-sans text-[9.5px] font-bold shrink-0">
                RAG
              </span>
            </button>

            <button
              onClick={() => setActiveTab("maint")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-all cursor-pointer ${
                activeTab === "maint"
                  ? isSlate
                    ? "bg-terra text-white font-semibold shadow-xs"
                    : "bg-dune-900 text-sand-100 font-semibold shadow-xs"
                  : isSlate
                  ? "text-slate-300 hover:text-white hover:bg-white/5"
                  : "text-ink-700 hover:text-ink hover:bg-sand-200/60"
              }`}
            >
              <span className="truncate">CapEx & Gastos (Diego)</span>
              <span className="px-1.5 py-0.5 rounded-xs bg-gold/15 text-gold-dark font-sans text-[9.5px] font-bold shrink-0">
                CapEx
              </span>
            </button>

            <button
              onClick={() => setActiveTab("cam")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-all cursor-pointer ${
                activeTab === "cam"
                  ? isSlate
                    ? "bg-terra text-white font-semibold shadow-xs"
                    : "bg-dune-900 text-sand-100 font-semibold shadow-xs"
                  : isSlate
                  ? "text-slate-300 hover:text-white hover:bg-white/5"
                  : "text-ink-700 hover:text-ink hover:bg-sand-200/60"
              }`}
            >
              <span className="truncate">CAM & Fiscal SAT (Renata)</span>
              <span className="px-1.5 py-0.5 rounded-xs bg-terra/15 text-terra font-sans text-[9.5px] font-bold shrink-0">
                SAT
              </span>
            </button>

            <button
              onClick={() => setActiveTab("saari")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-all cursor-pointer ${
                activeTab === "saari"
                  ? isSlate
                    ? "bg-terra text-white font-semibold shadow-xs"
                    : "bg-dune-900 text-sand-100 font-semibold shadow-xs"
                  : isSlate
                  ? "text-slate-300 hover:text-white hover:bg-white/5"
                  : "text-ink-700 hover:text-ink hover:bg-sand-200/60"
              }`}
            >
              <span className="truncate">SAARI ERP (Conector)</span>
              <span className="px-1.5 py-0.5 rounded-xs bg-pine/15 text-pine font-sans text-[9.5px] font-bold shrink-0">
                ERP
              </span>
            </button>
          </nav>
        </div>

        {/* Sesión de Usuario & Toggle de Selector de Tema */}
        <div className={`pt-4 ${borderHairline} border-t space-y-3`}>
          <div className="flex items-center justify-between px-1">
            <div>
              <span className={`block font-semibold text-xs ${isSlate ? "text-white" : "text-ink"} font-display`}>Sr. Martín</span>
              <span className={`block text-[10px] ${textMuted} font-sans`}>Director de Operaciones</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-pine animate-pulse" />
          </div>

          {/* CONTROL INTERACTIVO DE CONTRASTE Y TEMA */}
          <div className={`p-2 rounded-sm ${innerCardBg} flex items-center justify-between text-[11px]`}>
            <span className={`font-mono text-[10px] font-bold ${textMuted}`}>TEMA DE CONSOLA:</span>
            <button
              onClick={() => setThemeMode(isSlate ? "sand" : "slate")}
              className={`px-2.5 py-1 rounded-xs font-bold text-[10px] transition-all cursor-pointer border ${
                isSlate
                  ? "bg-terra text-white border-terra/50 hover:bg-terra-deep"
                  : "bg-dune-900 text-sand-100 border-dune-800 hover:bg-dune-800"
              }`}
            >
              {isSlate ? "Modo Slate Institucional" : "Modo Sand Cálido"}
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- 2. CONTENIDO PRINCIPAL ALINEADO A LA MARCA ---------------- */}
      <main className="flex-1 p-6 md:p-8 space-y-6 min-w-0">
        {/* Encabezado Superior Elegante con Selector de Tema comparativo */}
        <header className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${headerBg} pb-5`}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-xs bg-pine/10 text-pine border border-pine/30 font-sans text-[10px] font-bold uppercase tracking-wider">
                OPERACIÓN AL DÍA
              </span>
              <span className="px-2 py-0.5 rounded-xs bg-gold/15 text-gold-dark border border-gold/40 font-sans text-[10px] font-bold uppercase tracking-wider">
                PROTOTIPO — DATOS ILUSTRATIVOS PARA DEMOSTRACIÓN
              </span>
              <span className={`text-xs ${textMuted} font-sans`}>| La Gran Vía Mexicali</span>
            </div>
            <h1 className={`text-2xl font-bold font-display ${isSlate ? "text-white" : "text-ink"} mt-1 tracking-tight`}>
              {activeTab === "overview" && `Resumen Consolidado del Rent Roll (${TENANTS.length} Locales Activos)`}
              {activeTab === "leasing" && "Módulo de Arrendamiento & Inteligencia Legal (Mariana)"}
              {activeTab === "maint" && "Auditoría de Gastos CapEx Dudosos vs. Garantías (Diego)"}
              {activeTab === "cam" && "Prorrateo CAM NNN & Auditoría Fiscal SAT CFDI 4.0 (Renata)"}
              {activeTab === "saari" && "Conector SAARI ERP: Ingestión de Auxiliares & Salidas Batch"}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* COMPARATIVE THEME TOGGLE BUTTON IN HEADER */}
            <button
              onClick={() => setThemeMode(isSlate ? "sand" : "slate")}
              className={`px-3 py-2 rounded-sm border font-semibold text-xs cursor-pointer transition-all ${
                isSlate
                  ? "bg-[#252a38] text-slate-100 border-white/20 hover:bg-[#2d3345]"
                  : "bg-sand-200 text-ink border-hairline-strong hover:bg-sand-300"
              }`}
            >
              {isSlate ? "Ver en Modo Sand" : "Ver en Modo Slate (Oscuro)"}
            </button>

            <button
              onClick={() => alert("Exportando reporte ejecutivo oficial en PDF...")}
              className={`px-3.5 py-2 border text-xs font-semibold rounded-sm shadow-2xs cursor-pointer transition-all ${
                isSlate
                  ? "bg-[#1e2230] text-slate-100 border-white/10 hover:bg-[#252a3a]"
                  : "bg-sand-50 border-hairline text-ink hover:bg-sand-200/50"
              }`}
            >
              Exportar Reporte (.PDF)
            </button>

            <button
              onClick={() => setActiveTab("saari")}
              className={`px-3.5 py-2 font-semibold text-xs rounded-sm shadow-xs cursor-pointer transition-all border ${
                isSlate
                  ? "bg-terra hover:bg-terra-deep text-white border-terra/50"
                  : "bg-dune-900 hover:bg-dune-800 text-sand-100 border-dune-800"
              }`}
            >
              Sincronizar SAARI →
            </button>
          </div>
        </header>

        {/* ---------------- PESTAÑA 1: RESUMEN RENT ROLL ---------------- */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Banner de Tarjetas KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={cardBg + " p-4.5"}>
                <span className={`text-[10px] font-sans font-bold ${textMuted} uppercase tracking-widest block`}>
                  Cobranza Mensual Renta
                </span>
                <span className={`text-2xl font-bold font-display ${isSlate ? "text-white" : "text-ink"} mt-1 block`}>
                  $3,145,000 MXN
                </span>
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-xs bg-pine/10 text-pine text-[11px] font-medium font-sans">
                  98.2% Al Día (Julio 2026)
                </span>
              </div>

              <div className={cardBg + " p-4.5"}>
                <span className={`text-[10px] font-sans font-bold ${textMuted} uppercase tracking-widest block`}>
                  Superficie Rentable (GLA)
                </span>
                <span className={`text-2xl font-bold font-display ${isSlate ? "text-white" : "text-ink"} mt-1 block`}>
                  94.1% Ocupado
                </span>
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-xs bg-pine/10 text-pine text-[11px] font-medium font-sans">
                  {totalOccupiedSqm.toLocaleString()} m² Rentados ({vacancySqm} m² Vacantes)
                </span>
              </div>

              <div className={cardBg + " p-4.5"}>
                <span className={`text-[10px] font-sans font-bold ${textMuted} uppercase tracking-widest block`}>
                  Invariante Prorrateo CAM
                </span>
                <span className="text-2xl font-bold font-display text-terra mt-1 block">
                  1.0000 Balance
                </span>
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-xs bg-terra/10 text-terra text-[11px] font-medium font-sans">
                  Sumatoria Exacta NNN
                </span>
              </div>

              <div className={cardBg + " p-4.5"}>
                <span className={`text-[10px] font-sans font-bold ${textMuted} uppercase tracking-widest block`}>
                  Gasto Dudoso Rechazado
                </span>
                <span className="text-2xl font-bold font-display text-pine mt-1 block">
                  $78,000 MXN
                </span>
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-xs bg-pine/10 text-pine text-[11px] font-medium font-sans">
                  Ahorro Directo Propietario
                </span>
              </div>
            </div>

            {/* BARRA VISUAL DE DISTRIBUCIÓN DE GLA POR CATEGORÍA COMERCIAL */}
            <div className={cardBg + " p-5 space-y-3"}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 ${borderHairline}`}>
                <div>
                  <h4 className={`font-bold text-xs font-display ${isSlate ? "text-white" : "text-ink"} uppercase tracking-wider`}>
                    Distribución de GLA y Mezcla Comercial de Plaza La Gran Vía (7,550 m²)
                  </h4>
                  <p className={`text-[11px] ${textMuted}`}>
                    Asignación porcentual de área rentable por categoría de negocio.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-terra">94.1% Ocupación Total</span>
              </div>

              {/* Progress Segment Bar */}
              <div className="h-3 w-full rounded-xs bg-black/20 overflow-hidden flex">
                <div style={{ width: "35.2%" }} className="bg-terra h-full" title="Gastronomía & Rest. (35.2%)" />
                <div style={{ width: "28.6%" }} className="bg-gold h-full" title="Retail & Moda (28.6%)" />
                <div style={{ width: "18.4%" }} className="bg-pine h-full" title="Servicios & Bancos (18.4%)" />
                <div style={{ width: "11.9%" }} className="bg-sky-600 h-full" title="Entretenimiento (11.9%)" />
                <div style={{ width: "5.9%" }} className="bg-slate-500 h-full" title="Vacancia (5.9%)" />
              </div>

              {/* Legend Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-terra" />
                  <span className={textBody}>Gastronomía & Rest. (35.2%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-gold" />
                  <span className={textBody}>Retail & Moda (28.6%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-pine" />
                  <span className={textBody}>Servicios & Bancos (18.4%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-sky-600" />
                  <span className={textBody}>Entretenimiento (11.9%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-slate-500" />
                  <span className={textMuted}>Vacancia Absorbida (5.9%)</span>
                </div>
              </div>
            </div>

            {/* TABLA COMPLETA RENT ROLL CON BARRA DE BÚSQUEDA Y FILTROS */}
            <div className={cardBg + " p-5 space-y-4"}>
              <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 ${borderHairline}`}>
                <div>
                  <h3 className={`font-bold text-sm font-display ${isSlate ? "text-white" : "text-ink"} flex items-center gap-2`}>
                    <span>Rent Roll Matriz Consolidada ({filteredTenants.length} Locales)</span>
                    <span className="px-2 py-0.5 rounded-xs bg-terra/15 text-terra font-sans text-[10px] font-bold">
                      SAARI SYNC ACTIVO
                    </span>
                  </h3>
                  <p className={`text-xs ${textMuted} font-sans`}>
                    Los auxiliares de cobranza de SAARI ERP actualizan automáticamente los estatus de pago de la plaza.
                  </p>
                </div>

                {/* CONTROLES DE BÚSQUEDA Y FILTRADO RÁPIDO */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por inquilino, local, giro..."
                    className={`px-3 py-1.5 rounded-xs text-xs border ${
                      isSlate
                        ? "bg-[#0d0f15] border-white/20 text-white placeholder-slate-500 focus:ring-1 focus:ring-terra"
                        : "bg-sand-100 border-hairline text-ink focus:ring-1 focus:ring-terra"
                    } focus:outline-none`}
                  />

                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      onClick={() => setFilterCategory("all")}
                      className={`px-2.5 py-1 rounded-xs font-bold transition-all cursor-pointer ${
                        filterCategory === "all"
                          ? "bg-terra text-white"
                          : isSlate
                          ? "bg-[#222736] text-slate-300 hover:text-white"
                          : "bg-sand-200 text-ink-700"
                      }`}
                    >
                      Todos ({TENANTS.length})
                    </button>
                    <button
                      onClick={() => setFilterCategory("ok")}
                      className={`px-2.5 py-1 rounded-xs font-bold transition-all cursor-pointer ${
                        filterCategory === "ok"
                          ? "bg-pine text-white"
                          : isSlate
                          ? "bg-[#222736] text-slate-300 hover:text-white"
                          : "bg-sand-200 text-ink-700"
                      }`}
                    >
                      Al Día
                    </button>
                    <button
                      onClick={() => setFilterCategory("sat")}
                      className={`px-2.5 py-1 rounded-xs font-bold transition-all cursor-pointer ${
                        filterCategory === "sat"
                          ? "bg-red-700 text-white"
                          : isSlate
                          ? "bg-[#222736] text-slate-300 hover:text-white"
                          : "bg-sand-200 text-ink-700"
                      }`}
                    >
                      Alerta SAT
                    </button>
                  </div>
                </div>
              </div>

              {/* TABLA DE LOCALES */}
              <div className={`overflow-x-auto border ${borderHairline} rounded-xs`}>
                <table className="w-full text-left text-xs border-collapse relative">
                  <thead>
                    <tr className={`border-b ${borderHairline} uppercase text-[10px] ${tableHeaderBg} font-mono`}>
                      <th className="p-3 font-bold">#</th>
                      <th className="p-3 font-semibold">Local / Inquilino</th>
                      <th className="p-3 font-semibold">Zona</th>
                      <th className="p-3 font-semibold">Giro / Categoría</th>
                      <th className="p-3 font-semibold text-right">Superficie m²</th>
                      <th className="p-3 font-semibold text-right">Participación Pro-Rata</th>
                      <th className="p-3 font-semibold text-right">Renta Est. MXN</th>
                      <th className="p-3 font-semibold">Estatus Cobranza & Fiscal</th>
                      <th className="p-3 font-semibold">Protección Agente IA</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderHairline} font-medium ${isSlate ? "text-slate-200" : "text-ink"}`}>
                    {filteredTenants.map((t, idx) => {
                      const sqm = getTenantSqm(t.name, idx);
                      const sharePct = ((sqm / plazaTotalGla) * 100).toFixed(2);
                      const estRent = Math.round(sqm * 240);

                      const isSatError = t.name.includes("MINT");
                      const isCapexRejection = t.name.includes("Derma Club");
                      const isExclusivityHold = t.name.includes("Alma Verde") || t.name.includes("Blue Luna");

                      return (
                        <tr key={t.slug} className={isSlate ? "hover:bg-white/5 transition-colors" : "hover:bg-sand-200/40 transition-colors"}>
                          <td className={`p-3 font-mono text-[11px] ${textMuted}`}>{idx + 1}</td>
                          <td className={`p-3 font-bold font-sans ${isSlate ? "text-white" : "text-ink"}`}>{t.name}</td>
                          <td className={`p-3 font-mono text-[11px] ${textMuted}`}>{t.zone}</td>
                          <td className="p-3">{t.tag}</td>
                          <td className={`p-3 text-right font-mono font-bold ${isSlate ? "text-white" : "text-ink"}`}>{sqm} m²</td>
                          <td className="p-3 text-right font-mono font-bold text-terra">{sharePct}%</td>
                          <td className={`p-3 text-right font-mono font-bold ${isSlate ? "text-white" : "text-ink"}`}>${estRent.toLocaleString()}</td>
                          <td className="p-3">
                            {isSatError ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-red-900/30 text-red-400 border border-red-800 text-[10px] font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                Alerta Fiscal SAT (PPD)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-pine/15 text-pine border border-pine/30 text-[10px] font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-pine" />
                                Al Día (CFDI Emitido)
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {isSatError && <span className="text-red-400 font-bold text-[11px]">Alerta CFDI 4.0 Generada</span>}
                            {isCapexRejection && <span className="text-gold-dark font-bold text-[11px]">CapEx $78k Rechazado ($0)</span>}
                            {isExclusivityHold && <span className="text-pine font-bold text-[11px]">Cláusula Exclusividad Activa</span>}
                            {!isSatError && !isCapexRejection && !isExclusivityHold && (
                              <span className={`font-mono text-[11px] ${textMuted}`}>Protección Agente IA</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className={duneCardBg + " font-bold text-xs shadow-md"}>
                    <tr>
                      <td className="p-3 font-mono">TOTAL</td>
                      <td className="p-3 font-mono font-bold" colSpan={3}>
                        PLAZA LA GRAN VÍA ({TENANTS.length} LOCALES ACTIVOS + VACANTES)
                      </td>
                      <td className="p-3 text-right font-mono text-gold font-bold">{plazaTotalGla.toLocaleString()} m²</td>
                      <td className="p-3 text-right font-mono text-terra font-bold">1.0000 (100.00%)</td>
                      <td className="p-3 text-right font-mono text-gold font-bold">$3,145,000 MXN</td>
                      <td className="p-3 font-mono" colSpan={2}>94.1% Ocupación Activa · Balance Cuadrado</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* PANEL RESUMEN EJECUTIVO INSTITUCIONAL */}
              <div className={duneCardBg + " p-5 space-y-4 font-sans text-xs"}>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-gold font-bold flex items-center gap-2 font-display text-sm tracking-wide">
                    <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
                    RESUMEN EJECUTIVO DE AUDITORÍA OPERATIVA & NOI PROYECTADO
                  </span>
                  <span className={`text-[10px] ${textMuted}`}>LA GRAN VÍA MEXICALI</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[11px]">
                  <div className={`p-3.5 rounded-xs ${innerCardBg}`}>
                    <span className={`block text-[10px] ${textMuted} mb-1`}>CUMPLIMIENTO FISCAL SAT:</span>
                    <span className={`font-bold block text-sm font-display ${isSlate ? "text-white" : "text-ink"}`}>84 / 85 VALIDADOS</span>
                    <span className={`text-[10px] ${textMuted} mt-1 block`}>1 Alerta CFDI PPD/PUE emitida</span>
                  </div>

                  <div className={`p-3.5 rounded-xs ${innerCardBg}`}>
                    <span className={`block text-[10px] ${textMuted} mb-1`}>PROTECCIÓN EXCLUSIVIDADES:</span>
                    <span className="text-terra font-bold block text-sm font-display">14 CLÁUSULAS ACTIVAS</span>
                    <span className={`text-[10px] ${textMuted} mt-1 block`}>0 Demandas por incumplimiento</span>
                  </div>

                  <div className={`p-3.5 rounded-xs ${innerCardBg}`}>
                    <span className={`block text-[10px] ${textMuted} mb-1`}>RECLAMO DE GARANTÍAS ($0):</span>
                    <span className="text-gold-dark font-bold block text-sm font-display">$145,000 MXN RECUPERADOS</span>
                    <span className={`text-[10px] ${textMuted} mt-1 block`}>Carrier HVAC garantía activa</span>
                  </div>

                  <div className={`p-3.5 rounded-xs ${innerCardBg}`}>
                    <span className={`block text-[10px] ${textMuted} mb-1`}>INTEGRACIÓN ERP SAARI:</span>
                    <span className={`font-bold block text-sm font-display ${isSlate ? "text-white" : "text-ink"}`}>100% SINCRONIZADO</span>
                    <span className={`text-[10px] ${textMuted} mt-1 block`}>Lote Batch listo para exportar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- PESTAÑA 2: ARRENDAMIENTO & MARIANA ---------------- */}
        {activeTab === "leasing" && (
          <div className="space-y-6">
            <div className={cardBg + " p-5 space-y-4"}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3 ${borderHairline}`}>
                <div>
                  <h3 className={`font-bold text-sm font-display ${isSlate ? "text-white" : "text-ink"} flex items-center gap-2`}>
                    <span>Módulo de Arrendamiento & Inteligencia Legal (Mariana)</span>
                    <span className="px-2 py-0.5 rounded-xs bg-pine/15 text-pine font-sans text-[10px] font-bold">
                      SOP §2A & GENERAL COUNSEL AI
                    </span>
                  </h3>
                  <p className={`text-xs ${textMuted}`}>
                    Monitoreo en vivo de solicitudes prospecto, consulta RAG de contratos, exclusividades y guardrails de la plaza.
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-xs ${duneCardBg} font-mono text-[11px] font-bold`}>
                  85 CONTRATOS EN BÓVEDA RAG
                </span>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className={innerCardBg + " p-3 rounded-xs"}>
                  <span className={`text-[10px] uppercase font-semibold block ${textMuted}`}>Solicitudes Evaluadas</span>
                  <span className={`font-bold text-base mt-0.5 block font-display ${isSlate ? "text-white" : "text-ink"}`}>3 Prospectos Auditados</span>
                </div>
                <div className={innerCardBg + " p-3 rounded-xs"}>
                  <span className={`text-[10px] uppercase font-semibold block ${textMuted}`}>Exclusividades Activas</span>
                  <span className="text-terra font-bold text-base mt-0.5 block font-display">14 Cláusulas Protegidas</span>
                </div>
                <div className={innerCardBg + " p-3 rounded-xs"}>
                  <span className={`text-[10px] uppercase font-semibold block ${textMuted}`}>Riesgo Legal Prevenido</span>
                  <span className="text-pine font-bold text-base mt-0.5 block font-display">$780,000 MXN / año</span>
                </div>
              </div>
            </div>

            {/* CHATBOX MARIANA AI */}
            <div className={cardBg + " p-5 space-y-4"}>
              <div className={`flex items-center justify-between border-b pb-3 ${borderHairline}`}>
                <div>
                  <h4 className={`font-bold text-xs font-display uppercase tracking-wider ${isSlate ? "text-white" : "text-ink"}`}>
                    Consulta Directa a Mariana AI (Bóveda RAG Legal)
                  </h4>
                  <p className={`text-[11px] ${textMuted}`}>
                    Pregunta sobre los 85 contratos, exclusividades comerciales o el Código Civil de Baja California.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-xs bg-pine/15 text-pine text-[10px] font-bold font-sans">
                  BÓVEDA INDEXADA RAG
                </span>
              </div>

              {/* Quick Query Preset Pills */}
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => {
                    setMarianaQuery("¿Cuál es la exclusividad exacta de Blue Luna Café y por qué bloqueó a Starbucks?");
                    setMarianaChatHistory([
                      ...marianaChatHistory,
                      {
                        query: "¿Cuál es la exclusividad exacta de Blue Luna Café y por qué bloqueó a Starbucks?",
                        answer: "Blue Luna Café (Local B-02, Zona 4) cuenta con la Cláusula #14 en su contrato vigente (2023-2028). Otorga exclusividad comercial absoluta en la venta de café espresso y especialidad en Zona 4. La propuesta de Starbucks Reserve presentaba un 98.4% de solapamiento semántico en menú.",
                        refPdf: "Contrato_Arrendamiento_BlueLuna_LocB02_Firmado.pdf",
                        refClause: "Página 12, Cláusula 14",
                      },
                    ]);
                  }}
                  className={`px-3 py-1.5 ${innerCardBg} hover:border-terra ${textBody} font-medium rounded-xs text-[11px] transition-all cursor-pointer`}
                >
                  ¿Por qué bloqueamos a Starbucks?
                </button>
                <button
                  onClick={() => {
                    setMarianaQuery("¿Qué dice la Ley Antimonopolio (LFCE §3) sobre la exclusividad de Alma Verde?");
                    setMarianaChatHistory([
                      ...marianaChatHistory,
                      {
                        query: "¿Qué dice la Ley Antimonopolio (LFCE §3) sobre la exclusividad de Alma Verde?",
                        answer: "Alma Verde reclamaba exclusividad genérica sobre 'comida saludable y ensaladas'. Conforme al Art. 3 de la LFCE, las cláusulas de no-competencia desproporcionadas en centros comerciales son nulas. Mariana dictaminó aprobación condicionada para La Vicenta (tacos/carnes), restringiendo únicamente la venta de ensaladas bowls como plato fuerte.",
                        refPdf: "Contrato_AlmaVerde_LocB10_Firmado.pdf",
                        refClause: "Página 15, Cláusula 22 (Filtro LFCE §3)",
                      },
                    ]);
                  }}
                  className={`px-3 py-1.5 ${innerCardBg} hover:border-terra ${textBody} font-medium rounded-xs text-[11px] transition-all cursor-pointer`}
                >
                  ¿Cómo aplica la Ley Antimonopolio (LFCE §3)?
                </button>
              </div>

              {/* Chat History */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {marianaChatHistory.map((item, i) => (
                  <div key={i} className={`p-4 rounded-xs border ${borderHairline} space-y-2 text-xs ${innerCardBg}`}>
                    <div className="flex items-center justify-between">
                      <span className={textMuted}>Pregunta: <strong className={isSlate ? "text-white" : "text-ink"}>{item.query}</strong></span>
                      <span className="text-[10px] font-sans text-pine font-bold">Respuesta RAG Verificada</span>
                    </div>
                    <p className={`p-3 rounded-xs border ${borderHairline} ${isSlate ? "bg-[#11131c] text-slate-200" : "bg-sand-50 text-ink-700"}`}>
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!marianaQuery.trim()) return;
                  setMarianaChatHistory([
                    ...marianaChatHistory,
                    {
                      query: marianaQuery,
                      answer: `Mariana analizó la bóveda RAG para "${marianaQuery}": Todos los contratos vigentes cumplen con la normativa de arrendamiento de Baja California.`,
                      refPdf: "Matriz_Consolidada_Contratos.pdf",
                    },
                  ]);
                  setMarianaQuery("");
                }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  type="text"
                  value={marianaQuery}
                  onChange={(e) => setMarianaQuery(e.target.value)}
                  placeholder="Pregunta a Mariana sobre contratos o legislación..."
                  className={`flex-1 px-3.5 py-2.5 border rounded-xs text-xs ${
                    isSlate ? "bg-[#10121a] border-white/20 text-white" : "bg-sand-100 border-hairline text-ink"
                  } focus:outline-none`}
                />
                <button
                  type="submit"
                  className={`px-4 py-2.5 font-bold text-xs rounded-xs cursor-pointer ${
                    isSlate ? "bg-terra text-white hover:bg-terra-deep" : "bg-dune-900 text-sand-100 hover:bg-dune-800"
                  }`}
                >
                  Consultar AI →
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ---------------- PESTAÑA 3: CAPEX & DIEGO ---------------- */}
        {activeTab === "maint" && (
          <div className="space-y-6">
            <div className={cardBg + " p-5 space-y-4"}>
              <div className={`flex items-center justify-between border-b pb-3 ${borderHairline}`}>
                <div>
                  <h3 className={`font-bold text-sm font-display uppercase tracking-wider ${isSlate ? "text-white" : "text-ink"}`}>
                    Auditoría de Gastos CapEx & Garantías de Equipos (Diego)
                  </h3>
                  <p className={`text-xs ${textMuted}`}>
                    Verificación técnica de reclamos de mantenimiento y reclamo de garantías de fabricante ($0 costo).
                  </p>
                </div>
              </div>

              {/* Selector de Casos */}
              <div className="grid md:grid-cols-3 gap-3">
                {CAPEX_CASES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedCapex(item);
                      setDiegoNotificationSent(false);
                    }}
                    className={`p-4 rounded-xs border text-left transition-all cursor-pointer ${
                      selectedCapex.id === item.id
                        ? isSlate
                          ? "bg-terra/20 border-terra text-white"
                          : "bg-sand-200/90 border-gold"
                        : innerCardBg
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-bold text-xs font-display ${isSlate ? "text-white" : "text-ink"}`}>{item.tenant}</span>
                      <span className="font-mono font-bold text-xs text-terra">${item.amount.toLocaleString()} MXN</span>
                    </div>
                    <span className={`text-xs block truncate ${textMuted}`}>{item.expenseType}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- PESTAÑA 4: CAM & RENATA ---------------- */}
        {activeTab === "cam" && (
          <div className="space-y-6">
            <div className={cardBg + " p-5 space-y-4"}>
              <div className={`flex items-center justify-between border-b pb-3 ${borderHairline}`}>
                <div>
                  <h3 className={`font-bold text-sm font-display uppercase tracking-wider ${isSlate ? "text-white" : "text-ink"}`}>
                    Prorrateo CAM NNN & Auditoría Fiscal SAT CFDI 4.0 (Renata)
                  </h3>
                  <p className={`text-xs ${textMuted}`}>
                    Auditoría en tiempo real de timbrado CFDI 4.0, complementos de pago PPD vs PUE y balance NNN.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- PESTAÑA 5: SAARI ERP ---------------- */}
        {activeTab === "saari" && (
          <div className="space-y-6">
            <div className={cardBg + " p-5 space-y-4"}>
              <div className={`flex items-center justify-between border-b pb-3 ${borderHairline}`}>
                <div>
                  <h3 className={`font-bold text-sm font-display uppercase tracking-wider ${isSlate ? "text-white" : "text-ink"}`}>
                    Conector Bidireccional SAARI ERP
                  </h3>
                  <p className={`text-xs ${textMuted}`}>
                    Sincronización en tiempo real de auxiliares de cobranza y exportación de lotes batch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
