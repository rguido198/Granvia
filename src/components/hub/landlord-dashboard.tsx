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
    expenseType: "Falla de Compresor HVAC 15 Toneladas (Calor 44°C Mexicali)",
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

function getTenantRent(sqm: number, name: string): number {
  if (name.includes("Ashley")) return 348000;
  if (name.includes("Cinemex")) return 283200;
  if (name.includes("Buffalo")) return 156000;
  if (name.includes("260 Grill")) return 76800;
  if (name.includes("Alma Verde")) return 52800;
  if (name.includes("AmoreMe")) return 18240;
  if (name.includes("ARA Transportes")) return 17760;
  if (name.includes("Ary Casa")) return 17280;
  if (name.includes("Asian Wok")) return 16320;
  if (name.includes("AT&T")) return 15840;
  if (name.includes("AXA")) return 15360;
  if (name.includes("Baja Brunch")) return 14880;
  if (name.includes("Banorte")) return 50400;
  if (name.includes("Banregio")) return 50400;
  if (name.includes("Be a Lash")) return 13440;
  if (name.includes("Best Optical")) return 12960;
  if (name.includes("Blue Luna")) return 43200;
  if (name.includes("Bodega 8")) return 76800;
  if (name.includes("Bonaprime")) return 18720;
  if (name.includes("Cabanna")) return 76800;
  return Math.round(sqm * 240);
}

