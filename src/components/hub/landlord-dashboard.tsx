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
  equipmentModel: string;
  serialNumber: string;
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
    legalFilter: "Protección de Arrendatario Ancla",
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
    equipmentModel: "Luminaria LED Estética 240V",
    serialNumber: "DL-99482-DECO",
  },
  {
    id: "CAP-02",
    tenant: "Ashley Furniture",
    expenseType: "Falla de Compresor HVAC 15 Toneladas (Calor Mexicali)",
    amount: 145000,
    isQuestionable: false,
    verdict: "APROBADO_GARANTIA_COSTO_CERO",
    details: "GARANTÍA APLICADA ($0 COSTO PROPIETARIO): Diego verificó número de serie Carrier #CR-884920. El reemplazo está cubierto al 100% por póliza de fábrica de Carrier.",
    equipmentModel: "Carrier Commercial WeatherMaster",
    serialNumber: "CR-884920",
  },
  {
    id: "CAP-03",
    tenant: "Cinemex Premium",
    expenseType: "Mantenimiento Preventivo de Planta de Emergencia Común",
    amount: 52000,
    isQuestionable: false,
    verdict: "APROBADO_PRORRATEO_CAM",
    details: "APROBADO PARA CAM NNN: Gasto de infraestructura común prorrateable entre todos los locales en la liquidación mensual.",
    equipmentModel: "Caterpillar C15 ACERT 500kW",
    serialNumber: "CAT-500-9942",
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "ok" | "sat" | "excl">("all");

  const [selectedLeasingApp, setSelectedLeasingApp] = useState<ApplicantCase>(LEASING_APPLICANTS[0]);
  const [selectedCapex, setSelectedCapex] = useState<CapexCase>(CAPEX_CASES[0]);
  const [attorneySent, setAttorneySent] = useState(false);
  const [diegoNotificationSent, setDiegoNotificationSent] = useState(false);
  const [renataCfdiIssued, setRenataCfdiIssued] = useState(false);

  // SAARI Mode Switcher
  const [saariMode, setSaariMode] = useState<"inbound" | "outbound">("inbound");
  const [saariProcessed, setSaariProcessed] = useState(false);

  // Mariana Chat Query State
  const [marianaChatResponse, setMarianaChatResponse] = useState({
    query: "¿Cuál es la exclusividad exacta de Blue Luna Café y por qué bloqueó a Starbucks?",
    answer: "Blue Luna Café (Local B-02, Zona 4) cuenta con la Cláusula #14 en su contrato vigente (2023-2028). Otorga exclusividad comercial absoluta en la venta de café espresso y especialidad en Zona 4. La propuesta de Starbucks Reserve presentaba un 98.4% de solapamiento semántico en menú.",
    pdfName: "Contrato_Arrendamiento_BlueLuna_LocB02_Firmado.pdf",
    pdfClause: "Página 12, Cláusula 14",
  });

  // Diego Chat Query State
  const [diegoChatResponse, setDiegoChatResponse] = useState({
    query: "¿Por qué el reemplazo de compresor HVAC de Ashley Furniture no le cuesta al propietario?",
    answer: "Diego verificó el número de serie Carrier #CR-884920. La póliza de garantía del fabricante Carrier cubre fallas mecánicas de compresores de 15 toneladas durante 5 años (vigente hasta Noviembre 2028). Se tramitó la sustitución sin costo para el propietario ($0 MXN).",
    pdfName: "Poliza_Garantia_Carrier_Ashley_HVAC.pdf",
    pdfClause: "Serie #CR-884920 (Cobertura 100% Fábrica)",
  });

  // Renata Chat Query State
  const [renataChatResponse, setRenataChatResponse] = useState({
    query: "¿Por qué MINT Boutique registró una alerta fiscal SAT CFDI 4.0?",
    answer: "MINT Boutique pagó $32,000 MXN mediante transferencia registrando el método PUE (Pago en una sola exhibición), pero la factura original se emitió bajo el régimen PPD (Pago en parcialidades). Renata detectó la discrepancia antes de la declaración mensual del SAT para auto-emitir el Complemento de Recepción de Pagos sin sanción.",
    xmlName: "CFDI_4.0_Complemento_Pago_SAT_MINT.xml",
    xmlClause: "Anexo 20 RMF SAT §2.7.1.35",
  });

  const totalOccupiedSqm = TENANTS.reduce((sum, t, idx) => sum + getTenantSqm(t.name, idx), 0);
  const vacancySqm = 445;
  const plazaTotalGla = totalOccupiedSqm + vacancySqm;

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

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#202020] font-sans p-4 sm:p-8 space-y-10 max-w-[1250px] mx-auto">
      {/* ---------------- 1. VENTRILOC FLOATING PILL HEADER ---------------- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#e8e8e8]">
        <Link href="/" className="block shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/la-gran-via-logo-horizontal.png"
            alt="La Gran Vía Mexicali"
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Ventriloc Navigation Pill Container */}
        <nav className="hidden sm:flex items-center gap-2 bg-[#efefef] px-4 py-2 rounded-[200px]">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-1.5 rounded-[200px] text-xs font-normal transition-colors cursor-pointer ${
              activeTab === "overview" ? "bg-[#202020] text-white" : "text-[#202020] hover:text-[#ff682c]"
            }`}
          >
            Rent Roll ({TENANTS.length})
          </button>

          <button
            onClick={() => setActiveTab("leasing")}
            className={`px-4 py-1.5 rounded-[200px] text-xs font-normal transition-colors cursor-pointer ${
              activeTab === "leasing" ? "bg-[#202020] text-white" : "text-[#202020] hover:text-[#ff682c]"
            }`}
          >
            Arrendamiento (Mariana)
          </button>

          <button
            onClick={() => setActiveTab("maint")}
            className={`px-4 py-1.5 rounded-[200px] text-xs font-normal transition-colors cursor-pointer ${
              activeTab === "maint" ? "bg-[#202020] text-white" : "text-[#202020] hover:text-[#ff682c]"
            }`}
          >
            CapEx & Gastos (Diego)
          </button>

          <button
            onClick={() => setActiveTab("cam")}
            className={`px-4 py-1.5 rounded-[200px] text-xs font-normal transition-colors cursor-pointer ${
              activeTab === "cam" ? "bg-[#202020] text-white" : "text-[#202020] hover:text-[#ff682c]"
            }`}
          >
            CAM & Fiscal SAT (Renata)
          </button>

          <button
            onClick={() => setActiveTab("saari")}
            className={`px-4 py-1.5 rounded-[200px] text-xs font-normal transition-colors cursor-pointer ${
              activeTab === "saari" ? "bg-[#202020] text-white" : "text-[#202020] hover:text-[#ff682c]"
            }`}
          >
            SAARI ERP (Conector)
          </button>
        </nav>

        {/* Buttons Stack */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert("Exportando informe oficial en PDF...")}
            className="px-5 py-2.5 bg-transparent border border-[#202020] text-[#202020] rounded-none text-xs font-normal hover:bg-[#f5f5f5] transition-colors cursor-pointer"
          >
            Exportar Reporte (.PDF)
          </button>

          <button
            onClick={() => setActiveTab("saari")}
            className="px-5 py-2.5 bg-[#202020] text-white rounded-none text-xs font-normal hover:bg-[#333333] transition-colors cursor-pointer"
          >
            Sincronizar SAARI →
          </button>
        </div>
      </header>

      {/* ---------------- PESTAÑA 1: OVERVIEW (RENT ROLL & METRICS) ---------------- */}
      {activeTab === "overview" && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                Asset Management Observatory · 7,550 m² GLA Mexicali
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-[-0.02em] text-[#202020] font-sans leading-[0.95]">
                Accelerating Growth Through Precision Analytics.
              </h1>
              <p className="text-base text-[#4d4d4d] leading-relaxed max-w-xl font-normal">
                Consola privada de control operativo para el Sr. Martín. Monitoreo continuo del Rent Roll, prevención de conflictos de exclusividad legal y balance CAM NNN en Plaza La Gran Vía.
              </p>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-[20px] p-6 border border-[#e8e8e8] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#828282]">
                  <span className="font-normal uppercase tracking-wider text-[10px]">Cobranza Mensual</span>
                  <span className="text-[#ff682c] font-normal text-xs">● 98.2% Al Día</span>
                </div>
                <div className="text-3xl font-normal text-[#202020] tracking-[-0.02em]">
                  $3 145 000 <span className="text-xs text-[#828282]">MXN</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-[20px] p-6 border border-[#e8e8e8] space-y-2">
                  <span className="text-[10px] uppercase text-[#828282] block font-mono">Ocupación GLA</span>
                  <div className="text-2xl font-normal text-[#202020]">94.1%</div>
                </div>
                <div className="bg-white rounded-[20px] p-6 border border-[#e8e8e8] space-y-2">
                  <span className="text-[10px] uppercase text-[#828282] block font-mono">Ahorro CapEx</span>
                  <div className="text-2xl font-normal text-[#ff682c]">$78 000</div>
                </div>
              </div>
            </div>
          </div>

          <div id="rentroll" className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-12 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
              <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em]">
                Rent Roll Plaza La Gran Vía ({filteredTenants.length} Locales)
              </h2>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por inquilino..."
                  className="px-4 py-2 bg-white border border-[#e8e8e8] text-xs text-[#202020] focus:outline-none"
                />
              </div>
            </div>
            <div className="overflow-x-auto bg-white border border-[#e8e8e8] rounded-[8px]">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-[#e8e8e8] text-[#828282] uppercase text-[10px] bg-[#f5f5f5] font-mono">
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Inquilino / Local</th>
                    <th className="p-3.5">Zona</th>
                    <th className="p-3.5">Giro Comercial</th>
                    <th className="p-3.5 text-right">Superficie</th>
                    <th className="p-3.5 text-right">Pro-Rata NNN</th>
                    <th className="p-3.5 text-right">Renta MXN</th>
                    <th className="p-3.5">Estatus CFDI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] font-normal text-[#202020]">
                  {filteredTenants.map((t, idx) => (
                    <tr key={t.slug} className="hover:bg-[#f5f5f5]">
                      <td className="p-3.5 text-[#828282] font-mono">{idx + 1}</td>
                      <td className="p-3.5 font-normal">{t.name}</td>
                      <td className="p-3.5 text-[#4d4d4d]">{t.zone}</td>
                      <td className="p-3.5 text-[#4d4d4d]">{t.tag}</td>
                      <td className="p-3.5 text-right font-mono">{getTenantSqm(t.name, idx)} m²</td>
                      <td className="p-3.5 text-right font-mono">{((getTenantSqm(t.name, idx) / plazaTotalGla) * 100).toFixed(2)}%</td>
                      <td className="p-3.5 text-right font-mono">${Math.round(getTenantSqm(t.name, idx) * 240).toLocaleString()}</td>
                      <td className="p-3.5">
                        {t.name.includes("MINT") ? (
                          <span className="text-[#ff682c] border-b border-[#ff682c]">Alerta SAT PPD</span>
                        ) : (
                          <span className="text-[#4d4d4d]">Al Día CFDI 4.0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 2: MARIANA AI (FULL 5 SECTIONS) ---------------- */}
      {activeTab === "leasing" && (
        <div className="space-y-10">
          <div className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-10 space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  SOP §2A & General Counsel AI · Bóveda 85 Contratos RAG
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em] mt-1">
                  Módulo de Arrendamiento & Inteligencia Legal (Mariana)
                </h2>
              </div>
              <span className="px-4 py-2 bg-[#202020] text-white font-mono text-xs">85 CONTRATOS EN BÓVEDA RAG</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 border border-[#e8e8e8]">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">SOLICITUDES EVALUADAS</span>
                <div className="text-2xl font-normal text-[#202020]">3 Prospectos Auditados</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8]">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">EXCLUSIVIDADES ACTIVAS</span>
                <div className="text-2xl font-normal text-[#ff682c]">14 Cláusulas Protegidas</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8]">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">RIESGO LEGAL PREVENIDO</span>
                <div className="text-2xl font-normal text-[#202020]">$780,000 MXN / año</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 border border-[#e8e8e8] rounded-[20px] space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4">
              <h3 className="text-sm font-normal text-[#202020] uppercase font-mono tracking-wider">
                ASISTENTE LEGAL RAG: CONSULTA DIRECTA A MARIANA
              </h3>
              <span className="text-xs font-mono text-[#816729]">● BÓVEDA INDEXADA RAG</span>
            </div>

            <div className="bg-[#f5f5f5] p-6 border border-[#e8e8e8] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#828282]">
                <span className="font-mono text-[#202020]">Pregunta: {marianaChatResponse.query}</span>
                <span className="text-[#ff682c] font-mono">✓ Respuesta RAG Verificada</span>
              </div>
              <p className="text-sm text-[#202020] leading-relaxed">{marianaChatResponse.answer}</p>
              <div className="pt-2 flex items-center justify-between text-xs border-t border-[#e8e8e8]">
                <span className="font-mono text-[#816729]">📄 Documento Fuente: {marianaChatResponse.pdfName} ({marianaChatResponse.pdfClause})</span>
                <button onClick={() => alert(`Descargando ${marianaChatResponse.pdfName}...`)} className="text-[#202020] border-b border-[#ff682c] cursor-pointer">
                  Descargar Referencia PDF →
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
              1. EVALUADOR DE SOLICITUDES PROSPECTO VS. CONTRATOS EXISTENTES
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LEASING_APPLICANTS.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelectedLeasingApp(app)}
                  className={`p-6 bg-white border text-left cursor-pointer ${
                    selectedLeasingApp.id === app.id ? "border-[#202020]" : "border-[#e8e8e8]"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-normal text-[#202020]">{app.brand}</span>
                    <span className="text-xs font-mono text-[#ff682c]">{app.status}</span>
                  </div>
                  <p className="text-xs text-[#828282] mt-1">{app.category}</p>
                </button>
              ))}
            </div>

            <div className="bg-[#202020] text-white p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-[#4d4d4d] pb-4 font-mono text-xs">
                <span>● DICTAMEN LEGAL MARIANA AI ({selectedLeasingApp.id})</span>
                <span className="text-[#ff682c]">{selectedLeasingApp.overlapScore}</span>
              </div>
              <p className="text-xs leading-relaxed">{selectedLeasingApp.reasoning}</p>
              <div className="pt-2 flex justify-end gap-3 text-xs font-mono">
                <button onClick={() => setAttorneySent(true)} className="px-4 py-2 bg-[#ff682c] text-white cursor-pointer">
                  {attorneySent ? "✓ Notificación Enviada" : "✉️ Notificar a Abogado Patronal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 3: DIEGO AI (CAPEX) ---------------- */}
      {activeTab === "maint" && (
        <div className="space-y-10">
          <div className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-10 space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  SOP §2B & CAPEX GUARDIAN AI
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em] mt-1">
                  Auditoría de Gastos CapEx Dudosos vs. Garantías (Diego)
                </h2>
              </div>
              <span className="px-4 py-2 bg-[#202020] text-white font-mono text-xs">6 EQUIPOS CRÍTICOS MONITOREADOS</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 border border-[#e8e8e8]">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">RECLAMOS AUDITADOS</span>
                <div className="text-2xl font-normal text-[#202020]">3 Casos Auditados</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8]">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">GARANTÍAS RECOBRADAS ($0)</span>
                <div className="text-2xl font-normal text-[#2b593a]">$145,000 MXN / Evento</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8]">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">GASTO IMPROCEDENTE RECHAZADO</span>
                <div className="text-2xl font-normal text-[#ff682c]">$78,000 MXN Rechazado</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 border border-[#e8e8e8] rounded-[20px] space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4">
              <h3 className="text-sm font-normal text-[#202020] uppercase font-mono tracking-wider">
                ASISTENTE OPERATIVO AI: CONSULTA DIRECTA A DIEGO
              </h3>
              <span className="text-xs font-mono text-[#816729]">● AUDITORÍA TÉCNICA ACTIVA</span>
            </div>
            <div className="bg-[#f5f5f5] p-6 border border-[#e8e8e8] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#828282]">
                <span className="font-mono text-[#202020]">Consulta: {diegoChatResponse.query}</span>
                <span className="text-[#2b593a] font-mono">✓ Verificado en Bitácora</span>
              </div>
              <p className="text-sm text-[#202020] leading-relaxed">{diegoChatResponse.answer}</p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
              1. EVALUADOR DE SOLICITUDES CAPEX & RECLAMACIÓN DE GARANTÍAS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CAPEX_CASES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedCapex(item)}
                  className={`p-6 bg-white border text-left cursor-pointer ${
                    selectedCapex.id === item.id ? "border-[#202020]" : "border-[#e8e8e8]"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-normal text-[#202020]">{item.tenant}</span>
                    <span className="font-mono text-xs text-[#ff682c]">${item.amount.toLocaleString()} MXN</span>
                  </div>
                  <p className="text-xs text-[#828282] mt-1">{item.expenseType}</p>
                </button>
              ))}
            </div>

            <div className="bg-[#202020] text-white p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-[#4d4d4d] pb-4 font-mono text-xs">
                <span>● DICTAMEN TÉCNICO & CONTRACTUAL DIEGO AI ({selectedCapex.id})</span>
                <span className="text-[#ff682c]">🚫 RECHAZADO (RESPONSABILIDAD INQUILINO)</span>
              </div>
              <p className="text-xs leading-relaxed">{selectedCapex.details}</p>
              <div className="pt-2 flex justify-end gap-3 text-xs font-mono">
                <button onClick={() => setDiegoNotificationSent(true)} className="px-4 py-2 bg-[#ff682c] text-white cursor-pointer">
                  {diegoNotificationSent ? "✓ Notificación Enviada" : "Notificar Resolución Técnica"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 4: RENATA AI (CAM & FISCAL SAT) ---------------- */}
      {activeTab === "cam" && (
        <div className="space-y-10">
          <div className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-10 space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  SOP §2C & FISCAL GUARDIAN AI
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em] mt-1">
                  Prorrateo CAM NNN & Auditoría Fiscal SAT CFDI 4.0 (Renata)
                </h2>
              </div>
              <span className="px-4 py-2 bg-[#202020] text-white font-mono text-xs">85 LOCALES BALANCED 1.0000</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 border border-[#e8e8e8]">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">VALIDACIÓN FISCAL SAT</span>
                <div className="text-2xl font-normal text-[#202020]">84 / 85 CFDIs Validados</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8]">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">INVARIANTE PRORRATEO CAM</span>
                <div className="text-2xl font-normal text-[#2b593a]">1.0000 Balance Exacto</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8]">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">MULTA SAT PREVENIDA</span>
                <div className="text-2xl font-normal text-[#ff682c]">$12,500 MXN Sanción $0</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 border border-[#e8e8e8] rounded-[20px] space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4">
              <h3 className="text-sm font-normal text-[#202020] uppercase font-mono tracking-wider">
                ASISTENTE FISCAL AI: CONSULTA DIRECTA A RENATA
              </h3>
              <span className="text-xs font-mono text-[#816729]">● VALIDADOR SAT CFDI 4.0 ACTIVO</span>
            </div>
            <div className="bg-[#f5f5f5] p-6 border border-[#e8e8e8] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#828282]">
                <span className="font-mono text-[#202020]">Consulta: {renataChatResponse.query}</span>
                <span className="text-[#2b593a] font-mono">✓ Validación SAT Anexo 20</span>
              </div>
              <p className="text-sm text-[#202020] leading-relaxed">{renataChatResponse.answer}</p>
            </div>
          </div>

          <div className="bg-[#f5e9e8] p-8 border border-[#e8d2d1] space-y-6">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-[#7a2e2b] font-bold">🚨 ⚠️ ALERTA FISCAL SAT CFDI 4.0: MINT BOUTIQUE (LOCAL B-14)</span>
              <span className="bg-[#7a2e2b] text-white px-3 py-1 text-[11px]">RIESGO MULTA: $12,500 MXN PREVENIDO</span>
            </div>
            <button
              onClick={() => setRenataCfdiIssued(true)}
              className="px-6 py-3 bg-[#7a2e2b] text-white font-bold text-xs cursor-pointer"
            >
              ⚡ {renataCfdiIssued ? "✓ Complemento SAT CFDI 4.0 Emitido" : "Auto-Emitir Complemento SAT CFDI 4.0"}
            </button>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 5: CONECTOR SAARI ERP (SCREENSHOT MATCH) ---------------- */}
      {activeTab === "saari" && (
        <div className="space-y-10">
          <div className="bg-[#efefef] rounded-tl-[6px] rounded-tr-none rounded-br-none rounded-bl-none p-8 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  Adaptador SAARI ERP: Conector Bidireccional de Ingestión & Salidas
                </span>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#202020] tracking-[-0.02em] mt-1">
                  Conector SAARI ERP: Ingestión de Auxiliares & Salidas Batch
                </h2>
                <p className="text-xs text-[#4d4d4d] mt-1">
                  Arquitectura de sincronización: SAARI ERP mantiene el libro contable de la plaza, mientras los Agentes IA efectúan la auditoría y enriquecen la operación.
                </p>
              </div>
              <span className="px-4 py-2 bg-[#202020] text-white font-mono text-xs">
                SAARI BATCH READY v4.2
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#828282] block">LECTURA AUXILIARES</span>
                <div className="text-2xl font-normal text-[#202020]">85 Locales Ingestados</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#828282] block">LOTE BATCH CAM NNN</span>
                <div className="text-2xl font-normal text-[#ff682c]">100% Estructurado</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] uppercase font-mono text-[#828282] block">DISCREPANCIAS FISCALES</span>
                <div className="text-2xl font-normal text-[#202020]">0 Pendientes</div>
              </div>
            </div>
          </div>

          <div className="bg-[#efefef] p-8 border border-[#e8e8e8] space-y-6">
            <div className="border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                📐 DIAGRAMA DE FLUJO DE DATOS: ¿CÓMO SE CONECTA SAARI ERP CON LOS AGENTES IA?
              </h3>
              <p className="text-xs text-[#4d4d4d] mt-1">
                SAARI ERP es el sistema de registro contable oficial. Los agentes IA consumen sus datos para validar y retornan lotes limpios.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#202020]">1. SAARI ERP (Fuente)</span>
                  <span className="px-2 py-0.5 bg-[#ebe6dd] text-[#816729] text-[10px]">ENTRADA</span>
                </div>
                <p className="text-xs text-[#4d4d4d] leading-relaxed">
                  SAARI genera los auxiliares de cobranza, transferencias bancarias SPEI recibidas y expedientes de contratos comerciales firmados.
                </p>
                <div className="bg-[#f5f5f5] p-3 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Ingestión diaria &apos;.CSV / API&apos;</p>
                  <p>• Depósitos bancarios del mes</p>
                  <p>• Expedientes de inquilinos</p>
                </div>
              </div>

              <div className="bg-[#202020] text-white p-6 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white">2. Capa Agentes IA (Control)</span>
                  <span className="px-2 py-0.5 bg-[#4d4d4d] text-white text-[10px]">AUDITORÍA</span>
                </div>
                <p className="text-xs text-[#828282] leading-relaxed">
                  <strong className="text-white">Mariana</strong> audita exclusividades RAG. <strong className="text-white">Diego</strong> rechaza cargos no cubiertos. <strong className="text-white">Renata</strong> detecta errores SAT CFDI PPD.
                </p>
                <div className="bg-[#2d2a26] p-3 border border-[#4d4d4d] text-xs font-mono text-[#ff682c] space-y-1">
                  <p>• Mariana: Bóveda RAG PDF</p>
                  <p>• Diego: Pólizas Carrier/Cat</p>
                  <p>• Renata: SAT CFDI 4.0 PPD</p>
                </div>
              </div>

              <div className="bg-white p-6 border border-[#e8e8e8] space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#202020]">3. SAARI ERP (Exportación)</span>
                  <span className="px-2 py-0.5 bg-[#ebe6dd] text-[#816729] text-[10px]">SALIDA BATCH</span>
                </div>
                <p className="text-xs text-[#4d4d4d] leading-relaxed">
                  Se devuelven a SAARI los complementos de pago SAT timbrados y el archivo batch listo para facturación NNN masiva.
                </p>
                <div className="bg-[#f5f5f5] p-3 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Lote Batch de Facturación</p>
                  <p>• XML Complementos SAT</p>
                  <p>• Rent Roll Actualizado al Día</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 border border-[#e8e8e8] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e8e8e8] pb-4">
              <div>
                <h3 className="text-base font-normal text-[#202020]">
                  CONSOLA INTERACTIVA DEL CONECTOR SAARI ERP
                </h3>
                <p className="text-xs text-[#828282]">
                  Prueba la lectura de auxiliares o la generación del lote batch para importador automático de SAARI.
                </p>
              </div>
              <span className="px-3 py-1 bg-[#efefef] text-[#202020] text-xs font-mono">
                ADAPTADOR ACTIVO
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSaariMode("inbound")}
                className={`px-5 py-2.5 rounded-none text-xs font-normal cursor-pointer transition-colors ${
                  saariMode === "inbound" ? "bg-[#ff682c] text-white" : "bg-[#efefef] text-[#202020]"
                }`}
              >
                📥 ENTRADAS (Ingestión de Auxiliares de SAARI)
              </button>
              <button
                onClick={() => setSaariMode("outbound")}
                className={`px-5 py-2.5 rounded-none text-xs font-normal cursor-pointer transition-colors ${
                  saariMode === "outbound" ? "bg-[#ff682c] text-white" : "bg-[#efefef] text-[#202020]"
                }`}
              >
                📤 SALIDAS (Exportación Lote Batch a SAARI)
              </button>
            </div>

            <div className="bg-[#202020] text-white p-6 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#4d4d4d] pb-3">
                <span className="text-[#ff682c]">
                  {saariMode === "inbound" ? "// LECTOR DE ENTRADAS SAARI ERP" : "// GENERADOR DE LOTE BATCH B2B SAARI ERP"}
                </span>
                <span className="text-[#828282] text-[10px]">FORMATO: JSON / CSV NATIVO SAARI</span>
              </div>

              <p className="text-[#828282]">
                {saariMode === "inbound"
                  ? "Lectura en tiempo real del reporte de auxiliares de cobranza emitido por SAARI (&apos;SAARI_EXP_JULIO_2026.CSV&apos;):"
                  : "Generando estructura de archivo batch para importación masiva en SAARI ERP:"}
              </p>

              <div className="bg-[#121212] p-5 border border-[#4d4d4d] text-xs leading-relaxed font-mono">
                {saariMode === "inbound" ? (
                  <div className="space-y-1 text-[#4ade80]">
                    <p>[INBOUND LECTURA SAARI OPERATIVA]</p>
                    <p>- Local A-01 (Ashley Furniture): $248,500.00 MXN -&gt; APLICADO AL RENT ROLL</p>
                    <p>- Local B-02 (Blue Luna Café): $65,000.00 MXN -&gt; APLICADO AL RENT ROLL</p>
                    <p className="text-[#ff682c]">- Local B-12 (MINT Boutique): $32,000.00 MXN -&gt; ALERTA DISCREPANCIA PUE/PPD DETECTADA POR RENATA</p>
                  </div>
                ) : (
                  <div className="space-y-1 text-[#38bdf8]">
                    <p>[OUTBOUND BATCH SAARI ERP v4.2]</p>
                    <p>&#123; &quot;batch_id&quot;: &quot;SAARI-EXP-202607-001&quot;, &quot;total_tenants&quot;: 85, &quot;nnn_balance&quot;: &quot;1.0000&quot;, &quot;cfdi_xml_attached&quot;: 85 &#125;</p>
                    <p>- Archivo &apos;SAARI_BATCH_JULIO_2026.TXT&apos; listo para importar en SAARI ERP.</p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSaariProcessed(true)}
                  className="px-6 py-3 bg-[#ff682c] text-white rounded-none text-xs font-normal hover:bg-[#e0561e] cursor-pointer"
                >
                  {saariProcessed ? "✓ Operación SAARI ERP Completada con Éxito" : saariMode === "inbound" ? "Procesar Lectura Entradas SAARI →" : "Generar y Exportar Lote Batch SAARI →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
