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
  const [renataChatResponse] = useState({
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

      {/* ---------------- PESTAÑA 1: RESUMEN RENT ROLL (84 LOCALES ACTIVOS) ---------------- */}
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
              <button
                onClick={() => alert("Exportando informe oficial en PDF...")}
                className="px-4 py-2 bg-white border border-[#202020] text-[#202020] text-xs font-normal cursor-pointer hover:bg-[#f5f5f5]"
              >
                Exportar Reporte (.PDF)
              </button>
              <button
                onClick={() => setActiveTab("saari")}
                className="px-4 py-2 bg-[#ff682c] text-white text-xs font-normal cursor-pointer hover:bg-[#e0561e]"
              >
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
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-normal text-[#202020]">
                    Rent Roll Matriz Consolidada (84 Locales Activos + Vacancia)
                  </h2>
                  <span className="px-2.5 py-1 bg-[#202020] text-white font-mono text-[10px]">🔄 SAARI SYNC ACTIVO</span>
                </div>
                <p className="text-xs text-[#4d4d4d] mt-1">
                  Sincronización en tiempo real: los auxiliares de cobranza de SAARI ERP actualizan automáticamente los estatus de pago de la plaza.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar inquilino o local..."
                  className="px-4 py-2 bg-white border border-[#e8e8e8] text-xs text-[#202020] focus:outline-none"
                />
                <button
                  onClick={() => alert("Sincronizando auxilares desde SAARI ERP...")}
                  className="px-4 py-2 bg-[#ff682c] text-white text-xs font-normal cursor-pointer hover:bg-[#e0561e]"
                >
                  🔄 Sincronizar Pagos desde SAARI ERP
                </button>
              </div>
            </div>

            <div className="overflow-x-auto bg-white border border-[#e8e8e8] rounded-[8px]">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-[#e8e8e8] text-[#828282] uppercase text-[10px] bg-[#f5f5f5] font-mono">
                    <th className="p-3.5 font-normal">#</th>
                    <th className="p-3.5 font-normal">LOCAL / INQUILINO</th>
                    <th className="p-3.5 font-normal">ZONA</th>
                    <th className="p-3.5 font-normal">GIRO / CATEGORÍA</th>
                    <th className="p-3.5 font-normal text-right">SUPERFICIE M²</th>
                    <th className="p-3.5 font-normal text-right">PARTICIPACIÓN PRO-RATA</th>
                    <th className="p-3.5 font-normal text-right">RENTA EST. MXN</th>
                    <th className="p-3.5 font-normal">ESTATUS COBRANZA & FISCAL</th>
                    <th className="p-3.5 font-normal">ACCIÓN / PROTECCIÓN IA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] font-normal text-[#202020]">
                  {filteredTenants.map((t, idx) => {
                    const sqm = getTenantSqm(t.name, idx);
                    const proRata = ((sqm / plazaTotalGla) * 100).toFixed(2);
                    const rent = getTenantRent(sqm, t.name);
                    const isExclusivityActive = t.name.includes("Alma Verde") || t.name.includes("Blue Luna");
                    const isSatError = t.name.includes("MINT");

                    return (
                      <tr key={t.slug} className="hover:bg-[#f5f5f5] transition-colors">
                        <td className="p-3.5 text-[#828282] font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-3.5 font-bold text-[#202020]">{t.name}</td>
                        <td className="p-3.5 text-[#4d4d4d] text-[11px]">{t.zone}</td>
                        <td className="p-3.5 text-[#4d4d4d]">{t.tag}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-[#202020]">{sqm} m²</td>
                        <td className="p-3.5 text-right font-mono font-bold text-[#ff682c]">{proRata}%</td>
                        <td className="p-3.5 text-right font-mono font-bold text-[#202020]">${rent.toLocaleString()}</td>
                        <td className="p-3.5">
                          {isSatError ? (
                            <span className="bg-[#f5e9e8] text-[#7a2e2b] px-2.5 py-1 text-[11px] font-mono">Alerta SAT PPD</span>
                          ) : (
                            <span className="bg-[#eaf2ec] text-[#2b593a] px-2.5 py-1 text-[11px] font-mono">✓ Al Día (CFDI Emitido)</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {isExclusivityActive ? (
                            <span className="text-[#2b593a] font-bold text-xs">Cláusula Exclusividad Activa</span>
                          ) : (
                            <span className="text-[#828282] text-xs font-mono">Protección Agente IA</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="bg-[#f5f5f5] font-mono">
                    <td className="p-3.5 text-[#828282]">-</td>
                    <td className="p-3.5 font-bold text-[#202020] font-sans">Absorbente Vacancia Plaza (2 Locales)</td>
                    <td className="p-3.5 text-[#4d4d4d]">Zona 4 / Zona 9</td>
                    <td className="p-3.5 text-[#4d4d4d]">Locales Vacantes (A-04 & B-09)</td>
                    <td className="p-3.5 text-right font-bold text-[#202020]">445 m²</td>
                    <td className="p-3.5 text-right font-bold text-[#ff682c]">3.49%</td>
                    <td className="p-3.5 text-right font-bold text-[#202020]">$0</td>
                    <td className="p-3.5"><span className="bg-[#ebe6dd] text-[#816729] px-2.5 py-1 text-[11px]">Absorbido por Propietario</span></td>
                    <td className="p-3.5 text-[#4d4d4d]">Cuadra Balance Invariante a 1.0000</td>
                  </tr>
                </tbody>
              </table>

              <div className="bg-[#202020] text-white p-5 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
                <span className="font-bold tracking-wider uppercase text-[#828282]">
                  TOTAL PLAZA LA GRAN VÍA (84 LOCALES ACTIVOS + VACANTES)
                </span>
                <div className="flex flex-wrap items-center gap-6">
                  <span>12,745 m²</span>
                  <span className="text-[#ff682c] font-bold">1.0000 (100.00%)</span>
                  <span className="text-[#ff682c] font-bold text-sm">$3,145,000 MXN</span>
                  <span className="text-[#4ade80]">94.1% Ocupación Activa · Balance Cuadrado</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#202020] text-white p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#4d4d4d] pb-4 font-mono text-xs">
              <span className="text-[#ff682c]">● RESUMEN EJECUTIVO DE COBERTURA OPERATIVA & AUDITORÍA CONTÍNUA</span>
              <span className="text-[#828282]">LA GRAN VIA MEXICALI</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
              <div className="bg-[#2d2a26] p-5 border border-[#4d4d4d] space-y-2">
                <span className="text-[#828282] block text-[10px] uppercase">CUMPLIMIENTO FISCAL SAT:</span>
                <div className="text-xl font-bold text-white">84 / 85 VALIDADOS</div>
                <span className="text-[#828282] block text-[11px]">1 Alerta CFDI PPD/PUE emitida</span>
              </div>

              <div className="bg-[#2d2a26] p-5 border border-[#4d4d4d] space-y-2">
                <span className="text-[#828282] block text-[10px] uppercase">PROTECCIÓN EXCLUSIVIDADES:</span>
                <div className="text-xl font-bold text-[#ff682c]">14 CLÁUSULAS ACTIVAS</div>
                <span className="text-[#828282] block text-[11px]">0 Demandas por incumplimiento</span>
              </div>

              <div className="bg-[#2d2a26] p-5 border border-[#4d4d4d] space-y-2">
                <span className="text-[#828282] block text-[10px] uppercase">RECLAMO DE GARANTÍAS ($0):</span>
                <div className="text-xl font-bold text-[#ff682c]">$145,000 MXN RECUPERADOS</div>
                <span className="text-[#828282] block text-[11px]">Carrier HVAC garantía activa</span>
              </div>

              <div className="bg-[#2d2a26] p-5 border border-[#4d4d4d] space-y-2">
                <span className="text-[#828282] block text-[10px] uppercase">INTEGRACIÓN ERP SAARI:</span>
                <div className="text-xl font-bold text-white">100% SINCRONIZADO</div>
                <span className="text-[#828282] block text-[11px]">Lote Batch listo para exportar</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 2: MARIANA AI (FULL 5 SECTIONS) ---------------- */}
      {activeTab === "leasing" && (
        <div className="space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-4">
            <div>
              <span className="px-3 py-1 bg-[#eaf2ec] text-[#2b593a] font-mono text-[11px] font-bold uppercase tracking-wider inline-block">
                🟢 OPERACIÓN AL DÍA | La Gran Vía Mexicali
              </span>
              <h1 className="text-3xl sm:text-4xl font-normal text-[#202020] tracking-[-0.02em] mt-2">
                Módulo de Arrendamiento & Inteligencia Legal (Mariana)
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

          <div className="bg-[#efefef] rounded-tl-[6px] p-8 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
              <div>
                <span className="text-xs font-normal text-[#816729] uppercase tracking-wider block font-mono">
                  Módulo de Arrendamiento & Inteligencia Legal (Mariana) <span className="bg-[#ebe6dd] px-2 py-0.5 text-[#816729]">SOP §2A & GENERAL COUNSEL AI</span>
                </span>
                <p className="text-xs text-[#4d4d4d] mt-1">
                  Monitoreo en vivo de solicitudes prospecto, consulta RAG de contratos, exclusividades y guardrails de la plaza.
                </p>
              </div>
              <span className="px-4 py-2 bg-[#202020] text-white font-mono text-xs">85 CONTRATOS EN BÓVEDA RAG</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">SOLICITUDES EVALUADAS</span>
                <div className="text-2xl font-normal text-[#202020]">3 Prospectos Auditados</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">EXCLUSIVIDADES ACTIVAS</span>
                <div className="text-2xl font-normal text-[#ff682c]">14 Cláusulas Protegidas</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">RIESGO LEGAL PREVENIDO</span>
                <div className="text-2xl font-normal text-[#2b593a]">$780,000 MXN / año</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 border border-[#e8e8e8] rounded-[20px] space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-[#202020] text-white flex items-center justify-center text-xs font-mono font-bold">M</div>
                <div>
                  <h3 className="text-sm font-normal text-[#202020] uppercase font-mono tracking-wider">
                    ASISTENTE LEGAL RAG: CONSULTA DIRECTA A MARIANA
                  </h3>
                  <p className="text-xs text-[#828282]">
                    Haz cualquier pregunta sobre los 85 contratos, leyes de Baja California o políticas de la plaza.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-[#efefef] text-[#816729] text-xs font-mono">● BÓVEDA INDEXADA RAG</span>
            </div>

            <div className="bg-[#f5f5f5] p-6 border border-[#e8e8e8] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#828282]">
                <span className="font-mono text-[#202020] font-bold">Pregunta: {marianaChatResponse.query}</span>
                <span className="text-[#2b593a] font-mono">✓ Respuesta RAG Verificada</span>
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
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 3: DIEGO AI (SCREENSHOT 1 & 2 MATCH) ---------------- */}
      {activeTab === "maint" && (
        <div className="space-y-10">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-4">
            <div>
              <span className="px-3 py-1 bg-[#eaf2ec] text-[#2b593a] font-mono text-[11px] font-bold uppercase tracking-wider inline-block">
                🟢 OPERACIÓN AL DÍA | La Gran Vía Mexicali
              </span>
              <h1 className="text-3xl sm:text-4xl font-normal text-[#202020] tracking-[-0.02em] mt-2">
                Auditoría de Gastos CapEx Dudosos vs. Garantías (Diego)
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
                  Auditoría de Gastos CapEx & Garantías de Equipos (Diego) <span className="bg-[#ebe6dd] px-2 py-0.5 text-[#816729]">SOP §2B & CAPEX GUARDIAN AI</span>
                </span>
                <p className="text-xs text-[#4d4d4d] mt-1">
                  Verificación técnica de reclamos de mantenimiento, garantías de fabricante y protección del flujo del propietario.
                </p>
              </div>
              <span className="px-4 py-2 bg-[#202020] text-white font-mono text-xs">6 EQUIPOS CRÍTICOS MONITOREADOS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">RECLAMOS AUDITADOS</span>
                <div className="text-2xl font-normal text-[#202020]">3 Casos Auditados</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">GARANTÍAS RECOBRADAS ($0)</span>
                <div className="text-2xl font-normal text-[#2b593a]">$145,000 MXN / Evento</div>
              </div>
              <div className="bg-white p-6 border border-[#e8e8e8] space-y-1">
                <span className="text-[10px] font-mono text-[#828282] block uppercase">GASTO IMPROCEDENTE RECHAZADO</span>
                <div className="text-2xl font-normal text-[#ff682c]">$78,000 MXN Rechazado</div>
              </div>
            </div>
          </div>

          {/* Interactive RAG AI Chat Assistant Console (Screenshot 1 Match) */}
          <div className="bg-white p-8 border border-[#e8e8e8] rounded-[20px] space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-[#202020] text-white flex items-center justify-center text-xs font-mono font-bold">D</div>
                <div>
                  <h3 className="text-sm font-normal text-[#202020] uppercase font-mono tracking-wider">
                    ASISTENTE OPERATIVO AI: CONSULTA DIRECTA A DIEGO
                  </h3>
                  <p className="text-xs text-[#828282]">
                    Haz preguntas sobre pólizas Carrier, números de serie, deslinde CapEx/OpEx o contratos de mantenimiento.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-[#efefef] text-[#816729] text-xs font-mono">● AUDITORÍA TÉCNICA ACTIVA</span>
            </div>

            {/* 3 Preset Query Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setDiegoQuery("Póliza Carrier HVAC Ashley (#CR-884920)");
                  setDiegoChatResponse({
                    query: "¿Por qué el reemplazo de compresor HVAC de Ashley Furniture no le cuesta al propietario?",
                    answer: "Diego verificó el número de serie Carrier #CR-884920. La póliza de garantía del fabricante Carrier cubre fallas mecánicas de compresores de 15 toneladas durante 5 años (vigente hasta Noviembre 2028). Se tramitó la sustitución sin costo para el propietario ($0 MXN).",
                    pdfName: "Poliza_Garantia_Carrier_Ashley_HVAC.pdf",
                    pdfClause: "Serie #CR-884920 (Cobertura 100% Fábrica)",
                  });
                }}
                className="px-4 py-2 bg-[#efefef] hover:bg-[#ebe6dd] text-[#202020] text-xs rounded-[200px] transition-colors cursor-pointer font-sans"
              >
                ❄️ Póliza Carrier HVAC Ashley (#CR-884920)
              </button>

              <button
                onClick={() => {
                  setDiegoQuery("Iluminación Estética Derma Club ($78k)");
                  setDiegoChatResponse({
                    query: "¿Por qué se rechazó el gasto de iluminación de Derma Club?",
                    answer: "Diego auditó la Sección 12 del contrato marco. Las luminarias decorativas e interiores son responsabilidad 100% del inquilino, por lo que el reclamo de $78,000 MXN fue rechazado para el propietario.",
                    pdfName: "Contrato_DermaClub_Seccion12.pdf",
                    pdfClause: "Sección 12: Mantenimiento Local",
                  });
                }}
                className="px-4 py-2 bg-[#efefef] hover:bg-[#ebe6dd] text-[#202020] text-xs rounded-[200px] transition-colors cursor-pointer font-sans"
              >
                💡 Iluminación Estética Derma Club ($78k)
              </button>

              <button
                onClick={() => {
                  setDiegoQuery("Mantenimiento Planta Emergencia Cinemex");
                  setDiegoChatResponse({
                    query: "¿Cómo se asigna el mantenimiento de la planta de emergencia de Cinemex?",
                    answer: "La planta diésel Caterpillar 500kW alimenta áreas comunes. El costo preventivo de $52,000 MXN se aprueba como gasto común prorrateable en la liquidación CAM NNN mensual.",
                    pdfName: "Cat_Maint_2026.pdf",
                    pdfClause: "Contrato Anual Preventivo",
                  });
                }}
                className="px-4 py-2 bg-[#efefef] hover:bg-[#ebe6dd] text-[#202020] text-xs rounded-[200px] transition-colors cursor-pointer font-sans"
              >
                ⚡ Mantenimiento Planta Emergencia Cinemex
              </button>
            </div>

            {/* Answer Display Card */}
            <div className="bg-[#f5f5f5] p-6 border border-[#e8e8e8] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#828282]">
                <span className="font-mono text-[#202020] font-bold">Consulta: {diegoChatResponse.query}</span>
                <span className="text-[#2b593a] font-mono">✓ Verificado en Bitácora de Equipos</span>
              </div>
              <p className="text-sm text-[#202020] leading-relaxed">{diegoChatResponse.answer}</p>
              <div className="pt-2 flex items-center justify-between text-xs border-t border-[#e8e8e8]">
                <span className="font-mono text-[#816729]">📄 Certificado de Garantía / Contrato: {diegoChatResponse.pdfName} ({diegoChatResponse.pdfClause})</span>
                <button onClick={() => alert(`Descargando ${diegoChatResponse.pdfName}...`)} className="text-[#202020] border-b border-[#ff682c] cursor-pointer">
                  Descargar Póliza PDF →
                </button>
              </div>
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={diegoQuery}
                onChange={(e) => setDiegoQuery(e.target.value)}
                placeholder="Pregunta a Diego sobre garantías HVAC, plantas de emergencia o deslinde de gastos..."
                className="flex-1 px-4 py-3 bg-[#f5f5f5] border border-[#e8e8e8] text-xs text-[#202020] focus:outline-none"
              />
              <button
                onClick={() => alert("Consultando Bitácora de Equipos Diego...")}
                className="px-6 py-3 bg-[#202020] text-white text-xs font-normal cursor-pointer hover:bg-[#333333]"
              >
                Consultar AI →
              </button>
            </div>
          </div>

          {/* Section 1: EVALUADOR DE SOLICITUDES CAPEX & RECLAMACIÓN DE GARANTÍAS (Screenshot 1 Match) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                1. EVALUADOR DE SOLICITUDES CAPEX & RECLAMACIÓN DE GARANTÍAS
              </h3>
              <span className="text-xs text-[#828282] font-mono">SELECCIONA UN GASTO RECLAMADO PARA AUDITAR</span>
            </div>

            {/* 3 Case Selector Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CAPEX_CASES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedCapex(item);
                    setDiegoNotificationSent(false);
                  }}
                  className={`p-6 bg-white border text-left cursor-pointer transition-colors space-y-3 ${
                    selectedCapex.id === item.id ? "border-[#202020]" : "border-[#e8e8e8] hover:border-[#828282]"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-normal text-base text-[#202020]">{item.tenant}</span>
                    <span className="font-mono text-xs font-bold text-[#ff682c]">${item.amount.toLocaleString()} MXN</span>
                  </div>
                  <p className="text-xs text-[#4d4d4d]">{item.expenseType}</p>
                </button>
              ))}
            </div>

            {/* Dark Dictamen Box (Screenshot 1 & 2 Match) */}
            <div className="bg-[#202020] text-white p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-[#4d4d4d] pb-4 text-xs font-mono">
                <span className="text-[#ff682c]">● DICTAMEN TÉCNICO & CONTRACTUAL DIEGO AI ({selectedCapex.id})</span>
                <span className="bg-[#f5e9e8] text-[#7a2e2b] px-3 py-1 font-bold">
                  🚫 RECHAZADO (RESPONSABILIDAD INQUILINO)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-[#2d2a26] p-4 space-y-1">
                  <span className="text-[#828282] block text-[10px]">INQUILINO SOLICITANTE:</span>
                  <span className="text-sm font-bold text-white">{selectedCapex.tenant}</span>
                </div>
                <div className="bg-[#2d2a26] p-4 space-y-1">
                  <span className="text-[#828282] block text-[10px]">MONTO MONITOREADO:</span>
                  <span className="text-sm font-bold text-[#ff682c]">${selectedCapex.amount.toLocaleString()} MXN</span>
                </div>
                <div className="bg-[#2d2a26] p-4 space-y-1">
                  <span className="text-[#828282] block text-[10px]">IMPACTO AL PROPIETARIO:</span>
                  <span className="text-sm font-bold text-[#4ade80]">$0 MXN (Absorbido)</span>
                </div>
              </div>

              <div className="bg-[#2d2a26] p-5 border border-[#4d4d4d] space-y-2">
                <span className="text-[10px] font-mono text-[#816729] uppercase font-bold block">ANÁLISIS COGNITIVO DIEGO:</span>
                <p className="text-xs text-white leading-relaxed">{selectedCapex.details}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#4d4d4d] text-xs font-mono">
                <span className="text-[#828282]">✓ Auditado automáticamente contra pólizas Carrier & Sección 12 del contrato marco.</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => alert("Generando dictamen técnico en PDF...")} className="px-4 py-2 bg-white text-[#202020] text-xs cursor-pointer">
                    📄 Dictamen PDF
                  </button>
                  <button onClick={() => setDiegoNotificationSent(true)} className="px-4 py-2 bg-[#ff682c] text-white text-xs cursor-pointer">
                    ✉️ {diegoNotificationSent ? "✓ Notificación Enviada" : "Notificar Resolución Técnica"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: BITÁCORA DE EQUIPOS CRÍTICOS & PÓLIZAS DE GARANTÍA VIGENTES (Screenshot 2 Match) */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3">
              <div>
                <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                  2. BITÁCORA DE EQUIPOS CRÍTICOS & PÓLIZAS DE GARANTÍA VIGENTES
                </h3>
                <p className="text-xs text-[#4d4d4d] mt-0.5">Registro de infraestructura instalada, números de serie y vigencia de pólizas de fabricante ($0 costo).</p>
              </div>
              <span className="px-3 py-1 bg-[#202020] text-white text-xs font-mono">
                6 EQUIPOS REGISTRADOS
              </span>
            </div>

            <div className="overflow-x-auto bg-white border border-[#e8e8e8] rounded-[8px]">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-[#e8e8e8] text-[#828282] uppercase text-[10px] bg-[#f5f5f5] font-mono">
                    <th className="p-3.5 font-normal">EQUIPO / UBICACIÓN</th>
                    <th className="p-3.5 font-normal">MARCA & MODELO</th>
                    <th className="p-3.5 font-normal">NÚMERO DE SERIE</th>
                    <th className="p-3.5 font-normal">VIGENCIA GARANTÍA</th>
                    <th className="p-3.5 font-normal">ESTATUS DE COBERTURA</th>
                    <th className="p-3.5 font-normal text-right">PÓLIZA PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] font-normal text-[#202020]">
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold">Carrier HVAC 15 Toneladas (Ashley)</td>
                    <td className="p-3.5 text-[#4d4d4d]">Carrier Commercial WeatherMaster</td>
                    <td className="p-3.5 font-mono font-bold text-[#202020]">#CR-884920</td>
                    <td className="p-3.5 font-mono text-[#4d4d4d]">2023 - 2028 (5 Años)</td>
                    <td className="p-3.5"><span className="bg-[#eaf2ec] text-[#2b593a] px-2.5 py-1 text-[11px] font-mono font-bold">✓ Garantía 100% Activa ($0 MXN)</span></td>
                    <td className="p-3.5 text-right font-mono"><button onClick={() => alert("Abriendo Póliza Carrier...")} className="px-3 py-1 bg-[#efefef] text-[#202020] text-[11px] cursor-pointer hover:bg-[#ebe6dd]">📄 Carrier_Poliza.pdf</button></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold">Planta de Emergencia Diésel 500kW (Cinemex)</td>
                    <td className="p-3.5 text-[#4d4d4d]">Caterpillar C15 ACERT</td>
                    <td className="p-3.5 font-mono font-bold text-[#202020]">#CAT-500-9942</td>
                    <td className="p-3.5 font-mono text-[#4d4d4d]">Contrato Anual Preventivo</td>
                    <td className="p-3.5"><span className="bg-[#f4efe6] text-[#816729] px-2.5 py-1 text-[11px] font-mono font-bold">✓ Cobertura CAM Prorrateable</span></td>
                    <td className="p-3.5 text-right font-mono"><button onClick={() => alert("Abriendo Contrato Cat...")} className="px-3 py-1 bg-[#efefef] text-[#202020] text-[11px] cursor-pointer hover:bg-[#ebe6dd]">📄 Cat_Maint_2026.pdf</button></td>
                  </tr>
                  <tr className="hover:bg-[#f5f5f5] transition-colors">
                    <td className="p-3.5 font-bold">Subestación Eléctrica Principal 13.8kV</td>
                    <td className="p-3.5 text-[#4d4d4d]">Schneider Electric Trihal 1500kVA</td>
                    <td className="p-3.5 font-mono font-bold text-[#202020]">#SCH-SE-44210</td>
                    <td className="p-3.5 font-mono text-[#4d4d4d]">Garantía Infraestructura Propietario</td>
                    <td className="p-3.5"><span className="bg-[#f4efe6] text-[#816729] px-2.5 py-1 text-[11px] font-mono font-bold">✓ Mantenimiento Bianual Al Día</span></td>
                    <td className="p-3.5 text-right font-mono"><button onClick={() => alert("Abriendo Póliza Schneider...")} className="px-3 py-1 bg-[#efefef] text-[#202020] text-[11px] cursor-pointer hover:bg-[#ebe6dd]">📄 Schneider_13.8kV.pdf</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: MATRIZ DE DESLINDE CAPEX / OPEX & REGLAS DE MANTENIMIENTO (Screenshot 2 Match) */}
          <div className="space-y-6 pt-4">
            <div className="border-b border-[#e8e8e8] pb-3">
              <h3 className="text-xs font-normal text-[#816729] uppercase tracking-wider font-mono">
                3. MATRIZ DE DESLINDE CAPEX / OPEX & REGLAS DE MANTENIMIENTO
              </h3>
              <p className="text-xs text-[#4d4d4d] mt-0.5">
                Criterios normativos de asignación de costos entre Propietario, Inquilino y Fondo Común CAM.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#202020] font-bold">1. Carga del Propietario</span>
                  <span className="px-2 py-0.5 bg-[#eaf2ec] text-[#2b593a] text-[10px]">CAPEX PROPIETARIO</span>
                </div>
                <p className="text-xs text-[#4d4d4d] leading-relaxed">
                  Infraestructura estructural primaria y activos mayores de la plaza.
                </p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Cimentación & muros de carga</p>
                  <p>• Impermeabilización general de losas</p>
                  <p>• Red principal hidrosanitaria</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#202020] font-bold">2. Carga del Inquilino</span>
                  <span className="px-2 py-0.5 bg-[#f5e9e8] text-[#7a2e2b] text-[10px]">RESPONSABILIDAD LOCAL</span>
                </div>
                <p className="text-xs text-[#4d4d4d] leading-relaxed">
                  Equipamiento interior, acabados arquitectónicos y mantenimiento preventivo exclusivo del giro.
                </p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Luminarias estéticas e interiores</p>
                  <p>• Trampas de grasa y filtros de cocina</p>
                  <p>• Cortinas metálicas y cristales</p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#efefef] p-6 border border-[#e8e8e8] space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#202020] font-bold">3. Prorrateo CAM NNN</span>
                  <span className="px-2 py-0.5 bg-[#f4efe6] text-[#816729] text-[10px]">GASTO COMÚN</span>
                </div>
                <p className="text-xs text-[#4d4d4d] leading-relaxed">
                  Gastos operativos de conservación y servicios compartidos entre los 85 locales.
                </p>
                <div className="bg-white p-4 border border-[#e8e8e8] text-xs font-mono text-[#202020] space-y-1">
                  <p>• Vigilancia 24/7 y circuito cerrado</p>
                  <p>• Alumbrado de estacionamiento</p>
                  <p>• Planta de emergencia diésel común</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA 4: RENATA AI (CAM & FISCAL SAT) ---------------- */}
      {activeTab === "cam" && (
        <div className="space-y-10">
          <div className="bg-[#efefef] rounded-tl-[6px] p-8 sm:p-10 space-y-6">
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