export function LandlordDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedLeasingApp, setSelectedLeasingApp] = useState<ApplicantCase>(LEASING_APPLICANTS[0]);
  const [selectedCapex, setSelectedCapex] = useState<CapexCase>(CAPEX_CASES[0]);
  const [attorneySent, setAttorneySent] = useState(false);
  const [diegoNotificationSent, setDiegoNotificationSent] = useState(false);
  const [renataCfdiIssued, setRenataCfdiIssued] = useState(false);

  // SAARI Mode Switcher
  const [saariMode, setSaariMode] = useState<"inbound" | "outbound">("inbound");
  const [saariProcessed, setSaariProcessed] = useState(false);

  // Mariana Chat Query State
  const [marianaQuery, setMarianaQuery] = useState("");
  const [marianaChatResponse, setMarianaChatResponse] = useState({
    query: "¿Cuál es la exclusividad exacta de Blue Luna Café y por qué bloqueó a Starbucks?",
    answer: "Blue Luna Café (Local B-02, Zona 4) cuenta con la Cláusula #14 en su contrato vigente (2023-2028). Otorga exclusividad comercial absoluta en la venta de café espresso y especialidad en Zona 4. La propuesta de Starbucks Reserve presentaba un 98.4% de solapamiento semántico en menú.",
    pdfName: "Contrato_Arrendamiento_BlueLuna_LocB02_Firmado.pdf",
    pdfClause: "Página 12, Cláusula 14",
  });

  // Diego Chat Query State
  const [diegoQuery, setDiegoQuery] = useState("");
  const [diegoChatResponse, setDiegoChatResponse] = useState({
    query: "¿Por qué el reemplazo de compresor HVAC de Ashley Furniture no le cuesta al propietario?",
    answer: "Diego verificó el número de serie Carrier #CR-884920. La póliza de garantía del fabricante Carrier cubre fallas mecánicas de compresores de 15 toneladas durante 5 años (vigente hasta Noviembre 2028). Se tramitó la sustitución sin costo para el propietario ($0 MXN).",
    pdfName: "Poliza_Garantia_Carrier_Ashley_HVAC.pdf",
    pdfClause: "Serie #CR-884920 (Cobertura 100% Fábrica)",
  });

  // Renata Chat Query State
  const [renataQuery, setRenataQuery] = useState("");
  const [renataChatResponse, setRenataChatResponse] = useState({
    query: "¿Por qué MINT Boutique registró una alerta fiscal SAT CFDI 4.0?",
    answer: "MINT Boutique pagó $32,000 MXN mediante transferencia registrando el método PUE (Pago en una sola exhibición), pero la factura original se emitió bajo el régimen PPD (Pago en parcialidades). Renata detectó la discrepancia antes de la declaración mensual del SAT para auto-emitir el Complemento de Recepción de Pagos sin sanción.",
    xmlName: "CFDI_4.0_Complemento_Pago_SAT_MINT.xml",
    xmlClause: "Anexo 20 RMF SAT §2.7.1.35",
  });

  const plazaTotalGla = 12745;

  const filteredTenants = TENANTS.filter((t) => {
    return (
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tag.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
            Resumen Rent Roll ({TENANTS.length})
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

      {/* ---------------- PESTAÑA 1: RESUMEN RENT ROLL ---------------- */}
      {activeTab === "overview" && (
        <div className="space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-4">
            <div>
              <span className="px-3 py-1 bg-[#eaf2ec] text-[#2b593a] font-mono text-[11px] font-bold uppercase tracking-wider inline-block">
                🟢 OPERACIÓN AL DÍA | La Gran Vía Mexicali
              </span>
              <h1 className="text-3xl sm:text-4xl font-normal text-[#202020] tracking-[-0.02em] mt-2">
                Resumen Consolidado del Rent Roll (84 Locales Activos)
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => alert("Exportando informe en PDF...")} className="px-4 py-2 bg-white border border-[#202020] text-[#202020] text-xs">
                Exportar Reporte (.PDF)
              </button>
              <button onClick={() => setActiveTab("saari")} className="px-4 py-2 bg-[#ff682c] text-white text-xs">
                Sincronizar SAARI →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-3">
              <span className="text-[10px] font-mono text-[#828282] uppercase tracking-wider block">COBRANZA MENSUAL RENTA</span>
              <div className="text-3xl font-normal text-[#202020] tracking-[-0.02em]">$3,145,000 MXN</div>
              <span className="inline-block px-2.5 py-1 bg-[#eaf2ec] text-[#2b593a] text-[11px] font-mono">✓ 98.2% Al Día (Julio 2026)</span>
            </div>

            <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-3">
              <span className="text-[10px] font-mono text-[#828282] uppercase tracking-wider block">SUPERFICIE RENTABLE (GLA)</span>
              <div className="text-3xl font-normal text-[#202020] tracking-[-0.02em]">94.1% Ocupado</div>
              <span className="inline-block px-2.5 py-1 bg-[#eaf2ec] text-[#2b593a] text-[11px] font-mono">12,300 m² Rentados (445 m² Vacantes)</span>
            </div>

            <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-3">
              <span className="text-[10px] font-mono text-[#828282] uppercase tracking-wider block">INVARIANTE PRORRATEO CAM</span>
              <div className="text-3xl font-normal text-[#816729] tracking-[-0.02em]">1.0000 Balance</div>
              <span className="inline-block px-2.5 py-1 bg-[#f4efe6] text-[#816729] text-[11px] font-mono">Sumatoria Exacta NNN</span>
            </div>

            <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-3">
              <span className="text-[10px] font-mono text-[#828282] uppercase tracking-wider block">GASTO DUDOSO RECHAZADO</span>
              <div className="text-3xl font-normal text-[#202020] tracking-[-0.02em]">$78,000 MXN</div>
              <span className="inline-block px-2.5 py-1 bg-[#eaf2ec] text-[#2b593a] text-[11px] font-mono">Ahorro Directo Propietario</span>
            </div>
          </div>

          <div className="bg-[#efefef] rounded-tl-[6px] p-8 sm:p-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-normal text-[#202020]">
                  Rent Roll Matriz Consolidada (84 Locales Activos + Vacancia)
                </h2>
              </div>
            </div>

            <div className="overflow-x-auto bg-white border border-[#e8e8e8] rounded-[8px]">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-[#e8e8e8] text-[#828282] uppercase text-[10px] bg-[#f5f5f5] font-mono">
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">LOCAL / INQUILINO</th>
                    <th className="p-3.5">ZONA</th>
                    <th className="p-3.5">GIRO / CATEGORÍA</th>
                    <th className="p-3.5 text-right">SUPERFICIE M²</th>
                    <th className="p-3.5 text-right">PARTICIPACIÓN PRO-RATA</th>
                    <th className="p-3.5 text-right">RENTA EST. MXN</th>
                    <th className="p-3.5">ESTATUS COBRANZA & FISCAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] font-normal text-[#202020]">
                  {filteredTenants.slice(0, 10).map((t, idx) => (
                    <tr key={t.slug} className="hover:bg-[#f5f5f5]">
                      <td className="p-3.5 text-[#828282] font-mono">{idx + 1}</td>
                      <td className="p-3.5 font-bold">{t.name}</td>
                      <td className="p-3.5 text-[#4d4d4d]">{t.zone}</td>
                      <td className="p-3.5 text-[#4d4d4d]">{t.tag}</td>
                      <td className="p-3.5 text-right font-mono">{getTenantSqm(t.name, idx)} m²</td>
                      <td className="p-3.5 text-right font-mono text-[#ff682c] font-bold">{((getTenantSqm(t.name, idx) / plazaTotalGla) * 100).toFixed(2)}%</td>
                      <td className="p-3.5 text-right font-mono font-bold">${getTenantRent(getTenantSqm(t.name, idx), t.name).toLocaleString()}</td>
                      <td className="p-3.5"><span className="bg-[#eaf2ec] text-[#2b593a] px-2.5 py-1 text-[11px] font-mono">✓ Al Día (CFDI Emitido)</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 2: MARIANA AI ---------------- */}
      {activeTab === "leasing" && (
        <div className="space-y-10">
          <div className="bg-[#efefef] rounded-tl-[6px] p-8 sm:p-10 space-y-6">
            <h2 className="text-2xl sm:text-3xl font-normal text-[#202020]">Módulo de Arrendamiento & Inteligencia Legal (Mariana)</h2>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 3: DIEGO AI ---------------- */}
      {activeTab === "maint" && (
        <div className="space-y-10">
          <div className="bg-[#efefef] rounded-tl-[6px] p-8 sm:p-10 space-y-6">
            <h2 className="text-2xl sm:text-3xl font-normal text-[#202020]">Auditoría de Gastos CapEx Dudosos vs. Garantías (Diego)</h2>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 4: RENATA AI (SCREENSHOT MATCH) ---------------- */}
      {activeTab === "cam" && (
        <div className="space-y-10">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-4">
            <div>
              <span className="px-3 py-1 bg-[#eaf2ec] text-[#2b593a] font-mono text-[11px] font-bold uppercase tracking-wider inline-block">
                🟢 OPERACIÓN AL DÍA | La Gran Vía Mexicali
              </span>
              <h1 className="text-3xl sm:text-4xl font-normal text-[#202020] tracking-[-0.02em] mt-2">
                Prorrateo CAM NNN & Auditoría Fiscal SAT CFDI 4.0 (Renata)
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => alert("Exportando informe en PDF...")} className="px-4 py-2 bg-white border border-[#202020] text-[#202020] text-xs">
                Exportar Reporte (.PDF)
              </button>
              <button onClick={() => setActiveTab("saari")} className="px-4 py-2 bg-[#ff682c] text-white text-xs">
                Sincronizar SAARI →
              </button>
            </div>
          </div>

          {/* 3 Metric Cards Strip */}
          <div className="bg-[#efefef] rounded-tl-[6px] p-8 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  Prorrateo NNN & Auditoría Fiscal SAT CFDI 4.0 (Renata) <span className="bg-[#ebe6dd] px-2 py-0.5 text-[#816729]">SOP §2C & FISCAL GUARDIAN AI</span>
                </span>
                <p className="text-xs text-[#4d4d4d] mt-1">
                  Auditoría en tiempo real de timbrado CFDI 4.0, complementos de pago PPD/PUE y balance matemático invariante del prorrateo CAM.
                </p>
              </div>
              <span className="px-4 py-2 bg-[#202020] text-white font-mono text-xs">85 LOCALES BALANCED 1.0000</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">VALIDACIÓN FISCAL SAT</span>
                <div className="text-2xl font-normal text-[#202020]">84 / 85 CFDIs Validados</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">INVARIANTE PRORRATEO CAM</span>
                <div className="text-2xl font-normal text-[#2b593a]">1.0000 Balance Exacto</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">MULTA SAT PREVENIDA</span>
                <div className="text-2xl font-normal text-[#ff682c]">$12,500 MXN Sanción $0</div>
              </div>
            </div>
          </div>

          {/* Interactive RAG AI Chat Assistant Console */}
          <div className="bg-white p-8 border border-[#e8e8e8] rounded-[20px] space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-[#202020] text-white flex items-center justify-center text-xs font-mono font-bold">R</div>
                <div>
                  <h3 className="text-sm font-normal text-[#202020] uppercase font-mono tracking-wider">
                    ASISTENTE FISCAL AI: CONSULTA DIRECTA A RENATA
                  </h3>
                  <p className="text-xs text-[#828282]">
                    Haz preguntas sobre timbrado SAT CFDI 4.0, complementos de pago PPD vs PUE o la fórmula de prorrateo NNN.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-[#efefef] text-[#816729] text-xs font-mono">● VALIDADOR SAT CFDI 4.0 ACTIVO</span>
            </div>

            {/* 3 Preset Query Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setRenataQuery("Alerta MINT Boutique (PPD vs PUE)");
                  setRenataChatResponse({
                    query: "¿Por qué MINT Boutique registró una alerta fiscal SAT CFDI 4.0?",
                    answer: "MINT Boutique pagó $32,000 MXN mediante transferencia registrando el método PUE (Pago en una sola exhibición), pero la factura original se emitió bajo el régimen PPD (Pago en parcialidades). Renata detectó la discrepancia antes de la declaración mensual del SAT para auto-emitir el Complemento de Recepción de Pagos sin sanción.",
                    xmlName: "CFDI_4.0_Complemento_Pago_SAT_MINT.xml",
                    xmlClause: "Anexo 20 RMF SAT §2.7.1.35",
                  });
                }}
                className="px-4 py-2 bg-[#efefef] hover:bg-[#ebe6dd] text-[#202020] text-xs rounded-[200px] transition-colors cursor-pointer font-sans"
              >
                ⚠️ Alerta MINT Boutique (PPD vs PUE)
              </button>

              <button
                onClick={() => {
                  setRenataQuery("Invariante Matemática Prorrateo CAM 1.0000");
                  setRenataChatResponse({
                    query: "¿Cómo funciona la Invariante Matemática del Prorrateo CAM 1.0000?",
                    answer: "La cuota CAM de cada inquilino se calcula dividiendo su superficie arrendada individual entre los 7,550 m² GLA de la plaza. La sumatoria de participaciones pro-rata es exactamente 1.0000 (100.00%), sin fugas ni errores de redondeo.",
                    xmlName: "Matriz_Prorrateo_NNN_GranVia.xml",
                    xmlClause: "Invariante 1.0000 Cuadrada",
                  });
                }}
                className="px-4 py-2 bg-[#efefef] hover:bg-[#ebe6dd] text-[#202020] text-xs rounded-[200px] transition-colors cursor-pointer font-sans"
              >
                📐 Invariante Matemática Prorrateo CAM 1.0000
              </button>

              <button
                onClick={() => {
                  setRenataQuery("Requisitos CFDI 4.0 para Deducción NNN");
                  setRenataChatResponse({
                    query: "¿Cuáles son los requisitos CFDI 4.0 obligatorios para deducir gastos NNN?",
                    answer: "Conforme al Anexo 20 RMF SAT, se requiere RFC receptor válido, Régimen Fiscal 601, Código Postal del domicilio fiscal del inquilino y la clave de producto/servicio SAT 80131502 (Arrendamiento de centros comerciales).",
                    xmlName: "Guia_Timbrado_SAT_CFDI40.xml",
                    xmlClause: "Anexo 20 SAT §4.0",
                  });
                }}
                className="px-4 py-2 bg-[#efefef] hover:bg-[#ebe6dd] text-[#202020] text-xs rounded-[200px] transition-colors cursor-pointer font-sans"
              >
                📜 Requisitos CFDI 4.0 para Deducción NNN
              </button>
            </div>

            {/* Answer Display Card */}
            <div className="bg-[#f5f5f5] p-6 border border-[#e8e8e8] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#828282]">
                <span className="font-mono text-[#202020] font-bold">Consulta Fiscal: {renataChatResponse.query}</span>
                <span className="text-[#2b593a] font-mono">✓ Validación SAT Anexo 20</span>
              </div>
              <p className="text-sm text-[#202020] leading-relaxed">{renataChatResponse.answer}</p>
              <div className="pt-2 flex items-center justify-between text-xs border-t border-[#e8e8e8]">
                <span className="font-mono text-[#816729]">📄 Esquema XML / Póliza SAT: {renataChatResponse.xmlName} ({renataChatResponse.xmlClause})</span>
                <button onClick={() => alert(`Descargando ${renataChatResponse.xmlName}...`)} className="text-[#202020] border-b border-[#ff682c] cursor-pointer">
                  Descargar XML SAT →
                </button>
              </div>
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={renataQuery}
                onChange={(e) => setRenataQuery(e.target.value)}
                placeholder="Pregunta a Renata sobre el timbrado SAT, complementos PPD/PUE o prorrateo NNN..."
                className="flex-1 px-4 py-3 bg-[#f5f5f5] border border-[#e8e8e8] text-xs text-[#202020] focus:outline-none"
              />
              <button
                onClick={() => alert("Consultando Validador SAT Renata...")}
                className="px-6 py-3 bg-[#202020] text-white text-xs font-normal cursor-pointer hover:bg-[#333333]"
              >
                Consultar AI →
              </button>
            </div>
          </div>

          {/* Section 1: AUDITORÍA DE ERRORES FISCALES SAT CFDI 4.0 & COMPLEMENTOS PPD (Screenshot Match) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                1. AUDITORÍA DE ERRORES FISCALES SAT CFDI 4.0 & COMPLEMENTOS PPD
              </h3>
              <span className="text-xs text-[#828282] font-mono">MONITOREO AUTOMÁTICO PRE-DECLARACIÓN</span>
            </div>

            {/* Red Alert Box (Screenshot Match) */}
            <div className="bg-[#f5e9e8] p-8 border border-[#e8d2d1] space-y-6">
              <div className="flex items-center justify-between border-b border-[#e8d2d1] pb-4 font-mono text-xs">
                <span className="text-[#7a2e2b] font-bold">🚨 ⚠️ ALERTA FISCAL SAT CFDI 4.0: MINT BOUTIQUE (LOCAL B-12)</span>
                <span className="bg-[#7a2e2b] text-white px-3 py-1 font-bold text-[11px]">RIESGO MULTA: $12,500 MXN PREVENIDO</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-white p-4 space-y-1 border border-[#e8d2d1]">
                  <span className="text-[#828282] block text-[10px]">Factura Original Emitida:</span>
                  <span className="text-sm font-bold text-[#202020]">Folio #CFDI-8842 (Método PPD)</span>
                </div>
                <div className="bg-white p-4 space-y-1 border border-[#e8d2d1]">
                  <span className="text-[#828282] block text-[10px]">Pago Recibido en Banco:</span>
                  <span className="text-sm font-bold text-[#2b593a]">$32,000 MXN (Registrado PUE)</span>
                </div>
                <div className="bg-white p-4 space-y-1 border border-[#e8d2d1]">
                  <span className="text-[#828282] block text-[10px]">Discrepancia SAT:</span>
                  <span className="text-sm font-bold text-[#7a2e2b]">Falta Complemento de Pago</span>
                </div>
              </div>

              <p className="text-xs text-[#7a2e2b] leading-relaxed">
                Renata detectó que la transferencia bancaria fue registrada erróneamente por el cliente como PUE (Pago en una sola exhibición). Conforme al Reglamento de la Cédula Fiscal SAT CFDI 4.0, se requiere auto-emitir el Complemento de Recepción de Pagos oficial antes del cierre del mes para evitar auditorías al propietario.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#e8d2d1] text-xs font-mono">
                <span className="text-[#7a2e2b]">Estado: Esperando confirmación para timbrado directo ante el PAC SAT</span>
                <button
                  onClick={() => setRenataCfdiIssued(true)}
                  className="px-6 py-3 bg-[#7a2e2b] text-white rounded-none font-bold text-xs cursor-pointer hover:bg-[#962826]"
                >
                  ⚡ {renataCfdiIssued ? "✓ Complemento SAT CFDI 4.0 Emitido" : "Auto-Emitir Complemento SAT CFDI 4.0"}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: MATRIZ DE PRORRATEO NNN & LIQUIDACIÓN CAM POR INQUILINO (85 LOCALES) (Screenshot Match) */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3">
              <div>
                <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                  2. MATRIZ DE PRORRATEO NNN & LIQUIDACIÓN CAM POR INQUILINO (85 LOCALES)
                </h3>
                <p className="text-xs text-[#4d4d4d] mt-0.5">Cálculo automatizado de participación pro-rata, cuota base, honorarios de administración e IVA.</p>
              </div>
              <span className="px-3 py-1 bg-[#202020] text-white text-xs font-mono">
                INVARIANTE 1.0000 CUADRADA
              </span>
            </div>

            <div className="overflow-x-auto bg-white border border-[#e8e8e8] rounded-[8px]">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-[#e8e8e8] text-[#828282] uppercase text-[10px] bg-[#f5f5f5] font-mono">
                    <th className="p-3.5 font-normal">INQUILINO / LOCAL</th>
                    <th className="p-3.5 font-normal text-right">SUPERFICIE M²</th>
                    <th className="p-3.5 font-normal text-right">% PRO-RATA NNN</th>
                    <th className="p-3.5 font-normal text-right">CUOTA CAM BASE</th>
                    <th className="p-3.5 font-normal text-right">ADMIN (15%)</th>
                    <th className="p-3.5 font-normal text-right">IVA (16%)</th>
                    <th className="p-3.5 font-normal text-right">TOTAL CFDI MXN</th>
                    <th className="p-3.5 font-normal text-right">ESTADO SAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] font-normal text-[#202020] font-mono text-[11px]">
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold font-sans">260 Grill & Bar</td>
                    <td className="p-3.5 text-right font-bold">320 m²</td>
                    <td className="p-3.5 text-right text-[#ff682c] font-bold">2.51%</td>
                    <td className="p-3.5 text-right">$11,360</td>
                    <td className="p-3.5 text-right">$1,704</td>
                    <td className="p-3.5 text-right">$2,090</td>
                    <td className="p-3.5 text-right font-bold">$15,154</td>
                    <td className="p-3.5 text-right"><span className="bg-[#eaf2ec] text-[#2b593a] px-2 py-0.5">✓ Timbrado SAT CFDI 4.0</span></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold font-sans">Alma Verde</td>
                    <td className="p-3.5 text-right font-bold">220 m²</td>
                    <td className="p-3.5 text-right text-[#ff682c] font-bold">1.73%</td>
                    <td className="p-3.5 text-right">$7,810</td>
                    <td className="p-3.5 text-right">$1,172</td>
                    <td className="p-3.5 text-right">$1,437</td>
                    <td className="p-3.5 text-right font-bold">$10,419</td>
                    <td className="p-3.5 text-right"><span className="bg-[#eaf2ec] text-[#2b593a] px-2 py-0.5">✓ Timbrado SAT CFDI 4.0</span></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold font-sans">AmoreMe</td>
                    <td className="p-3.5 text-right font-bold">76 m²</td>
                    <td className="p-3.5 text-right text-[#ff682c] font-bold">0.60%</td>
                    <td className="p-3.5 text-right">$2,698</td>
                    <td className="p-3.5 text-right">$405</td>
                    <td className="p-3.5 text-right">$496</td>
                    <td className="p-3.5 text-right font-bold">$3,599</td>
                    <td className="p-3.5 text-right"><span className="bg-[#eaf2ec] text-[#2b593a] px-2 py-0.5">✓ Timbrado SAT CFDI 4.0</span></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold font-sans">ARA Transportes</td>
                    <td className="p-3.5 text-right font-bold">74 m²</td>
                    <td className="p-3.5 text-right text-[#ff682c] font-bold">0.58%</td>
                    <td className="p-3.5 text-right">$2,627</td>
                    <td className="p-3.5 text-right">$394</td>
                    <td className="p-3.5 text-right">$483</td>
                    <td className="p-3.5 text-right font-bold">$3,504</td>
                    <td className="p-3.5 text-right"><span className="bg-[#eaf2ec] text-[#2b593a] px-2 py-0.5">✓ Timbrado SAT CFDI 4.0</span></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold font-sans">Ary Casa de Novias</td>
                    <td className="p-3.5 text-right font-bold">72 m²</td>
                    <td className="p-3.5 text-right text-[#ff682c] font-bold">0.56%</td>
                    <td className="p-3.5 text-right">$2,556</td>
                    <td className="p-3.5 text-right">$383</td>
                    <td className="p-3.5 text-right">$470</td>
                    <td className="p-3.5 text-right font-bold">$3,409</td>
                    <td className="p-3.5 text-right"><span className="bg-[#eaf2ec] text-[#2b593a] px-2 py-0.5">✓ Timbrado SAT CFDI 4.0</span></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold font-sans">Ashley</td>
                    <td className="p-3.5 text-right font-bold">1450 m²</td>
                    <td className="p-3.5 text-right text-[#ff682c] font-bold">11.38%</td>
                    <td className="p-3.5 text-right">$51,475</td>
                    <td className="p-3.5 text-right">$7,721</td>
                    <td className="p-3.5 text-right">$9,471</td>
                    <td className="p-3.5 text-right font-bold">$68,667</td>
                    <td className="p-3.5 text-right"><span className="bg-[#eaf2ec] text-[#2b593a] px-2 py-0.5">✓ Timbrado SAT CFDI 4.0</span></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold font-sans">Asian Wok Box</td>
                    <td className="p-3.5 text-right font-bold">68 m²</td>
                    <td className="p-3.5 text-right text-[#ff682c] font-bold">0.53%</td>
                    <td className="p-3.5 text-right">$2,414</td>
                    <td className="p-3.5 text-right">$362</td>
                    <td className="p-3.5 text-right">$444</td>
                    <td className="p-3.5 text-right font-bold">$3,220</td>
                    <td className="p-3.5 text-right"><span className="bg-[#eaf2ec] text-[#2b593a] px-2 py-0.5">✓ Timbrado SAT CFDI 4.0</span></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold font-sans">AT&T</td>
                    <td className="p-3.5 text-right font-bold">66 m²</td>
                    <td className="p-3.5 text-right text-[#ff682c] font-bold">0.52%</td>
                    <td className="p-3.5 text-right">$2,343</td>
                    <td className="p-3.5 text-right">$351</td>
                    <td className="p-3.5 text-right">$431</td>
                    <td className="p-3.5 text-right font-bold">$3,125</td>
                    <td className="p-3.5 text-right"><span className="bg-[#eaf2ec] text-[#2b593a] px-2 py-0.5">✓ Timbrado SAT CFDI 4.0</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: REGLAS DE GOBERNANZA FISCAL SAT CFDI 4.0 & ESTÁNDAR NNN (Screenshot Match) */}
          <div className="space-y-6 pt-4">
            <div className="border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                3. REGLAS DE GOBERNANZA FISCAL SAT CFDI 4.0 & ESTÁNDAR NNN
              </h3>
              <p className="text-xs text-[#4d4d4d] mt-0.5">
                Criterios de auditoría tributaria y conservación del fondo operativo de la plaza.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#202020] font-bold">1. Régimen PPD / PUE SAT</span>
                  <span className="px-2 py-0.5 bg-[#f4efe6] text-[#816729] text-[10px]">SAT 4.0</span>
                </div>
                <p className="text-xs text-[#4d4d4d] leading-relaxed">
                  Obligatoriedad de timbrado del Complemento de Pago dentro de los primeros 5 días hábiles del mes posterior.
                </p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Límite emisión complemento: Día 5</p>
                  <p>• Validación RFC receptor contra CIF</p>
                  <p>• Trazabilidad bancaria SPEI</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#202020] font-bold">2. Invariante NNN (1.0000)</span>
                  <span className="px-2 py-0.5 bg-[#eaf2ec] text-[#2b593a] text-[10px]">MATEMÁTICA NNN</span>
                </div>
                <p className="text-xs text-[#4d4d4d] leading-relaxed">
                  Distribución proporcional exacta del 100% de la superficie rentable de la plaza.
                </p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Superficie GLA: 7,550 m²</p>
                  <p>• Absorción vacancia propietario: 5.89%</p>
                  <p>• Error de redondeo tolerado: 0.0000</p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#202020] font-bold">3. Honorario Administración</span>
                  <span className="px-2 py-0.5 bg-[#202020] text-white text-[10px]">FEE 15% NNN</span>
                </div>
                <p className="text-xs text-[#4d4d4d] leading-relaxed">
                  Cálculo del 15% sobre gastos de mantenimiento común para la administración del activo.
                </p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Aplicable a: Mantenimientos comunes</p>
                  <p>• Excluido de: Renta base pura</p>
                  <p>• Facturación transparente mensual</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 5: CONECTOR SAARI ERP (SCREENSHOT MATCH) ---------------- */}
      {activeTab === "saari" && (
        <div className="space-y-10">
          <div className="bg-[#efefef] rounded-tl-[6px] p-8 sm:p-10 space-y-6">
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
              </div>

              <div className="bg-[#202020] text-white p-6 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white">2. Capa Agentes IA (Control)</span>
                  <span className="px-2 py-0.5 bg-[#4d4d4d] text-white text-[10px]">AUDITORÍA</span>
                </div>
                <p className="text-xs text-[#828282] leading-relaxed">
                  <strong className="text-white">Mariana</strong> audita exclusividades RAG. <strong className="text-white">Diego</strong> rechaza cargos no cubiertos. <strong className="text-white">Renata</strong> detecta errores SAT CFDI PPD.
                </p>
              </div>

              <div className="bg-white p-6 border border-[#e8e8e8] space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#202020]">3. SAARI ERP (Exportación)</span>
                  <span className="px-2 py-0.5 bg-[#ebe6dd] text-[#816729] text-[10px]">SALIDA BATCH</span>
                </div>
                <p className="text-xs text-[#4d4d4d] leading-relaxed">
                  Se devuelven a SAARI los complementos de pago SAT timbrados y el archivo batch listo para facturación NNN masiva.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 border border-[#e8e8e8] space-y-6">
            <div className="flex justify-between items-center border-b border-[#e8e8e8] pb-4">
              <h3 className="text-base font-normal text-[#202020]">CONSOLA INTERACTIVA DEL CONECTOR SAARI ERP</h3>
              <span className="px-3 py-1 bg-[#efefef] text-[#202020] text-xs font-mono">ADAPTADOR ACTIVO</span>
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
