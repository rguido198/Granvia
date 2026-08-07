"use client";

import { useState } from "react";
import Link from "next/link";
import { TENANTS } from "@/content/tenants";

type ActiveTab = "overview" | "leasing" | "maint" | "cam" | "saari";

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
    contractExactSnippet: '"...Queda estrictamente prohibido a la administración de Plaza La Gran Vía arrendar locales adyacentes a competidores directos en la categoría de repostería fina, donas glaseadas o panadería artesanal..."',
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

  return (
    <div className="min-h-screen bg-sand-100 font-sans text-ink flex flex-col md:flex-row">
      {/* ---------------- 1. BARRA LATERAL ALINEADA A LA MARCA LA GRAN VÍA ---------------- */}
      <aside className="w-full md:w-68 bg-sand-50 border-r border-hairline p-5 flex flex-col justify-between shrink-0 md:sticky md:top-0 md:h-screen shadow-2xs">
        <div className="space-y-6">
          {/* Logo Oficial de La Gran Vía */}
          <div className="px-1 py-1">
            <Link href="/" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/la-gran-via-logo-horizontal.png"
                alt="La Gran Vía Mexicali"
                className="h-12 w-auto object-contain"
              />
            </Link>
            <div className="mt-2.5 pt-2 border-t border-hairline flex items-center justify-between font-sans text-[10px] text-ink-400">
              <span>TORRE DE CONTROL AI</span>
              <span className="font-semibold text-terra font-sans">7,550 m² GLA</span>
            </div>
          </div>

          {/* Menú de Navegación Principal */}
          <nav className="space-y-1.5">
            <span className="px-2 font-sans text-[10px] font-bold text-ink-400 uppercase tracking-widest block mb-2">
              Consola Operativa
            </span>

            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-xs font-medium transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-dune-900 text-sand-100 font-semibold shadow-xs"
                  : "text-ink-700 hover:text-ink hover:bg-sand-200/60"
              }`}
            >
              <svg className="w-4 h-4 text-terra" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="truncate">Resumen Rent Roll ({TENANTS.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("leasing")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-all cursor-pointer ${
                activeTab === "leasing"
                  ? "bg-dune-900 text-sand-100 font-semibold shadow-xs"
                  : "text-ink-700 hover:text-ink hover:bg-sand-200/60"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <svg className="w-4 h-4 text-pine" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate">Arrendamiento (Mariana)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-xs bg-pine/15 text-pine font-sans text-[9.5px] font-bold shrink-0">
                RAG
              </span>
            </button>

            <button
              onClick={() => setActiveTab("maint")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-all cursor-pointer ${
                activeTab === "maint"
                  ? "bg-dune-900 text-sand-100 font-semibold shadow-xs"
                  : "text-ink-700 hover:text-ink hover:bg-sand-200/60"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
                <span className="truncate">CapEx & Gastos (Diego)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-xs bg-gold/15 text-gold font-sans text-[9.5px] font-bold shrink-0">
                CapEx
              </span>
            </button>

            <button
              onClick={() => setActiveTab("cam")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-all cursor-pointer ${
                activeTab === "cam"
                  ? "bg-dune-900 text-sand-100 font-semibold shadow-xs"
                  : "text-ink-700 hover:text-ink hover:bg-sand-200/60"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <svg className="w-4 h-4 text-terra" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="truncate">CAM & Fiscal SAT (Renata)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-xs bg-terra/15 text-terra font-sans text-[9.5px] font-bold shrink-0">
                SAT
              </span>
            </button>

            <button
              onClick={() => setActiveTab("saari")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-all cursor-pointer ${
                activeTab === "saari"
                  ? "bg-dune-900 text-sand-100 font-semibold shadow-xs"
                  : "text-ink-700 hover:text-ink hover:bg-sand-200/60"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <svg className="w-4 h-4 text-pine" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span className="truncate">SAARI ERP (Conector)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-xs bg-pine/15 text-pine font-sans text-[9.5px] font-bold shrink-0">
                ERP
              </span>
            </button>
          </nav>
        </div>

        {/* Sesión de Usuario */}
        <div className="pt-4 border-t border-hairline">
          <div className="flex items-center justify-between px-1">
            <div>
              <span className="block font-semibold text-xs text-ink font-display">Sr. Martín</span>
              <span className="block text-[10px] text-ink-400 font-sans">Director de Operaciones</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-pine animate-pulse" />
          </div>
        </div>
      </aside>

      {/* ---------------- 2. CONTENIDO PRINCIPAL ALINEADO A LA MARCA ---------------- */}
      <main className="flex-1 p-6 md:p-8 space-y-6 min-w-0">
        {/* Encabezado Superior Elegante */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline-strong pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-xs bg-pine/10 text-pine border border-pine/30 font-sans text-[10px] font-bold uppercase tracking-wider">
                OPERACIÓN AL DÍA
              </span>
              <span className="px-2 py-0.5 rounded-xs bg-gold/15 text-gold border border-gold/40 font-sans text-[10px] font-bold uppercase tracking-wider">
                PROTOTIPO — DATOS ILUSTRATIVOS PARA DEMOSTRACIÓN
              </span>
              <span className="text-xs text-ink-400 font-sans">| La Gran Vía Mexicali</span>
            </div>
            <h1 className="text-2xl font-bold font-display text-ink mt-1 tracking-tight">
              {activeTab === "overview" && `Resumen Consolidado del Rent Roll (${TENANTS.length} Locales Activos)`}
              {activeTab === "leasing" && "Módulo de Arrendamiento & Inteligencia Legal (Mariana)"}
              {activeTab === "maint" && "Auditoría de Gastos CapEx Dudosos vs. Garantías (Diego)"}
              {activeTab === "cam" && "Prorrateo CAM NNN & Auditoría Fiscal SAT CFDI 4.0 (Renata)"}
              {activeTab === "saari" && "Conector SAARI ERP: Ingestión de Auxiliares & Salidas Batch"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Exportando reporte ejecutivo oficial en PDF...")}
              className="px-3.5 py-2 bg-sand-50 border border-hairline text-ink font-semibold text-xs rounded-sm hover:bg-sand-200/50 shadow-2xs cursor-pointer transition-all"
            >
              Exportar Reporte (.PDF)
            </button>
            <button
              onClick={() => setActiveTab("saari")}
              className="px-3.5 py-2 bg-dune-900 hover:bg-dune-800 text-sand-100 font-semibold text-xs rounded-sm shadow-xs cursor-pointer transition-all border border-dune-800"
            >
              Sincronizar SAARI →
            </button>
          </div>
        </header>

        {/* ---------------- PESTAÑA 1: RESUMEN RENT ROLL ---------------- */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Banner de Tarjetas KPI Estilo La Gran Vía */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-sand-50 border border-hairline rounded-sm p-4.5 shadow-2xs">
                <span className="text-[10px] font-sans font-bold text-ink-400 uppercase tracking-widest block">
                  Cobranza Mensual Renta
                </span>
                <span className="text-2xl font-bold font-display text-ink mt-1 block">
                  $3,145,000 MXN
                </span>
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-xs bg-pine/10 text-pine text-[11px] font-medium font-sans">
                  ✓ 98.2% Al Día (Julio 2026)
                </span>
              </div>

              <div className="bg-sand-50 border border-hairline rounded-sm p-4.5 shadow-2xs">
                <span className="text-[10px] font-sans font-bold text-ink-400 uppercase tracking-widest block">
                  Superficie Rentable (GLA)
                </span>
                <span className="text-2xl font-bold font-display text-ink mt-1 block">
                  94.1% Ocupado
                </span>
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-xs bg-pine/10 text-pine text-[11px] font-medium font-sans">
                  {totalOccupiedSqm.toLocaleString()} m² Rentados ({vacancySqm} m² Vacantes)
                </span>
              </div>

              <div className="bg-sand-50 border border-hairline rounded-sm p-4.5 shadow-2xs">
                <span className="text-[10px] font-sans font-bold text-ink-400 uppercase tracking-widest block">
                  Invariante Prorrateo CAM
                </span>
                <span className="text-2xl font-bold font-display text-terra mt-1 block">
                  1.0000 Balance
                </span>
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-xs bg-terra/10 text-terra text-[11px] font-medium font-sans">
                  Sumatoria Exacta NNN
                </span>
              </div>

              <div className="bg-sand-50 border border-hairline rounded-sm p-4.5 shadow-2xs">
                <span className="text-[10px] font-sans font-bold text-ink-400 uppercase tracking-widest block">
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

            {/* TABLA COMPLETA RENT ROLL DINO DE 85 LOCALES */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
                <div>
                  <h3 className="font-bold text-sm font-display text-ink flex items-center gap-2">
                    <span>Rent Roll Matriz Consolidada ({TENANTS.length} Locales Activos + Vacancia)</span>
                    <span className="px-2 py-0.5 rounded-xs bg-gold/20 text-gold font-sans text-[10px] font-bold">
                      SIMULACIÓN SAARI (PROTOTIPO)
                    </span>
                  </h3>
                  <p className="text-xs text-ink-500 font-sans">
                    Vista de prototipo: en producción, los auxiliares de cobranza de SAARI ERP actualizarían automáticamente los estatus de pago de la plaza. Los valores mostrados aquí son ilustrativos.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => alert("Simulación: en producción esto sincronizaría el estado de pagos con SAARI ERP para los 85 locales. Datos de esta demo son ilustrativos.")}
                    className="px-3.5 py-1.5 bg-dune-900 hover:bg-dune-800 text-sand-100 font-bold text-xs rounded-sm shadow-xs cursor-pointer flex items-center gap-1.5 transition-all border border-dune-800"
                  >
                    <span>🔄 Sincronizar Pagos desde SAARI ERP</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-hairline rounded-xs">
                <table className="w-full text-left text-xs border-collapse relative">
                  <thead>
                    <tr className="border-b border-hairline text-ink-500 uppercase text-[10px] bg-sand-200/80 font-sans">
                      <th className="p-3 font-bold">#</th>
                      <th className="p-3 font-semibold">Local / Inquilino</th>
                      <th className="p-3 font-semibold">Zona</th>
                      <th className="p-3 font-semibold">Giro / Categoría</th>
                      <th className="p-3 font-semibold text-right">Superficie m²</th>
                      <th className="p-3 font-semibold text-right">Participación Pro-Rata</th>
                      <th className="p-3 font-semibold text-right">Renta Est. MXN</th>
                      <th className="p-3 font-semibold">Estatus Cobranza & Fiscal</th>
                      <th className="p-3 font-semibold">Acción / Protección IA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline text-ink font-medium">
                    {TENANTS.map((t, idx) => {
                      const sqm = getTenantSqm(t.name, idx);
                      const sharePct = ((sqm / plazaTotalGla) * 100).toFixed(2);
                      const estRent = Math.round(sqm * 240);

                      const isSatError = t.name.includes("MINT");
                      const isCapexRejection = t.name.includes("Derma Club");
                      const isExclusivityHold = t.name.includes("Alma Verde") || t.name.includes("Blue Luna");

                      return (
                        <tr key={t.slug} className="hover:bg-sand-200/40 transition-colors">
                          <td className="p-3 font-sans text-ink-400 text-[11px]">{idx + 1}</td>
                          <td className="p-3 font-bold text-ink font-sans">{t.name}</td>
                          <td className="p-3 text-ink-500 font-sans text-[11px]">{t.zone}</td>
                          <td className="p-3 text-ink-700">{t.tag}</td>
                          <td className="p-3 text-right font-sans font-bold text-ink">{sqm} m²</td>
                          <td className="p-3 text-right font-sans font-bold text-terra">{sharePct}%</td>
                          <td className="p-3 text-right font-sans font-bold text-ink">${estRent.toLocaleString()}</td>
                          <td className="p-3">
                            {isSatError ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-red-100 text-red-900 text-[10px] font-bold font-sans">
                                Error Fiscal SAT (Pago sin PPD)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-pine/15 text-pine text-[10px] font-bold font-sans">
                                ✓ Al Día (CFDI Emitido)
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {isSatError && <span className="text-red-700 font-bold text-[11px]">Alerta CFDI 4.0 Generada</span>}
                            {isCapexRejection && <span className="text-gold font-bold text-[11px]">CapEx $78k Rechazado ($0)</span>}
                            {isExclusivityHold && <span className="text-pine font-bold text-[11px]">Cláusula Exclusividad Activa</span>}
                            {!isSatError && !isCapexRejection && !isExclusivityHold && (
                              <span className="text-ink-400 font-sans text-[11px]">Protección Agente IA</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    <tr className="bg-sand-200/80 font-semibold border-t-2 border-hairline-strong">
                      <td className="p-3 font-sans text-ink-400">-</td>
                      <td className="p-3 font-bold text-ink font-display">Absorbente Vacancia Plaza (2 Locales)</td>
                      <td className="p-3 text-ink-500 font-sans">Zona 4 / Zona 9</td>
                      <td className="p-3 text-ink-500">Locales Vacantes (A-04 & B-09)</td>
                      <td className="p-3 text-right font-sans font-bold text-ink">{vacancySqm} m²</td>
                      <td className="p-3 text-right font-sans font-bold text-ink">
                        {((vacancySqm / plazaTotalGla) * 100).toFixed(2)}%
                      </td>
                      <td className="p-3 text-right font-sans text-ink-400">$0</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-sand-300 text-ink text-[10px] font-sans">
                          Absorbido por Propietario
                        </span>
                      </td>
                      <td className="p-3 text-ink-500 font-sans text-[11px]">Cuadra Balance Invariante a 1.0000</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-dune-900 text-sand-100 font-bold text-xs shadow-md">
                    <tr>
                      <td className="p-3 font-sans">TOTAL</td>
                      <td className="p-3 font-sans text-dune-200 font-bold" colSpan={3}>
                        PLAZA LA GRAN VÍA ({TENANTS.length} LOCALES ACTIVOS + VACANTES)
                      </td>
                      <td className="p-3 text-right font-sans text-gold font-bold">{plazaTotalGla.toLocaleString()} m²</td>
                      <td className="p-3 text-right font-sans text-terra font-bold">1.0000 (100.00%)</td>
                      <td className="p-3 text-right font-sans text-gold font-bold">$3,145,000 MXN</td>
                      <td className="p-3 text-dune-300 font-sans" colSpan={2}>94.1% Ocupación Activa · Balance Cuadrado</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* PANEL RESUMEN EJECUTIVO ESTILO LA GRAN VÍA */}
              <div className="bg-sand-50 rounded-sm p-5 space-y-4 text-xs shadow-2xs border border-hairline">
                <div className="flex items-center justify-between border-b border-hairline pb-3">
                  <span className="text-ink font-bold flex items-center gap-2 font-display text-sm tracking-wide">
                    <span className="h-2 w-2 rounded-full bg-gold" />
                    Resumen Ejecutivo de Cobertura Operativa & Auditoría Contínua
                  </span>
                  <span className="text-[10px] text-ink-400 font-sans uppercase tracking-wider">La Gran Vía Mexicali</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[11px]">
                  <div className="bg-sand-100 p-3.5 rounded-xs border border-hairline">
                    <span className="text-ink-400 block text-[10px] mb-1 font-sans">Cumplimiento Fiscal SAT</span>
                    <span className="text-ink font-bold block text-sm font-display">84 / 85 Validados</span>
                    <span className="text-ink-400 text-[10px] mt-1 block font-sans">1 alerta CFDI PPD/PUE emitida</span>
                  </div>

                  <div className="bg-sand-100 p-3.5 rounded-xs border border-hairline">
                    <span className="text-ink-400 block text-[10px] mb-1 font-sans">Protección Exclusividades</span>
                    <span className="text-terra font-bold block text-sm font-display">14 Cláusulas Activas</span>
                    <span className="text-ink-400 text-[10px] mt-1 block font-sans">0 demandas por incumplimiento</span>
                  </div>

                  <div className="bg-sand-100 p-3.5 rounded-xs border border-hairline">
                    <span className="text-ink-400 block text-[10px] mb-1 font-sans">Reclamo de Garantías ($0)</span>
                    <span className="text-gold font-bold block text-sm font-display">$145,000 MXN Recuperados</span>
                    <span className="text-ink-400 text-[10px] mt-1 block font-sans">Carrier HVAC garantía activa</span>
                  </div>

                  <div className="bg-sand-100 p-3.5 rounded-xs border border-hairline">
                    <span className="text-ink-400 block text-[10px] mb-1 font-sans">Integración ERP SAARI</span>
                    <span className="text-pine font-bold block text-sm font-display">100% Simulado</span>
                    <span className="text-ink-400 text-[10px] mt-1 block font-sans">Lote batch listo para exportar (prototipo)</span>
                  </div>
                </div>
              </div>

              {/* PANEL DE ACCIONES RECOMENDADAS — INMEDIATO / CORTO PLAZO / MEDIANO PLAZO */}
              <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-4">
                <div className="border-b border-hairline pb-3">
                  <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider">
                    Acciones Recomendadas
                  </h4>
                  <p className="text-xs text-ink-500 font-sans">
                    Síntesis de los casos abiertos en Mariana, Diego y Renata — organizadas por urgencia, con responsable asignado.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-sand-100 border border-hairline rounded-sm p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-hairline pb-2">
                      <span className="font-bold text-xs font-display text-ink">Inmediato</span>
                      <span className="px-2 py-0.5 rounded-xs bg-red-100 text-red-900 text-[10px] font-bold font-sans">
                        &lt; 5 DÍAS
                      </span>
                    </div>
                    <ul className="space-y-2.5 text-[11px] text-ink-700 font-sans">
                      <li>
                        <span className="font-bold text-ink block">Timbrar Complemento de Pago SAT — MINT Boutique (B-12)</span>
                        Discrepancia PPD/PUE detectada; previene multa de $12,500 MXN antes del cierre de mes.
                        <span className="block text-terra font-sans text-[10px] mt-0.5">Responsable: Administración (Renata)</span>
                      </li>
                      <li>
                        <span className="font-bold text-ink block">Enviar dictamen formal a Starbucks Reserve y Krispy Kreme</span>
                        Tras validación del Lic. Ramírez, notificar el rechazo por conflicto de exclusividad (Cláusulas #14 y #08).
                        <span className="block text-terra font-sans text-[10px] mt-0.5">Responsable: Legal / Arrendamiento (Mariana)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-sand-100 border border-hairline rounded-sm p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-hairline pb-2">
                      <span className="font-bold text-xs font-display text-ink">Corto Plazo</span>
                      <span className="px-2 py-0.5 rounded-xs bg-gold/20 text-gold text-[10px] font-bold font-sans">
                        2–6 SEMANAS
                      </span>
                    </div>
                    <ul className="space-y-2.5 text-[11px] text-ink-700 font-sans">
                      <li>
                        <span className="font-bold text-ink block">Cerrar contrato condicionado — La Vicenta Tacos &amp; Parrilla</span>
                        Confirmar por escrito la restricción de menú (sin ensaladas bowls como plato fuerte) antes de firmar; $1,150,000 MXN de renta nueva en juego.
                        <span className="block text-terra font-sans text-[10px] mt-0.5">Responsable: Arrendamiento (Mariana)</span>
                      </li>
                      <li>
                        <span className="font-bold text-ink block">Notificar rechazo de reembolso — Derma Club ($78,000 MXN)</span>
                        Iluminación estética interior es responsabilidad del inquilino (Sección 12); comunicar la resolución técnica.
                        <span className="block text-terra font-sans text-[10px] mt-0.5">Responsable: Mantenimiento (Diego)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-sand-100 border border-hairline rounded-sm p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-hairline pb-2">
                      <span className="font-bold text-xs font-display text-ink">Mediano Plazo</span>
                      <span className="px-2 py-0.5 rounded-xs bg-pine/15 text-pine text-[10px] font-bold font-sans">
                        1–2 TRIMESTRES
                      </span>
                    </div>
                    <ul className="space-y-2.5 text-[11px] text-ink-700 font-sans">
                      <li>
                        <span className="font-bold text-ink block">Arrendar vacancia remanente (445 m² / 5.89% del GLA)</span>
                        Locales A-04 y B-09 vacantes; cada trimestre sin arrendar es renta absorbida por el propietario.
                        <span className="block text-terra font-sans text-[10px] mt-0.5">Responsable: Arrendamiento (Mariana)</span>
                      </li>
                      <li>
                        <span className="font-bold text-ink block">Revisar vigencia de pólizas de garantía de equipo crítico</span>
                        Confirmar cobertura Carrier (vence Nov 2028), Schneider y Caterpillar antes de su vencimiento para mantener reclamos a $0 costo propietario.
                        <span className="block text-terra font-sans text-[10px] mt-0.5">Responsable: Mantenimiento (Diego)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- PESTAÑA 2: ARRENDAMIENTO & MARIANA (VERTICAL STORYBOARD) ---------------- */}
        {activeTab === "leasing" && (
          <div className="space-y-6">
            {/* Header & KPI Summary Bar */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-3">
                <div>
                  <h3 className="font-bold text-sm font-display text-ink flex items-center gap-2">
                    <span>Módulo de Arrendamiento & Inteligencia Legal (Mariana)</span>
                    <span className="px-2 py-0.5 rounded-xs bg-pine/15 text-pine font-sans text-[10px] font-bold">
                      SOP §2A & GENERAL COUNSEL AI
                    </span>
                  </h3>
                  <p className="text-xs text-ink-500 font-sans">
                    Monitoreo en vivo de solicitudes prospecto, consulta RAG de contratos, exclusividades y guardrails de la plaza.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xs bg-dune-900 text-sand-100 font-sans text-[11px] font-bold">
                    85 CONTRATOS EN BÓVEDA RAG
                  </span>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans text-xs">
                <div className="bg-sand-100 p-3 rounded-xs border border-hairline">
                  <span className="text-ink-400 text-[10px] uppercase font-semibold block">Solicitudes Evaluadas</span>
                  <span className="text-ink font-bold text-base mt-0.5 block font-display">3 Prospectos Auditados</span>
                </div>
                <div className="bg-sand-100 p-3 rounded-xs border border-hairline">
                  <span className="text-ink-400 text-[10px] uppercase font-semibold block">Exclusividades Activas</span>
                  <span className="text-terra font-bold text-base mt-0.5 block font-display">14 Cláusulas Protegidas</span>
                </div>
                <div className="bg-sand-100 p-3 rounded-xs border border-hairline">
                  <span className="text-ink-400 text-[10px] uppercase font-semibold block">Riesgo Legal Prevenido</span>
                  <span className="text-pine font-bold text-base mt-0.5 block font-display">$780,000 MXN / año</span>
                </div>
              </div>
            </div>

            {/* INTERACTIVE AI LEGAL ASSISTANT CHAT BOX ("CONSULTAR A MARIANA AI") */}
            <div className="bg-sand-50 border border-pine/30 rounded-sm p-5 shadow-2xs space-y-4 ring-1 ring-pine/10">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xs bg-pine text-sand-100 flex items-center justify-center font-bold text-xs shadow-2xs font-display">
                    M
                  </div>
                  <div>
                    <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider">
                      Asistente Legal RAG: Consulta Directa a Mariana
                    </h4>
                    <p className="text-[11px] text-ink-500">
                      Haz cualquier pregunta sobre los 85 contratos, leyes de Baja California o políticas de la plaza.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-xs bg-pine/15 text-pine text-[10px] font-bold font-sans">
                  ● BÓVEDA INDEXADA RAG
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
                  className="px-3 py-1.5 bg-sand-200/70 hover:bg-sand-200 text-ink-700 font-medium rounded-xs text-[11px] transition-all cursor-pointer border border-hairline"
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
                  className="px-3 py-1.5 bg-sand-200/70 hover:bg-sand-200 text-ink-700 font-medium rounded-xs text-[11px] transition-all cursor-pointer border border-hairline"
                >
                  ¿Cómo aplica la Ley Antimonopolio (LFCE §3)?
                </button>
                <button
                  onClick={() => {
                    setMarianaQuery("¿Cuál es la política oficial sobre subarrendamientos en la plaza?");
                    setMarianaChatHistory([
                      ...marianaChatHistory,
                      {
                        query: "¿Cuál es la política oficial sobre subarrendamientos en la plaza?",
                        answer: "Conforme al Reglamento General de Plaza La Gran Vía y la Sección 8 del contrato marco de arrendamiento comercial, el subarrendamiento total o parcial está estrictamente prohibido a menos que el propietario (Sr. Martín) lo autorice por escrito y exista un aval corporativo solidario registrado en el ERP SAARI.",
                        refPdf: "Reglamento_Operativo_Plaza_GranVia.pdf",
                        refClause: "Sección 8, Guardrail Corporativo #3",
                      },
                    ]);
                  }}
                  className="px-3 py-1.5 bg-sand-200/70 hover:bg-sand-200 text-ink-700 font-medium rounded-xs text-[11px] transition-all cursor-pointer border border-hairline"
                >
                  Reglas de Subarrendamiento
                </button>
              </div>

              {/* Chat History Display Area */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {marianaChatHistory.map((item, i) => (
                  <div key={i} className="bg-sand-100 p-4 rounded-xs border border-hairline space-y-2 text-xs">
                    <div className="flex items-center justify-between text-ink-500 font-medium">
                      <span>Pregunta: <strong className="text-ink font-sans">{item.query}</strong></span>
                      <span className="text-[10px] font-sans text-pine">✓ Respuesta RAG Verificada</span>
                    </div>
                    <p className="text-ink-700 leading-relaxed font-sans text-xs bg-sand-50 p-3 rounded-xs border border-hairline">
                      {item.answer}
                    </p>
                    {item.refPdf && (
                      <div className="flex items-center justify-between text-[11px] text-ink-500 pt-1 font-sans">
                        <span className="flex items-center gap-1.5 text-pine font-semibold">
                          Documento Fuente: {item.refPdf} ({item.refClause})
                        </span>
                        <button
                          onClick={() => alert(`Descargando documento de referencia: ${item.refPdf}...`)}
                          className="text-terra hover:underline font-bold"
                        >
                          Descargar Referencia PDF →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Input Query Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!marianaQuery.trim()) return;
                  setMarianaChatHistory([
                    ...marianaChatHistory,
                    {
                      query: marianaQuery,
                      answer: `Mariana analizó la bóveda RAG de 85 contratos para "${marianaQuery}": Todos los contratos vigentes cumplen con la normativa de arrendamiento comercial de Baja California y las políticas de exclusividad de Plaza La Gran Vía.`,
                      refPdf: "Matriz_Consolidada_Contratos_GranVia.pdf",
                      refClause: "Auditoría en Tiempo Real",
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
                  placeholder="Pregunta a Mariana sobre cualquier contrato, ley estatal o política de la plaza..."
                  className="flex-1 px-3.5 py-2.5 bg-sand-100 border border-hairline rounded-xs text-xs text-ink focus:outline-none focus:ring-2 focus:ring-terra/20 focus:bg-sand-50 transition-all font-sans"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-dune-900 hover:bg-dune-800 text-sand-100 font-bold text-xs rounded-xs transition-all shadow-xs cursor-pointer font-sans"
                >
                  Consultar AI →
                </button>
              </form>
            </div>

            {/* SECCIÓN 1: EVALUADOR DE SOLICITUDES & ESCALACIÓN A ABOGADO */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-6">
              <div className="border-b border-hairline pb-3">
                <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider flex items-center justify-between">
                  <span>1. Evaluador de Solicitudes Prospecto vs. Contratos Existentes</span>
                  <span className="text-[11px] text-ink-400 font-normal font-sans">Selecciona una solicitud para inspeccionar</span>
                </h4>
              </div>

              {/* Selector de Casos de Solicitantes */}
              <div className="grid md:grid-cols-3 gap-3">
                {LEASING_APPLICANTS.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      setSelectedLeasingApp(app);
                      setAttorneySent(false);
                    }}
                    className={`p-4 rounded-xs border text-left transition-all cursor-pointer ${
                      selectedLeasingApp.id === app.id
                        ? "bg-sand-200/90 border-terra ring-1 ring-terra/30 shadow-2xs"
                        : "bg-sand-50 border-hairline hover:bg-sand-200/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-ink font-display">{app.brand}</span>
                      <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold font-sans ${
                        app.status === "RECHAZADO" ? "bg-red-100 text-red-900" : "bg-gold/20 text-gold"
                      }`}>
                        {app.status === "RECHAZADO" ? "Rechazado" : "Condicionado"}
                      </span>
                    </div>
                    <span className="text-xs text-ink-500 block truncate">{app.category}</span>
                  </button>
                ))}
              </div>

              {/* Grilla de Detalles y Dictamen */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Columna Izquierda: Solicitante Prospecto */}
                <div className="bg-sand-100 border border-hairline rounded-sm p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-hairline pb-3">
                    <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider">
                      Solicitante Evaluado
                    </h4>
                    <span className="px-2 py-0.5 rounded-xs bg-sand-200 text-ink-700 font-sans text-[10px] font-bold">
                      Expediente: {selectedLeasingApp.id}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-ink-400 block text-[11px] font-medium">Marca Solicitante:</span>
                      <span className="font-bold text-ink text-sm font-display">{selectedLeasingApp.brand}</span>
                    </div>
                    <div>
                      <span className="text-ink-400 block text-[11px] font-medium">Giro & Categoría Comercial:</span>
                      <span className="font-semibold text-ink-700">{selectedLeasingApp.category}</span>
                    </div>
                    <div>
                      <span className="text-ink-400 block text-[11px] font-medium">Menú / Productos Solicitados:</span>
                      <span className="font-sans text-ink bg-sand-50 p-3 rounded-xs border border-hairline block mt-1 leading-relaxed text-[11px]">
                        {selectedLeasingApp.menu}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-hairline pt-3 text-xs">
                      <span className="text-ink-400 font-medium">Superficie Solicitada:</span>
                      <span className="font-sans font-bold text-ink">{selectedLeasingApp.sqm} m²</span>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Dictamen Cognitivo de Mariana */}
                <div className="bg-sand-50 border border-hairline rounded-sm p-5 space-y-4 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between border-b border-hairline pb-3">
                      <span className="font-bold text-xs font-display text-ink flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-pine" />
                        DICTAMEN LEGAL MARIANA AI
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-xs text-xs font-bold font-sans ${
                        selectedLeasingApp.status === "RECHAZADO" ? "bg-red-100 text-red-900" : "bg-gold/20 text-gold"
                      }`}>
                        {selectedLeasingApp.status === "RECHAZADO" ? "Bloqueado por Exclusividad" : "Aprobación Condicionada"}
                      </span>
                    </div>

                    <div>
                      <span className="text-ink-400 block text-[11px] font-medium">Inquilino Afectado en Plaza:</span>
                      <span className="font-bold text-ink text-xs font-sans">{selectedLeasingApp.conflictingTenant}</span>
                    </div>

                    <div>
                      <span className="text-ink-400 block text-[11px] font-medium">Cláusula Contractual Violada:</span>
                      <span className="font-semibold text-ink-700 text-[11px]">{selectedLeasingApp.conflictingClause}</span>
                    </div>

                    <div className="bg-sand-100 p-3 rounded-xs border border-hairline">
                      <span className="text-ink-400 block text-[10px] font-semibold uppercase tracking-wider font-sans">
                        Análisis Cognitivo Mariana:
                      </span>
                      <p className="text-ink-700 text-xs leading-relaxed mt-1 font-sans">
                        {selectedLeasingApp.reasoning}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-hairline flex justify-between items-center text-xs">
                    <span className="text-ink-400 font-medium">Riesgo Financiero Prevenido:</span>
                    <span className="text-pine font-bold text-sm font-display">{selectedLeasingApp.rentLossPrevented}</span>
                  </div>
                </div>
              </div>

              {/* Visor de Contrato PDF & Escalación a Abogado */}
              <div className="bg-sand-50 border border-hairline rounded-sm p-5 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xs bg-terra/10 text-terra border border-terra/30 flex items-center justify-center font-bold text-xs font-sans">
                      PDF
                    </div>
                    <div>
                      <span className="font-bold text-xs text-ink block font-sans">
                        {selectedLeasingApp.contractPdfName}
                      </span>
                      <span className="text-[11px] text-ink-400 font-sans">
                        Referencia Legal Extraída · {selectedLeasingApp.contractPdfPage}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert(`Descargando copia del contrato PDF: ${selectedLeasingApp.contractPdfName}...`)}
                      className="px-3 py-1.5 bg-sand-100 border border-hairline hover:bg-sand-200 text-ink font-semibold text-xs rounded-xs transition-all cursor-pointer"
                    >
                      Descargar PDF
                    </button>
                    <button
                      onClick={() => setAttorneySent(true)}
                      className="px-3.5 py-1.5 bg-dune-900 hover:bg-dune-800 text-sand-100 font-semibold text-xs rounded-xs transition-all cursor-pointer shadow-xs border border-dune-800"
                    >
                      Escalar a Lic. Ramírez (Abogado)
                    </button>
                  </div>
                </div>

                {/* Extracto Textual Resaltado */}
                <div className="bg-sand-200/80 p-4 rounded-sm border border-hairline space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-ink font-bold text-xs flex items-center gap-1.5 font-display">
                      Fragmento Textual Extraído del Contrato Firmado (Bóveda RAG)
                    </span>
                    <span className="px-2 py-0.5 rounded-xs bg-terra/15 text-terra font-sans text-[10px] font-bold">
                      {selectedLeasingApp.overlapScore}
                    </span>
                  </div>
                  <p className="text-ink-700 text-xs italic leading-relaxed bg-sand-50 p-3.5 rounded-xs border border-hairline font-serif">
                    {selectedLeasingApp.contractExactSnippet}
                  </p>
                  <div className="flex justify-between items-center pt-1 text-[11px] text-ink-500">
                    <span>Criterio Legal: <strong>{selectedLeasingApp.legalFilter}</strong></span>
                    <span className="text-pine font-medium">✓ Verificado contra 85 contratos en la base RAG</span>
                  </div>
                </div>

                {/* Notificación de Envío al Abogado */}
                {attorneySent && (
                  <div className="bg-pine/10 border border-pine/30 p-4 rounded-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-pine flex items-center gap-2 font-display">
                        <span className="h-2 w-2 rounded-full bg-pine animate-pulse" />
                        ✓ Expediente Enviado con Éxito al Lic. Ramírez (Abogado Corporativo)
                      </span>
                      <span className="text-[10px] font-sans text-pine">
                        lic.ramirez@bufete-granvia.com
                      </span>
                    </div>
                    <p className="text-xs text-ink-700 leading-relaxed font-sans">
                      Se ha enviado un correo automático con la dictaminación de Mariana, el PDF adjunto (`{selectedLeasingApp.contractPdfName}`) y la comparación de productos para validación legal formal antes de emitir la carta de rechazo a {selectedLeasingApp.brand}.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN 2: BÓVEDA HISTÓRICA DE INQUILINOS */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div>
                  <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider">
                    2. Bóveda Histórica de Contratos Vigentes & Callouts Legales
                  </h4>
                  <p className="text-xs text-ink-500 font-sans">
                    Inspección directa de exclusividades activas, vigencias y contratos indexados.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-xs bg-dune-900 text-sand-100 font-sans text-[11px] font-bold">
                  {TENANTS.length} CONTRATOS INDEXADOS RAG
                </span>
              </div>

              <div className="overflow-x-auto border border-hairline rounded-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-hairline text-ink-500 uppercase text-[10px] bg-sand-200/80 font-sans">
                      <th className="p-3 font-bold">Inquilino / Local</th>
                      <th className="p-3 font-semibold">Giro Comercial</th>
                      <th className="p-3 font-semibold">Vigencia Contrato</th>
                      <th className="p-3 font-semibold">Exclusividad Registrada</th>
                      <th className="p-3 font-semibold">Callout / Alerta Mariana</th>
                      <th className="p-3 font-semibold text-right">Contrato PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline text-ink font-medium">
                    {TENANTS.slice(0, 10).map((t) => {
                      const isCoffee = t.name.includes("Blue Luna") || t.name.includes("Cielito");
                      const isBakery = t.name.includes("La Purísima");
                      const isSalad = t.name.includes("Alma Verde");

                      return (
                        <tr key={t.slug} className="hover:bg-sand-200/40 transition-colors">
                          <td className="p-3">
                            <span className="font-bold text-ink block font-sans">{t.name}</span>
                            <span className="text-[10px] text-ink-400 font-sans">{t.zone}</span>
                          </td>
                          <td className="p-3 text-ink-700">{t.tag}</td>
                          <td className="p-3 font-sans text-ink-500">2023 - 2028 (5 Años)</td>
                          <td className="p-3 font-sans text-[11px]">
                            {isCoffee && <span className="text-terra font-bold">Cláusula #14: Exclusividad Espresso</span>}
                            {isBakery && <span className="text-terra font-bold">Cláusula #08: Exclusividad Repostería</span>}
                            {isSalad && <span className="text-terra font-bold">Cláusula #22: Exclusividad Ensaladas</span>}
                            {!isCoffee && !isBakery && !isSalad && <span className="text-ink-400">Sin Exclusividad Especial</span>}
                          </td>
                          <td className="p-3">
                            {isCoffee && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-pine/15 text-pine text-[10px] font-bold font-sans">
                                ✓ Bloqueó Starbucks Reserve (#14)
                              </span>
                            )}
                            {isBakery && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-pine/15 text-pine text-[10px] font-bold font-sans">
                                ✓ Bloqueó Krispy Kreme (#08)
                              </span>
                            )}
                            {isSalad && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-gold/20 text-gold text-[10px] font-bold font-sans">
                                Condicionado LFCE §3 (La Vicenta)
                              </span>
                            )}
                            {!isCoffee && !isBakery && !isSalad && (
                              <span className="text-ink-400 font-sans text-[11px]">Sin Conflictos Registrados</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => alert(`Descargando contrato certificado de ${t.name}...`)}
                              className="px-2.5 py-1 bg-sand-100 border border-hairline hover:bg-sand-200 text-ink font-bold text-[10px] rounded-xs cursor-pointer"
                            >
                              PDF ({t.slug}.pdf)
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECCIÓN 3: REGLAS DE GOBERNANZA LEGAL */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-4">
              <div className="border-b border-hairline pb-3">
                <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider">
                  3. Motor de Gobernanza Legal & Guardrails del Propietario
                </h4>
                <p className="text-xs text-ink-500 font-sans">
                  Configuración de la jurisdicción legal aplicable, legislación antimonopolio y políticas corporativas de Plaza La Gran Vía.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-sand-100 border border-hairline rounded-sm p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-hairline pb-2">
                    <span className="font-bold text-xs font-display text-ink">1. Jurisdicción Civil Estatal</span>
                    <span className="px-2 py-0.5 rounded-xs bg-pine/15 text-pine text-[10px] font-bold font-sans">
                      ACTIVO
                    </span>
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed font-sans">
                    Código Civil & Mercantil del Estado de Baja California para contratos de arrendamiento comercial.
                  </p>
                  <div className="bg-sand-50 p-2.5 rounded-xs border border-hairline text-[11px] font-sans text-ink-700">
                    • Plazo máximo arrendamiento: 20 Años<br />
                    • Notificación aviso rescisión: 30 Días
                  </div>
                </div>

                <div className="bg-sand-100 border border-hairline rounded-sm p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-hairline pb-2">
                    <span className="font-bold text-xs font-display text-ink">2. Filtro Antimonopolio (LFCE)</span>
                    <span className="px-2 py-0.5 rounded-xs bg-terra/15 text-terra text-[10px] font-bold font-sans">
                      FEDERAL
                    </span>
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed font-sans">
                    Ley Federal de Competencia Económica (Art. 3 & 53). Prohíbe exclusividades comerciales desproporcionadas en la plaza.
                  </p>
                  <div className="bg-sand-50 p-2.5 rounded-xs border border-hairline text-[11px] font-sans text-ink-700">
                    • Restricción máxima por zona: 200 metros<br />
                    • Prohibido bloqueo en acompañamientos
                  </div>
                </div>

                <div className="bg-sand-100 border border-hairline rounded-sm p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-hairline pb-2">
                    <span className="font-bold text-xs font-display text-ink">3. Guardrails del Propietario</span>
                    <span className="px-2 py-0.5 rounded-xs bg-dune-900 text-sand-100 text-[10px] font-bold font-sans">
                      REGLAS PLAZA
                    </span>
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed font-sans">
                    Políticas operativas obligatorias aprobadas por el Sr. Martín para la administración del activo.
                  </p>
                  <div className="bg-sand-50 p-2.5 rounded-xs border border-hairline text-[11px] font-sans text-ink-700">
                    • Límite: Máx 1 Exclusividad / Zona<br />
                    • Subarrendamiento: Prohibido sin aval<br />
                    • Trazabilidad 100% en SAARI ERP
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- PESTAÑA 3: CAPEX & DIEGO (VERTICAL STORYBOARD) ---------------- */}
        {activeTab === "maint" && (
          <div className="space-y-6">
            {/* Header & KPI Summary Bar */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-3">
                <div>
                  <h3 className="font-bold text-sm font-display text-ink flex items-center gap-2">
                    <span>Auditoría de Gastos CapEx & Garantías de Equipos (Diego)</span>
                    <span className="px-2 py-0.5 rounded-xs bg-gold/20 text-gold font-sans text-[10px] font-bold">
                      SOP §2B & CAPEX GUARDIAN AI
                    </span>
                  </h3>
                  <p className="text-xs text-ink-500 font-sans">
                    Verificación técnica de reclamos de mantenimiento, garantías de fabricante y protección del flujo del propietario.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xs bg-dune-900 text-sand-100 font-sans text-[11px] font-bold">
                    6 EQUIPOS CRÍTICOS MONITOREADOS
                  </span>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans text-xs">
                <div className="bg-sand-100 p-3 rounded-xs border border-hairline">
                  <span className="text-ink-400 text-[10px] uppercase font-semibold block">Reclamos Auditados</span>
                  <span className="text-ink font-bold text-base mt-0.5 block font-display">3 Casos Auditados</span>
                </div>
                <div className="bg-sand-100 p-3 rounded-xs border border-hairline">
                  <span className="text-ink-400 text-[10px] uppercase font-semibold block">Garantías Recobradas ($0)</span>
                  <span className="text-pine font-bold text-base mt-0.5 block font-display">$145,000 MXN / Evento</span>
                </div>
                <div className="bg-sand-100 p-3 rounded-xs border border-hairline">
                  <span className="text-ink-400 text-[10px] uppercase font-semibold block">Gasto Improcedente Rechazado</span>
                  <span className="text-terra font-bold text-base mt-0.5 block font-display">$78,000 MXN Rechazado</span>
                </div>
              </div>
            </div>

            {/* INTERACTIVE AI OPERATIONS ASSISTANT ("CONSULTAR A DIEGO AI") */}
            <div className="bg-sand-50 border border-gold/30 rounded-sm p-5 shadow-2xs space-y-4 ring-1 ring-gold/10">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xs bg-gold text-ink flex items-center justify-center font-bold text-xs shadow-2xs font-display">
                    D
                  </div>
                  <div>
                    <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider">
                      Asistente Operativo AI: Consulta Directa a Diego
                    </h4>
                    <p className="text-[11px] text-ink-500">
                      Haz preguntas sobre pólizas Carrier, números de serie, deslinde CapEx/OPEX o contratos de mantenimiento.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-xs bg-gold/20 text-gold text-[10px] font-bold font-sans">
                  ● AUDITORÍA TÉCNICA ACTIVA
                </span>
              </div>

              {/* Quick Query Preset Pills */}
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => {
                    setDiegoQuery("¿Por qué el reemplazo de compresor HVAC de Ashley Furniture no le cuesta al propietario?");
                    setDiegoChatHistory([
                      ...diegoChatHistory,
                      {
                        query: "¿Por qué el reemplazo de compresor HVAC de Ashley Furniture no le cuesta al propietario?",
                        answer: "Diego verificó el número de serie Carrier #CR-884920. La póliza de garantía del fabricante Carrier cubre fallas mecánicas de compresores de 15 toneladas durante 5 años (vigente hasta Noviembre 2028). Se tramitó la sustitución sin costo para el propietario ($0 MXN).",
                        refCert: "Poliza_Garantia_Carrier_Ashley_HVAC.pdf",
                        refClause: "Serie #CR-884920 (Cobertura 100% Fábrica)",
                      },
                    ]);
                  }}
                  className="px-3 py-1.5 bg-sand-200/70 hover:bg-sand-200 text-ink-700 font-medium rounded-xs text-[11px] transition-all cursor-pointer border border-hairline"
                >
                  Póliza Carrier HVAC Ashley (#CR-884920)
                </button>
                <button
                  onClick={() => {
                    setDiegoQuery("¿Por qué se rechazó la factura de $78,000 MXN de Derma Club?");
                    setDiegoChatHistory([
                      ...diegoChatHistory,
                      {
                        query: "¿Por qué se rechazó la factura de $78,000 MXN de Derma Club?",
                        answer: "Derma Club solicitó el pago de remodelación de luminarias estéticas interiores. Conforme a la Sección 12 del contrato de arrendamiento, la decoración e iluminación arquitectónica interior es responsabilidad exclusiva del arrendatario. El dictamen de Diego rechazó la factura por ser improcedente.",
                        refCert: "Contrato_DermaClub_LocB08_Firmado.pdf",
                        refClause: "Sección 12 (Responsabilidad Inquilino)",
                      },
                    ]);
                  }}
                  className="px-3 py-1.5 bg-sand-200/70 hover:bg-sand-200 text-ink-700 font-medium rounded-xs text-[11px] transition-all cursor-pointer border border-hairline"
                >
                  Iluminación Estética Derma Club ($78k)
                </button>
                <button
                  onClick={() => {
                    setDiegoQuery("¿El mantenimiento preventivo de la planta de emergencia de Cinemex entra en CAM?");
                    setDiegoChatHistory([
                      ...diegoChatHistory,
                      {
                        query: "¿El mantenimiento preventivo de la planta de emergencia de Cinemex entra en CAM?",
                        answer: "Sí. La planta de emergencia diésel de 500kW abastece el sistema de respaldo contra incendios y evacuación común de toda la plaza. Conforme a la norma NNN, el servicio preventivo ($52,000 MXN) es un gasto de infraestructura común prorrateable en la liquidación CAM mensual.",
                        refCert: "Contrato_Mantenimiento_Caterpillar_Planta.pdf",
                        refClause: "Prorrateo CAM NNN (Art. 14.2)",
                      },
                    ]);
                  }}
                  className="px-3 py-1.5 bg-sand-200/70 hover:bg-sand-200 text-ink-700 font-medium rounded-xs text-[11px] transition-all cursor-pointer border border-hairline"
                >
                  Mantenimiento Planta Emergencia Cinemex
                </button>
              </div>

              {/* Chat History Display Area */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {diegoChatHistory.map((item, i) => (
                  <div key={i} className="bg-sand-100 p-4 rounded-xs border border-hairline space-y-2 text-xs">
                    <div className="flex items-center justify-between text-ink-500 font-medium">
                      <span>Consulta: <strong className="text-ink font-sans">{item.query}</strong></span>
                      <span className="text-[10px] font-sans text-gold">✓ Verificado en Bitácora de Equipos</span>
                    </div>
                    <p className="text-ink-700 leading-relaxed font-sans text-xs bg-sand-50 p-3 rounded-xs border border-hairline">
                      {item.answer}
                    </p>
                    {item.refCert && (
                      <div className="flex items-center justify-between text-[11px] text-ink-500 pt-1 font-sans">
                        <span className="flex items-center gap-1.5 text-terra font-semibold">
                          Certificado de Garantía / Contrato: {item.refCert} ({item.refClause})
                        </span>
                        <button
                          onClick={() => alert(`Descargando documento de soporte técnico: ${item.refCert}...`)}
                          className="text-terra hover:underline font-bold"
                        >
                          Descargar Póliza PDF →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Input Query Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!diegoQuery.trim()) return;
                  setDiegoChatHistory([
                    ...diegoChatHistory,
                    {
                      query: diegoQuery,
                      answer: `Diego verificó el expediente técnico para "${diegoQuery}": El equipo cuenta con bitácora de mantenimiento preventivo al día y cumple con la matriz de deslinde CapEx/OPEX aprobada por la administración de Plaza La Gran Vía.`,
                      refCert: "Bitacora_Mantenimiento_Plaza_GranVia.pdf",
                      refClause: "Inspección Técnica Diego AI",
                    },
                  ]);
                  setDiegoQuery("");
                }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  type="text"
                  value={diegoQuery}
                  onChange={(e) => setDiegoQuery(e.target.value)}
                  placeholder="Pregunta a Diego sobre garantías HVAC, plantas de emergencia o deslinde de gastos..."
                  className="flex-1 px-3.5 py-2.5 bg-sand-100 border border-hairline rounded-xs text-xs text-ink focus:outline-none focus:ring-2 focus:ring-gold/20 focus:bg-sand-50 transition-all font-sans"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-dune-900 hover:bg-dune-800 text-sand-100 font-bold text-xs rounded-xs transition-all shadow-xs cursor-pointer font-sans"
                >
                  Consultar AI →
                </button>
              </form>
            </div>

            {/* SECCIÓN 1: EVALUADOR DE SOLICITUDES CAPEX & RECLAMACIÓN DE GARANTÍAS */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-6">
              <div className="border-b border-hairline pb-3">
                <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider flex items-center justify-between">
                  <span>1. Evaluador de Solicitudes CapEx & Reclamación de Garantías</span>
                  <span className="text-[11px] text-ink-400 font-normal font-sans">Selecciona un gasto reclamado para auditar</span>
                </h4>
              </div>

              {/* Selector de Casos de CapEx */}
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
                        ? "bg-sand-200/90 border-gold ring-1 ring-gold/30 shadow-2xs"
                        : "bg-sand-50 border-hairline hover:bg-sand-200/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-ink font-display">{item.tenant}</span>
                      <span className="font-sans font-bold text-xs text-terra">
                        ${item.amount.toLocaleString()} MXN
                      </span>
                    </div>
                    <span className="text-xs text-ink-500 block truncate">{item.expenseType}</span>
                  </button>
                ))}
              </div>

              {/* Tarjeta de Dictamen Técnico de Diego */}
              <div className="bg-sand-50 p-6 rounded-sm space-y-5 text-xs shadow-2xs border border-hairline">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-3">
                  <span className="text-ink font-bold text-sm flex items-center gap-2 font-display">
                    <span className="h-2 w-2 rounded-full bg-gold" />
                    Dictamen Técnico & Contractual Diego AI ({selectedCapex.id})
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-xs text-xs font-bold font-sans ${
                    selectedCapex.verdict === "RECHAZADO_RESPONSABILIDAD_INQUILINO"
                      ? "bg-red-100 text-red-900 border border-red-200"
                      : selectedCapex.verdict === "APROBADO_GARANTIA_COSTO_CERO"
                      ? "bg-pine/15 text-pine border border-pine/30"
                      : "bg-terra/15 text-terra border border-terra/30"
                  }`}>
                    {selectedCapex.verdict === "RECHAZADO_RESPONSABILIDAD_INQUILINO" && "Rechazado (Responsabilidad Inquilino)"}
                    {selectedCapex.verdict === "APROBADO_GARANTIA_COSTO_CERO" && "✓ Garantía Aplicada ($0 Costo Propietario)"}
                    {selectedCapex.verdict === "APROBADO_PRORRATEO_CAM" && "✓ Aprobado CAM (Prorrateable NNN)"}
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-4 text-[11px]">
                  <div className="bg-sand-100 p-3.5 rounded-xs border border-hairline">
                    <span className="text-ink-400 block text-[10px] mb-1 font-sans">Inquilino Solicitante</span>
                    <span className="text-ink font-bold block text-xs font-sans">{selectedCapex.tenant}</span>
                  </div>

                  <div className="bg-sand-100 p-3.5 rounded-xs border border-hairline">
                    <span className="text-ink-400 block text-[10px] mb-1 font-sans">Monto Monitoreado</span>
                    <span className="text-terra font-bold block text-xs">${selectedCapex.amount.toLocaleString()} MXN</span>
                  </div>

                  <div className="bg-sand-100 p-3.5 rounded-xs border border-hairline">
                    <span className="text-ink-400 block text-[10px] mb-1 font-sans">Impacto al Propietario</span>
                    <span className="text-ink font-bold block text-xs">
                      {selectedCapex.verdict === "APROBADO_PRORRATEO_CAM" ? "Prorrateado NNN" : "$0 MXN (Absorbido)"}
                    </span>
                  </div>
                </div>

                <div className="bg-sand-100 p-4 rounded-xs border border-hairline space-y-2">
                  <span className="text-ink-400 font-bold block text-[10px] font-sans uppercase tracking-wider">Análisis Cognitivo Diego</span>
                  <p className="text-ink-700 text-xs leading-relaxed font-sans">{selectedCapex.details}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <span className="text-[10px] text-ink-400 font-sans">
                    ✓ Auditado automáticamente contra pólizas Carrier & Sección 12 del contrato marco.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert(`Descargando dictamen técnico oficial para ${selectedCapex.tenant}...`)}
                      className="px-3 py-1.5 bg-sand-100 border border-hairline hover:bg-sand-200 text-ink font-bold text-xs rounded-xs transition-all cursor-pointer"
                    >
                      Dictamen PDF
                    </button>
                    <button
                      onClick={() => setDiegoNotificationSent(true)}
                      className="px-3.5 py-1.5 bg-dune-900 hover:bg-dune-800 text-sand-100 font-bold text-xs rounded-xs transition-all cursor-pointer shadow-xs border border-dune-800"
                    >
                      ✉️ Notificar Resolución Técnica
                    </button>
                  </div>
                </div>

                {diegoNotificationSent && (
                  <div className="bg-pine/10 border border-pine/30 p-3.5 rounded-xs text-[11px] font-sans space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-pine font-display">
                      ✓ Notificación Técnica Enviada a {selectedCapex.tenant.toUpperCase()}
                    </div>
                    <p className="text-ink-700 text-[10px] font-sans">
                      Se ha transmitido la resolución oficial de Diego con los números de póliza y la referencia de contrato correspondiente para su archivo.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN 2: BITÁCORA DE EQUIPOS CRÍTICOS & PÓLIZAS DE GARANTÍA VIGENTES */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div>
                  <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider">
                    2. Bitácora de Equipos Críticos & Pólizas de Garantía Vigentes
                  </h4>
                  <p className="text-xs text-ink-500 font-sans">
                    Registro de infraestructura instalada, números de serie y vigencia de pólizas de fabricante ($0 costo).
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-xs bg-dune-900 text-sand-100 font-sans text-[11px] font-bold">
                  6 EQUIPOS REGISTRADOS
                </span>
              </div>

              <div className="overflow-x-auto border border-hairline rounded-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-hairline text-ink-500 uppercase text-[10px] bg-sand-200/80 font-sans">
                      <th className="p-3 font-bold">Equipo / Ubicación</th>
                      <th className="p-3 font-semibold">Marca & Modelo</th>
                      <th className="p-3 font-semibold">Número de Serie</th>
                      <th className="p-3 font-semibold">Vigencia Garantía</th>
                      <th className="p-3 font-semibold">Estatus de Cobertura</th>
                      <th className="p-3 font-semibold text-right">Póliza PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline text-ink font-medium">
                    <tr className="hover:bg-sand-200/40 transition-colors">
                      <td className="p-3 font-bold text-ink font-sans">Carrier HVAC 15 Toneladas (Ashley)</td>
                      <td className="p-3 text-ink-700">Carrier Commercial WeatherMaster</td>
                      <td className="p-3 font-sans text-ink font-bold">#CR-884920</td>
                      <td className="p-3 font-sans text-ink-500">2023 - 2028 (5 Años)</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-pine/15 text-pine text-[10px] font-bold font-sans">
                          ✓ Garantía 100% Activa ($0 MXN)
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => alert("Descargando Póliza de Garantía Carrier #CR-884920...")}
                          className="px-2.5 py-1 bg-sand-100 border border-hairline hover:bg-sand-200 text-ink font-bold text-[10px] rounded-xs cursor-pointer"
                        >
                          Carrier_Poliza.pdf
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-sand-200/40 transition-colors">
                      <td className="p-3 font-bold text-ink font-sans">Planta de Emergencia Diésel 500kW (Cinemex)</td>
                      <td className="p-3 text-ink-700">Caterpillar C15 ACERT</td>
                      <td className="p-3 font-sans text-ink font-bold">#CAT-500-9942</td>
                      <td className="p-3 font-sans text-ink-500">Contrato Anual Preventivo</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-terra/15 text-terra text-[10px] font-bold font-sans">
                          ✓ Cobertura CAM Prorrateable
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => alert("Descargando Contrato Caterpillar...")}
                          className="px-2.5 py-1 bg-sand-100 border border-hairline hover:bg-sand-200 text-ink font-bold text-[10px] rounded-xs cursor-pointer"
                        >
                          Cat_Maint_2026.pdf
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-sand-200/40 transition-colors">
                      <td className="p-3 font-bold text-ink font-sans">Subestación Eléctrica Principal 13.8kV</td>
                      <td className="p-3 text-ink-700">Schneider Electric Trihal 1500kVA</td>
                      <td className="p-3 font-sans text-ink font-bold">#SCH-SE-44210</td>
                      <td className="p-3 font-sans text-ink-500">Garantía Infraestructura Propietario</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-gold/20 text-gold text-[10px] font-bold font-sans">
                          ✓ Mantenimiento Bianual Al Día
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => alert("Descargando Certificado Schneider...")}
                          className="px-2.5 py-1 bg-sand-100 border border-hairline hover:bg-sand-200 text-ink font-bold text-[10px] rounded-xs cursor-pointer"
                        >
                          Schneider_13.8kV.pdf
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECCIÓN 3: MATRIZ DE DESLINDE CAPEX / OPEX & REGLAS DE RESPONSABILIDAD */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-4">
              <div className="border-b border-hairline pb-3">
                <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider">
                  3. Matriz de Deslinde CapEx / OPEX & Reglas de Mantenimiento
                </h4>
                <p className="text-xs text-ink-500 font-sans">
                  Criterios normativos de asignación de costos entre Propietario, Inquilino y Fondo Común CAM.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-sand-100 border border-hairline rounded-sm p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-hairline pb-2">
                    <span className="font-bold text-xs font-display text-ink">1. Carga del Propietario</span>
                    <span className="px-2 py-0.5 rounded-xs bg-pine/15 text-pine text-[10px] font-bold font-sans">
                      CAPEX PROPIETARIO
                    </span>
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed font-sans">
                    Infraestructura estructural primaria y activos mayores de la plaza.
                  </p>
                  <div className="bg-sand-50 p-2.5 rounded-xs border border-hairline text-[11px] font-sans text-ink-700">
                    • Cimentación & muros de carga<br />
                    • Impermeabilización general de losas<br />
                    • Red principal hidrosanitaria
                  </div>
                </div>

                <div className="bg-sand-100 border border-hairline rounded-sm p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-hairline pb-2">
                    <span className="font-bold text-xs font-display text-ink">2. Carga del Inquilino</span>
                    <span className="px-2 py-0.5 rounded-xs bg-red-100 text-red-900 text-[10px] font-bold font-sans">
                      RESPONSABILIDAD LOCAL
                    </span>
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed font-sans">
                    Equipamiento interior, acabados arquitectónicos y mantenimiento preventivo exclusivo del giro.
                  </p>
                  <div className="bg-sand-50 p-2.5 rounded-xs border border-hairline text-[11px] font-sans text-ink-700">
                    • Luminarias estéticas e interiores<br />
                    • Trampas de grasa y filtros de cocina<br />
                    • Cortinas metálicas y cristales
                  </div>
                </div>

                <div className="bg-sand-100 border border-hairline rounded-sm p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-hairline pb-2">
                    <span className="font-bold text-xs font-display text-ink">3. Prorrateo CAM NNN</span>
                    <span className="px-2 py-0.5 rounded-xs bg-terra/15 text-terra text-[10px] font-bold font-sans">
                      GASTO COMÚN
                    </span>
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed font-sans">
                    Gastos operativos de conservación y servicios compartidos entre los 85 locales.
                  </p>
                  <div className="bg-sand-50 p-2.5 rounded-xs border border-hairline text-[11px] font-sans text-ink-700">
                    • Vigilancia 24/7 y circuito cerrado<br />
                    • Alumbrado de estacionamiento<br />
                    • Planta de emergencia diésel común
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- PESTAÑA 4: CAM & RENATA (VERTICAL STORYBOARD) ---------------- */}
        {activeTab === "cam" && (
          <div className="space-y-6">
            {/* Header & KPI Summary Bar */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-3">
                <div>
                  <h3 className="font-bold text-sm font-display text-ink flex items-center gap-2">
                    <span>Prorrateo NNN & Auditoría Fiscal SAT CFDI 4.0 (Renata)</span>
                    <span className="px-2 py-0.5 rounded-xs bg-terra/15 text-terra font-sans text-[10px] font-bold">
                      SOP §2C & FISCAL GUARDIAN AI
                    </span>
                  </h3>
                  <p className="text-xs text-ink-500 font-sans">
                    Vista de prototipo: auditoría automatizada de timbrado CFDI 4.0, complementos de pago PPD/PUE y balance matemático invariante del prorrateo CAM. Casos mostrados con datos ilustrativos.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xs bg-dune-900 text-sand-100 font-sans text-[11px] font-bold">
                    85 LOCALES BALANCED 1.0000
                  </span>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans text-xs">
                <div className="bg-sand-100 p-3 rounded-xs border border-hairline">
                  <span className="text-ink-400 text-[10px] uppercase font-semibold block">Validación Fiscal SAT</span>
                  <span className="text-ink font-bold text-base mt-0.5 block font-display">84 / 85 CFDIs Validados</span>
                </div>
                <div className="bg-sand-100 p-3 rounded-xs border border-hairline">
                  <span className="text-ink-400 text-[10px] uppercase font-semibold block">Invariante Prorrateo CAM</span>
                  <span className="text-terra font-bold text-base mt-0.5 block font-display">1.0000 Balance Exacto</span>
                </div>
                <div className="bg-sand-100 p-3 rounded-xs border border-hairline">
                  <span className="text-ink-400 text-[10px] uppercase font-semibold block">Multa SAT Prevenida</span>
                  <span className="text-pine font-bold text-base mt-0.5 block font-display">$12,500 MXN Sanción $0</span>
                </div>
              </div>
            </div>

            {/* INTERACTIVE AI FISCAL & CAM ASSISTANT ("CONSULTAR A RENATA AI") */}
            <div className="bg-sand-50 border border-terra/30 rounded-sm p-5 shadow-2xs space-y-4 ring-1 ring-terra/10">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xs bg-terra text-sand-100 flex items-center justify-center font-bold text-xs shadow-2xs font-display">
                    R
                  </div>
                  <div>
                    <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider">
                      Asistente Fiscal AI: Consulta Directa a Renata
                    </h4>
                    <p className="text-[11px] text-ink-500">
                      Haz preguntas sobre timbrado SAT CFDI 4.0, complementos de pago PPD vs PUE o la fórmula de prorrateo NNN.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-xs bg-terra/15 text-terra text-[10px] font-bold font-sans">
                  ● VALIDADOR SAT CFDI 4.0 ACTIVO
                </span>
              </div>

              {/* Quick Query Preset Pills */}
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => {
                    setRenataQuery("¿Por qué MINT Boutique registró una alerta fiscal SAT CFDI 4.0?");
                    setRenataChatHistory([
                      ...renataChatHistory,
                      {
                        query: "¿Por qué MINT Boutique registró una alerta fiscal SAT CFDI 4.0?",
                        answer: "MINT Boutique pagó $32,000 MXN mediante transferencia registrando el método PUE (Pago en una sola exhibición), pero la factura original se emitió bajo el régimen PPD (Pago en parcialidades). Renata detectó la discrepancia antes de la declaración mensual del SAT para auto-emitir el Complemento de Recepción de Pagos sin sanción.",
                        refSat: "CFDI_4.0_Complemento_Pago_SAT_MINT.xml",
                        refClause: "Anexo 20 RMF SAT §2.7.1.35",
                      },
                    ]);
                  }}
                  className="px-3 py-1.5 bg-sand-200/70 hover:bg-sand-200 text-ink-700 font-medium rounded-xs text-[11px] transition-all cursor-pointer border border-hairline"
                >
                  Alerta MINT Boutique (PPD vs PUE)
                </button>
                <button
                  onClick={() => {
                    setRenataQuery("¿Cómo se garantiza que el prorrateo CAM sume exactamente 1.0000 (100.00%)?");
                    setRenataChatHistory([
                      ...renataChatHistory,
                      {
                        query: "¿Cómo se garantiza que el prorrateo CAM sume exactamente 1.0000 (100.00%)?",
                        answer: "Renata aplica la fórmula de la invariante matemática NNN: [Área Rentada Local / Superficie Total GLA Plaza (7,550 m²)]. El propietario absorbe directamente la fracción de los 445 m² vacantes (5.89%), garantizando que la sumatoria de las 85 participaciones cuadre en 1.0000 exacto.",
                        refSat: "Invariante_Matematica_Prorrateo_CAM.pdf",
                        refClause: "Ecuación NNN §1.0000 Balance",
                      },
                    ]);
                  }}
                  className="px-3 py-1.5 bg-sand-200/70 hover:bg-sand-200 text-ink-700 font-medium rounded-xs text-[11px] transition-all cursor-pointer border border-hairline"
                >
                  Invariante Mathemática Prorrateo CAM 1.0000
                </button>
                <button
                  onClick={() => {
                    setRenataQuery("¿Qué requisitos exige el SAT en la versión CFDI 4.0 para gastos NNN?");
                    setRenataChatHistory([
                      ...renataChatHistory,
                      {
                        query: "¿Qué requisitos exige el SAT en la versión CFDI 4.0 para gastos NNN?",
                        answer: "El SAT exige que el Código Postal del receptor coincide 100% con la Cédula de Identificación Fiscal (CIF), el Régimen Fiscal 601 o 612 según corresponda, la clave de producto 80131502 (Arrendamiento de inmuebles comerciales) y el desglose separado de IVA (16%) y retención del 10% si aplica.",
                        refSat: "Guia_Anexo20_SAT_CFDI40.pdf",
                        refClause: "Art. 29-A Código Fiscal de la Federación",
                      },
                    ]);
                  }}
                  className="px-3 py-1.5 bg-sand-200/70 hover:bg-sand-200 text-ink-700 font-medium rounded-xs text-[11px] transition-all cursor-pointer border border-hairline"
                >
                  Requisitos CFDI 4.0 para Deducción NNN
                </button>
              </div>

              {/* Chat History Display Area */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {renataChatHistory.map((item, i) => (
                  <div key={i} className="bg-sand-100 p-4 rounded-xs border border-hairline space-y-2 text-xs">
                    <div className="flex items-center justify-between text-ink-500 font-medium">
                      <span>Consulta Fiscal: <strong className="text-ink font-sans">{item.query}</strong></span>
                      <span className="text-[10px] font-sans text-terra">✓ Validación SAT Anexo 20</span>
                    </div>
                    <p className="text-ink-700 leading-relaxed font-sans text-xs bg-sand-50 p-3 rounded-xs border border-hairline">
                      {item.answer}
                    </p>
                    {item.refSat && (
                      <div className="flex items-center justify-between text-[11px] text-ink-500 pt-1 font-sans">
                        <span className="flex items-center gap-1.5 text-terra font-semibold">
                          Esquema XML / Póliza SAT: {item.refSat} ({item.refClause})
                        </span>
                        <button
                          onClick={() => alert(`Descargando esquema XML SAT: ${item.refSat}...`)}
                          className="text-terra hover:underline font-bold"
                        >
                          Descargar XML SAT →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Input Query Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!renataQuery.trim()) return;
                  setRenataChatHistory([
                    ...renataChatHistory,
                    {
                      query: renataQuery,
                      answer: `Renata verificó el registro fiscal SAT para "${renataQuery}": Todos los comprobantes CFDI 4.0 emitidos cumplen con la estructura de Anexo 20 del SAT y el timbrado de complementos de pago PPD está al día.`,
                      refSat: "Matriz_SAT_CFDI_GranVia.xml",
                      refClause: "Verificación Fiscal Renata AI",
                    },
                  ]);
                  setRenataQuery("");
                }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  type="text"
                  value={renataQuery}
                  onChange={(e) => setRenataQuery(e.target.value)}
                  placeholder="Pregunta a Renata sobre el timbrado SAT, complementos PPD/PUE o prorrateo NNN..."
                  className="flex-1 px-3.5 py-2.5 bg-sand-100 border border-hairline rounded-xs text-xs text-ink focus:outline-none focus:ring-2 focus:ring-terra/20 focus:bg-sand-50 transition-all font-sans"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-dune-900 hover:bg-dune-800 text-sand-100 font-bold text-xs rounded-xs transition-all shadow-xs cursor-pointer font-sans"
                >
                  Consultar AI →
                </button>
              </form>
            </div>

            {/* SECCIÓN 1: EVALUADOR DE EXPEDIENTES FISCALES SAT & ALERTAS CFDI 4.0 */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-5">
              <div className="border-b border-hairline pb-3">
                <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider flex items-center justify-between">
                  <span>1. Auditoría de Errores Fiscales SAT CFDI 4.0 & Complementos PPD</span>
                  <span className="text-[11px] text-ink-400 font-normal font-sans">Monitoreo automático pre-declaración</span>
                </h4>
              </div>

              {/* Banner de Alerta Fiscal MINT Boutique */}
              <div className="bg-red-50/90 border border-red-200 p-5 rounded-xs space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
                    <span className="font-bold text-xs text-red-900 uppercase tracking-wider font-display">
                      ALERTA FISCAL SAT CFDI 4.0: MINT BOUTIQUE (LOCAL B-12)
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-xs bg-red-200/80 text-red-900 font-sans text-[10px] font-bold">
                    RIESGO MULTA: $12,500 MXN PREVENIDO
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-sand-50 p-3 rounded-xs border border-red-200/60">
                    <span className="text-ink-400 block text-[10px] font-medium">Factura Original Emitida:</span>
                    <span className="font-bold text-ink font-sans">Folio #CFDI-8842 (Método PPD)</span>
                  </div>
                  <div className="bg-sand-50 p-3 rounded-xs border border-red-200/60">
                    <span className="text-ink-400 block text-[10px] font-medium">Pago Recibido en Banco:</span>
                    <span className="font-bold text-pine font-sans">$32,000 MXN (Registrado PUE)</span>
                  </div>
                  <div className="bg-sand-50 p-3 rounded-xs border border-red-200/60">
                    <span className="text-ink-400 block text-[10px] font-medium">Discrepancia SAT:</span>
                    <span className="font-bold text-red-700 font-sans">Falta Complemento de Pago</span>
                  </div>
                </div>

                <p className="text-xs text-red-900 leading-relaxed font-sans">
                  Renata detectó que la transferencia bancaria fue registrada erróneamente por el cliente como PUE (Pago en una sola exhibición). Conforme al Reglamento de la Cédula Fiscal SAT CFDI 4.0, se requiere auto-emitir el Complemento de Recepción de Pagos oficial antes del cierre del mes para evitar auditorías al propietario.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <span className="text-[11px] text-red-700 font-sans font-medium">
                    Estado: Esperando confirmación para timbrado directo ante el PAC SAT
                  </span>
                  <button
                    onClick={() => setRenataCfdiIssued(true)}
                    className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xs transition-all shadow-xs cursor-pointer font-sans"
                  >
                    Auto-Emitir Complemento SAT CFDI 4.0
                  </button>
                </div>

                {renataCfdiIssued && (
                  <div className="bg-pine/10 border border-pine/30 p-4 rounded-xs space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-pine font-display">
                      <span>✓ Complemento de Pago Timbrado con Éxito ante el SAT (PAC ID #9982)</span>
                      <span className="text-[10px] font-normal text-ink-400 font-sans">UUID: 4A8B9C20-8842-491A-8821</span>
                    </div>
                    <pre className="bg-sand-100 border border-hairline p-3.5 rounded-xs text-ink-700 font-mono text-[10px] overflow-x-auto">
{`<cfdi:Comprobante Version="4.0" TipoDeComprobante="P" Moneda="XXX">
  <cfdi:Receptor Rfc="MBO180412HV9" Nombre="MINT BOUTIQUE S.A. DE C.V." RegimenFiscalReceptor="601"/>
  <pago20:Pagos Version="2.0">
    <pago20:Pago FechaPago="2026-08-01" FormaDePagoP="03" Monto="32000.00"/>
  </pago20:Pagos>
</cfdi:Comprobante>`}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN 2: MATRIZ DE PRORRATEO NNN & LIQUIDACIÓN CAM (85 LOCALES) */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div>
                  <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider">
                    2. Matriz de Prorrateo NNN & Liquidación CAM por Inquilino (85 Locales)
                  </h4>
                  <p className="text-xs text-ink-500 font-sans">
                    Cálculo automatizado de participación pro-rata, cuota base, honorarios de administración e IVA.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-xs bg-dune-900 text-sand-100 font-sans text-[11px] font-bold">
                  INVARIANTE 1.0000 CUADRADA
                </span>
              </div>

              <div className="overflow-x-auto border border-hairline rounded-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-hairline text-ink-500 uppercase text-[10px] bg-sand-200/80 font-sans">
                      <th className="p-3 font-bold">Inquilino / Local</th>
                      <th className="p-3 font-semibold text-right">Superficie m²</th>
                      <th className="p-3 font-semibold text-right">% Pro-Rata NNN</th>
                      <th className="p-3 font-semibold text-right">Cuota CAM Base</th>
                      <th className="p-3 font-semibold text-right">Admin (15%)</th>
                      <th className="p-3 font-semibold text-right">IVA (16%)</th>
                      <th className="p-3 font-semibold text-right">Total CFDI MXN</th>
                      <th className="p-3 font-semibold text-right">Estado SAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline text-ink font-medium">
                    {TENANTS.slice(0, 8).map((t, idx) => {
                      const sqm = getTenantSqm(t.name, idx);
                      const sharePct = ((sqm / plazaTotalGla) * 100).toFixed(2);
                      const baseCam = Math.round(sqm * 35.5);
                      const adminFee = Math.round(baseCam * 0.15);
                      const iva = Math.round((baseCam + adminFee) * 0.16);
                      const totalCfdi = baseCam + adminFee + iva;

                      return (
                        <tr key={t.slug} className="hover:bg-sand-200/40 transition-colors">
                          <td className="p-3 font-bold text-ink font-sans">{t.name}</td>
                          <td className="p-3 text-right font-sans font-bold text-ink">{sqm} m²</td>
                          <td className="p-3 text-right font-sans font-bold text-terra">{sharePct}%</td>
                          <td className="p-3 text-right font-sans">${baseCam.toLocaleString()}</td>
                          <td className="p-3 text-right font-sans">${adminFee.toLocaleString()}</td>
                          <td className="p-3 text-right font-sans">${iva.toLocaleString()}</td>
                          <td className="p-3 text-right font-sans font-bold text-ink">${totalCfdi.toLocaleString()}</td>
                          <td className="p-3 text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-pine/15 text-pine text-[10px] font-bold font-sans">
                              ✓ Timbrado SAT CFDI 4.0
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECCIÓN 3: REGLAS DE GOBERNANZA FISCAL SAT & ESTÁNDAR NNN */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-4">
              <div className="border-b border-hairline pb-3">
                <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider">
                  3. Reglas de Gobernanza Fiscal SAT CFDI 4.0 & Estándar NNN
                </h4>
                <p className="text-xs text-ink-500 font-sans">
                  Criterios de auditoría tributaria y conservación del fondo operativo de la plaza.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-sand-100 border border-hairline rounded-sm p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-hairline pb-2">
                    <span className="font-bold text-xs font-display text-ink">1. Régimen PPD / PUE SAT</span>
                    <span className="px-2 py-0.5 rounded-xs bg-terra/15 text-terra text-[10px] font-bold font-sans">
                      SAT 4.0
                    </span>
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed font-sans">
                    Obligatoriedad de timbrado del Complemento de Pago dentro de los primeros 5 días hábiles del mes posterior.
                  </p>
                  <div className="bg-sand-50 p-2.5 rounded-xs border border-hairline text-[11px] font-sans text-ink-700">
                    • Límite emisión complemento: Día 5<br />
                    • Validación RFC receptor contra CIF<br />
                    • Trazabilidad bancaria SPEI
                  </div>
                </div>

                <div className="bg-sand-100 border border-hairline rounded-sm p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-hairline pb-2">
                    <span className="font-bold text-xs font-display text-ink">2. Invariante NNN (1.0000)</span>
                    <span className="px-2 py-0.5 rounded-xs bg-pine/15 text-pine text-[10px] font-bold font-sans">
                      MATEMÁTICA NNN
                    </span>
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed font-sans">
                    Distribución proporcional exacta del 100% de la superficie rentable de la plaza.
                  </p>
                  <div className="bg-sand-50 p-2.5 rounded-xs border border-hairline text-[11px] font-sans text-ink-700">
                    • Superficie GLA: 7,550 m²<br />
                    • Absorción vacancia propietario: 5.89%<br />
                    • Error de redondeo tolerado: 0.0000
                  </div>
                </div>

                <div className="bg-sand-100 border border-hairline rounded-sm p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-hairline pb-2">
                    <span className="font-bold text-xs font-display text-ink">3. Honorario Administración</span>
                    <span className="px-2 py-0.5 rounded-xs bg-dune-900 text-sand-100 text-[10px] font-bold font-sans">
                      FEE 15% NNN
                    </span>
                  </div>
                  <p className="text-xs text-ink-700 leading-relaxed font-sans">
                    Cálculo del 15% sobre gastos de mantenimiento común para la administración del activo.
                  </p>
                  <div className="bg-sand-50 p-2.5 rounded-xs border border-hairline text-[11px] font-sans text-ink-700">
                    • Aplicable a: Mantenimientos comunes<br />
                    • Excluido de: Renta base pura<br />
                    • Facturación transparente mensual
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- PESTAÑA 5: SAARI ERP (VERTICAL STORYBOARD) ---------------- */}
        {activeTab === "saari" && (
          <div className="space-y-6">
            {/* Header & KPI Summary Bar */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-3">
                <div>
                  <h3 className="font-bold text-sm font-display text-ink flex items-center gap-2">
                    <span>Adaptador SAARI ERP: Conector Bidireccional de Ingestión & Salidas</span>
                    <span className="px-2 py-0.5 rounded-xs bg-terra/15 text-terra font-sans text-[10px] font-bold">
                      PUENTE ERP CONTABLE & RAG AI
                    </span>
                  </h3>
                  <p className="text-xs text-ink-500 font-sans">
                    Arquitectura de sincronización: SAARI ERP mantiene el libro contable de la plaza, mientras los Agentes IA efectúan la auditoría y enriquecen la operación.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xs bg-dune-900 text-sand-100 font-sans text-[11px] font-bold">
                    SAARI BATCH READY v4.2
                  </span>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans text-xs">
                <div className="bg-sand-100 p-3 rounded-xs border border-hairline">
                  <span className="text-ink-400 text-[10px] uppercase font-semibold block">Lectura Auxiliares</span>
                  <span className="text-ink font-bold text-base mt-0.5 block font-display">85 Locales Ingestados</span>
                </div>
                <div className="bg-sand-100 p-3 rounded-xs border border-hairline">
                  <span className="text-ink-400 text-[10px] uppercase font-semibold block">Lote Batch CAM NNN</span>
                  <span className="text-terra font-bold text-base mt-0.5 block font-sans">100% Estructurado</span>
                </div>
                <div className="bg-sand-100 p-3 rounded-xs border border-hairline">
                  <span className="text-ink-400 text-[10px] uppercase font-semibold block">Discrepancias Fiscales</span>
                  <span className="text-pine font-bold text-base mt-0.5 block font-display">0 Pendientes</span>
                </div>
              </div>
            </div>

            {/* DIAGRAMA DE ARQUITECTURA DE DATOS SAARI <-> AGENTES IA */}
            <div className="bg-sand-50 border border-terra/30 rounded-sm p-5 shadow-2xs space-y-4 ring-1 ring-terra/10">
              <div className="border-b border-hairline pb-3">
                <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider">
                  Diagrama de Flujo de Datos: ¿Cómo se Conecta SAARI ERP con los Agentes IA?
                </h4>
                <p className="text-xs text-ink-500 font-sans">
                  SAARI ERP es el sistema de registro contable oficial. Los agentes IA consumen sus datos para validar y retornan lotes limpios.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4 font-sans text-xs">
                {/* Paso 1: SAARI ERP Ingestión */}
                <div className="bg-sand-100 p-4 rounded-xs border border-hairline space-y-2">
                  <div className="flex items-center justify-between text-terra font-bold">
                    <span>1. SAARI ERP (Fuente)</span>
                    <span className="text-[10px] bg-terra/15 px-2 py-0.5 rounded-xs">ENTRADA</span>
                  </div>
                  <p className="text-[11px] text-ink-700 leading-relaxed font-sans">
                    SAARI genera los auxiliares de cobranza, transferencias bancarias SPEI recibidas y expedientes de contratos comerciales firmados.
                  </p>
                  <div className="bg-sand-50 p-2.5 rounded-xs border border-hairline text-[10px] text-ink-700">
                    • Ingestión diaria `.CSV / API`<br />
                    • Depósitos bancarios del mes<br />
                    • Expedientes de inquilinos
                  </div>
                </div>

                {/* Paso 2: Motor Agentes IA */}
                <div className="bg-sand-100 p-4 rounded-xs border border-gold/40 space-y-2">
                  <div className="flex items-center justify-between text-gold font-bold">
                    <span>2. Capa Agentes IA (Control)</span>
                    <span className="text-[10px] bg-gold/15 text-gold px-2 py-0.5 rounded-xs">AUDITORÍA</span>
                  </div>
                  <p className="text-[11px] text-ink-700 leading-relaxed font-sans">
                    <strong>Mariana</strong> audita exclusividades RAG. <strong>Diego</strong> rechaza cargos no cubiertos. <strong>Renata</strong> detecta errores SAT CFDI PPD.
                  </p>
                  <div className="bg-sand-50 p-2.5 rounded-xs border border-hairline text-[10px] text-ink-700">
                    • Mariana: Bóveda RAG PDF<br />
                    • Diego: Pólizas Carrier/Cat<br />
                    • Renata: SAT CFDI 4.0 PPD
                  </div>
                </div>

                {/* Paso 3: SAARI ERP Carga Masiva */}
                <div className="bg-sand-100 p-4 rounded-xs border border-hairline space-y-2">
                  <div className="flex items-center justify-between text-terra font-bold">
                    <span>3. SAARI ERP (Exportación)</span>
                    <span className="text-[10px] bg-terra/15 px-2 py-0.5 rounded-xs">SALIDA BATCH</span>
                  </div>
                  <p className="text-[11px] text-ink-700 leading-relaxed font-sans">
                    Se devuelven a SAARI los complementos de pago SAT timbrados y el archivo batch listo para facturación NNN masiva.
                  </p>
                  <div className="bg-sand-50 p-2.5 rounded-xs border border-hairline text-[10px] text-ink-700">
                    • Lote Batch de Facturación<br />
                    • XML Complementos SAT<br />
                    • Rent Roll Actualizado al Día
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN INTERACTIVA DE INGESTIÓN / EXPORTACIÓN SAARI */}
            <div className="bg-sand-50 border border-hairline rounded-sm p-5 shadow-2xs space-y-6">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div>
                  <h4 className="font-bold text-xs font-display text-ink uppercase tracking-wider">
                    Consola Interactiva del Conector SAARI ERP
                  </h4>
                  <p className="text-xs text-ink-500 font-sans">
                    Prueba la lectura de auxiliares o la generación del lote batch para importador automático de SAARI.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-xs bg-terra/15 text-terra font-sans text-[11px] font-bold">
                  ADAPTADOR ACTIVO
                </span>
              </div>

              {/* Botones de Selección de Dirección */}
              <div className="flex gap-3 border-b border-hairline pb-3">
                <button
                  onClick={() => {
                    setSaariDirection("inbound");
                    setSaariProcessed(false);
                  }}
                  className={`px-4 py-2 rounded-xs font-bold text-xs transition-all cursor-pointer font-sans ${
                    saariDirection === "inbound"
                      ? "bg-dune-900 text-sand-100 shadow-xs border border-dune-800"
                      : "bg-sand-200/70 text-ink-700 hover:bg-sand-200"
                  }`}
                >
                  📥 ENTRADAS (Ingestión de Auxiliares de SAARI)
                </button>
                <button
                  onClick={() => {
                    setSaariDirection("outbound");
                    setSaariProcessed(false);
                  }}
                  className={`px-4 py-2 rounded-xs font-bold text-xs transition-all cursor-pointer font-sans ${
                    saariDirection === "outbound"
                      ? "bg-terra text-sand-100 shadow-xs"
                      : "bg-sand-200/70 text-ink-700 hover:bg-sand-200"
                  }`}
                >
                  SALIDAS (Exportación Lote Batch a SAARI)
                </button>
              </div>

              {/* Consola de Datos SAARI */}
              <div className="bg-sand-50 p-5 rounded-sm space-y-4 text-xs shadow-2xs border border-hairline">
                <div className="flex justify-between border-b border-hairline pb-2">
                  <span className="text-terra font-bold font-mono">
                    {saariDirection === "inbound" ? "// Lector de entradas SAARI ERP" : "// Exportador batch de salidas SAARI ERP"}
                  </span>
                  <span className="text-ink-400 text-[10px] font-sans uppercase tracking-wider">Formato: JSON / CSV nativo SAARI</span>
                </div>

                {saariDirection === "inbound" ? (
                  <div className="space-y-3 text-[11px]">
                    <p className="text-ink-700 font-sans">
                      Simulación de lectura del reporte de auxiliares de cobranza que emitiría SAARI (`SAARI_EXP_JULIO_2026.CSV`) — archivo y montos ilustrativos:
                    </p>
                    <pre className="bg-sand-100 border border-hairline p-3.5 rounded-xs text-ink-700 font-mono text-[10px] overflow-x-auto">
{`[INBOUND LECTURA SAARI OPERATIVA]
- Local A-01 (Ashley Furniture): $248,500.00 MXN -> APLICADO AL RENT ROLL
- Local B-02 (Blue Luna Café): $65,000.00 MXN -> APLICADO AL RENT ROLL
- Local B-12 (MINT Boutique): $32,000.00 MXN -> ALERTA DISCREPANCIA PUE/PPD DETECTADA POR RENATA`}
                    </pre>
                  </div>
                ) : (
                  <div className="space-y-3 text-[11px]">
                    <p className="text-ink-700 font-sans">
                      Generación de lote de facturación masiva para importador automático de SAARI ERP:
                    </p>
                    <pre className="bg-sand-100 border border-hairline p-3.5 rounded-xs text-ink-700 font-mono text-[10px] overflow-x-auto">
{`No_Contrato,ID_Local,Razon_Social,CAM_Base_MXN,Admin_15_MXN,IVA_16_MXN,Total_CFDI
"CTR-701","LOC-A01","ASHLEY FURNITURE MEXICO S.A.",51566.00,7734.90,9488.14,68789.04
"CTR-702","LOC-D01","CINEMEX PREMIUM MEXICALI S.A.",41964.00,6294.60,7721.38,55979.98`}
                    </pre>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSaariProcessed(true)}
                    className="px-4 py-2 bg-dune-900 hover:bg-dune-800 text-sand-100 font-bold text-xs rounded-xs transition-all cursor-pointer shadow-xs font-sans border border-dune-800"
                  >
                    {saariDirection === "inbound" ? "Procesar Lectura Entradas SAARI →" : "Descargar Archivo Lote Salidas SAARI →"}
                  </button>
                </div>

                {saariProcessed && (
                  <div className="bg-pine/10 text-pine p-3.5 rounded-xs border border-pine/30 text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1 font-display">
                      ✓ Operación con SAARI ERP Completada (Simulación)
                    </div>
                    <p className="text-ink-700 text-[10px] font-sans">
                      En producción, esta información se procesaría y sincronizaría con la base de datos de Plaza La Gran Vía.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
