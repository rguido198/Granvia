import "server-only";

import { TENANTS } from "@/content/tenants";
import type {
  AgentReply,
  ApplicantCase,
  CamRow,
  CapexCase,
  ConsoleData,
  CriticalEquipment,
  MaintenanceEvent,
  RentRollRow,
} from "@/lib/console-data";

/**
 * Every figure the landlord console shows, computed on the server.
 *
 * `import "server-only"` is the load-bearing line. This module holds the rent
 * derivation, the contract excerpts Mariana cites, equipment serial numbers and
 * the CAM pool — none of which may end up in a JavaScript chunk, because chunks
 * are served from /_next/static/ and middleware only gates /consola. Before this
 * split, the console's chunk answered 200 to an unauthenticated request with the
 * contract text inside it.
 *
 * Importing this from a "use client" module is now a build error rather than a
 * silent leak. The results reach the browser as props on the RSC payload, which
 * is produced per request behind the session check.
 */

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
    rentProtectedAnnualMxn: 780000,
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
    rentProtectedAnnualMxn: 540000,
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
    tenant: "Ashley",
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
    details: "APROBADO PARA CAM NNN: Gasto de infraestructura común prorrateable entre todos los locales. Incorporado al Fondo CAM de Agosto 2026 ($504,468 MXN) — ver Registro Completo de Facturas en Finanzas & Gastos CAM.",
    equipmentModel: "Caterpillar C15 ACERT 500kW",
    serialNumber: "CAT-500-9942",
  },
];

/**
 * Major infrastructure Diego tracks. The tab's "equipos monitoreados" badge
 * counts this array rather than restating a number, so the badge and the
 * bitácora below it cannot disagree.
 */
const CRITICAL_EQUIPMENT = [
  {
    asset: "Carrier HVAC 15 Toneladas (Ashley)",
    model: "Carrier Commercial WeatherMaster",
    serial: "#CR-884920",
    warranty: "2023 - 2028 (5 Años)",
    status: "✓ Garantía 100% Activa ($0 MXN)",
    doc: "Carrier_Poliza.pdf",
  },
  {
    asset: "Planta de Emergencia Diésel 500kW (Cinemex)",
    model: "Caterpillar C15 ACERT",
    serial: "#CAT-500-9942",
    warranty: "Contrato Anual Preventivo",
    status: "✓ Cobertura CAM Prorrateable",
    doc: "Cat_Maint_2026.pdf",
  },
  {
    asset: "Subestación Eléctrica Principal 13.8kV",
    model: "Schneider Electric Trihal 1500kVA",
    serial: "#SCH-SE-44210",
    warranty: "Garantía Infraestructura Propietario",
    status: "✓ Mantenimiento Bianual Al Día",
    doc: "Schneider_13.8kV.pdf",
  },
];

/**
 * Diego's forward-looking maintenance calendar — one entry per scheduled
 * inspection, calibration, or preventive service on the equipment already
 * cataloged above. Illustrative vendor names, independent of the real
 * contractors table (src/lib/data/contractors.server.ts) that
 * matchContractorAndTier() actually dispatches against.
 */
const MAINTENANCE_EVENTS = [
  { id: "EVT-01", date: "18 Ago 2026", title: "Calibración Cámaras LPR", vendor: "Hikvision & FAAC México", category: "Seguridad & Acceso", costEstimate: 8500, responsible: "Jefe de Seguridad", responsibleEmail: "seguridad@lagranvia.com.mx" },
  { id: "EVT-02", date: "25 Ago 2026", title: "Prueba Trimestral de Aspersores", vendor: "Johnson Controls Fire Protection", category: "Protección Incendio", costEstimate: 12000, responsible: "Gerente de Mantenimiento", responsibleEmail: "mantenimiento@lagranvia.com.mx" },
  { id: "EVT-03", date: "05 Sep 2026", title: "Revisión Preventiva Anual Chiller Trane", vendor: "Climas de Mexicali S.A. de C.V.", category: "HVAC & Climas", costEstimate: 34200, responsible: "Gerente de Mantenimiento", responsibleEmail: "mantenimiento@lagranvia.com.mx" },
  { id: "EVT-04", date: "20 Sep 2026", title: "Inspección Técnica Semestral Elevador", vendor: "TK Elevator México", category: "Elevadores", costEstimate: 18900, responsible: "Gerente de Mantenimiento", responsibleEmail: "mantenimiento@lagranvia.com.mx" },
  { id: "EVT-05", date: "10 Oct 2026", title: "Mantenimiento Bianual Subestación Eléctrica", vendor: "Schneider Electric México", category: "Eléctrico & Subestación", costEstimate: 62000, responsible: "Dirección General", responsibleEmail: "direccion@lagranvia.com.mx" },
  { id: "EVT-06", date: "05 Nov 2026", title: "Servicio de Membranas PTAR", vendor: "Grundfos México", category: "Hidráulico & PTAR", costEstimate: 27800, responsible: "Gerente de Mantenimiento", responsibleEmail: "mantenimiento@lagranvia.com.mx" },
];

/** Local A-14 — the one unit off the rent roll, absorbed by the landlord until re-let. */
const VACANT_UNIT = {
  label: "LOCAL VACANTE DISPONIBLE (Local A-14 / Zona 2)",
  zone: "Zona 2 (Pasillo Central)",
  tag: "Retail / Franquicia AAA",
  sqm: 445,
  askingRent: 106800,
};

/**
 * Monthly common-area pool billed across the plaza's GLA. Every figure in
 * Renata's prorateo matrix derives from this one number, so the column always
 * sums back to it exactly — that sum is the 1.0000 invariant the tab claims.
 *
 * $452,468 across the four ERP/manual/tenant invoices in Renata's ledger, plus
 * $52,000 for Diego's case CAP-03 (Cinemex Premium emergency generator, approved
 * APROBADO_PRORRATEO_CAM) — folded in as of the Ago 2026 cut. Both ledgers must
 * list it or this total stops being traceable to its line items.
 */
const CAM_MONTHLY_POOL = 504468;
const CAM_ADMIN_RATE = 0.15;
const IVA_RATE = 0.16;

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
  // Blue Luna and MINT carry figures the agent narratives quote directly:
  // Mariana prices the Starbucks rejection at $780,000/yr (65,000 × 12) and
  // Renata's PPD/PUE alert is raised against MINT's $32,000 transfer. Changing
  // either rent here breaks a claim stated elsewhere on the page.
  if (name.includes("Blue Luna")) return 65000;
  if (name.includes("MINT")) return 32000;
  if (name.includes("Bodega 8")) return 76800;
  if (name.includes("Bonaprime")) return 18720;
  if (name.includes("Cabanna")) return 76800;
  return Math.round(sqm * 240);
}

/**
 * Apportions display percentages by largest remainder so the column a reader can
 * add up sums to exactly 100.00%.
 *
 * Rounding each row independently drifts to 100.01% across 85 rows — small, but
 * it lands directly under a card claiming a 1.0000 invariant, and a landlord who
 * checks the arithmetic finds the page contradicting itself.
 */
function apportionPercent(values: number[], total: number, decimals = 2): number[] {
  const scale = 10 ** decimals;
  const exact = values.map((value) => (value / total) * 100 * scale);
  const floored = exact.map(Math.floor);
  const order = exact
    .map((value, index) => ({ index, frac: value - floored[index] }))
    .sort((a, b) => b.frac - a.frac);

  const out = [...floored];
  let remainder = Math.round(100 * scale) - floored.reduce((sum, value) => sum + value, 0);
  for (let k = 0; k < order.length && remainder > 0; k += 1, remainder -= 1) {
    out[order[k].index] += 1;
  }
  return out.map((value) => value / scale);
}

/** Key for the vacant unit in the per-unit share map. */
const VACANT_KEY = "__vacant__";

/** Renata's fiscal SAT check — the same condition that drives the CFDI alert on the CAM tab. */
function hasFiscalAlert(name: string): boolean {
  return name.includes("260 Grill");
}

// The rent roll is the single source of truth: every headline figure on this
// page derives from these rows, so a KPI cannot drift from the table beneath it.
//
// Areas resolve against the full tenant list rather than the filtered one —
// getTenantSqm falls back to a positional formula, so filtering first would
// silently change a tenant's m² and rent as the user types in the search box.
const rentRoll = TENANTS.map((tenant, index) => {
  const sqm = getTenantSqm(tenant.name, index);
  return {
    tenant,
    sqm,
    rent: getTenantRent(sqm, tenant.name),
    fiscalAlert: hasFiscalAlert(tenant.name),
  };
});

const leasedSqm = rentRoll.reduce((sum, row) => sum + row.sqm, 0);
const plazaTotalGla = leasedSqm + VACANT_UNIT.sqm;
const contractedRent = rentRoll.reduce((sum, row) => sum + row.rent, 0);
const potentialRent = contractedRent + VACANT_UNIT.askingRent;
const occupancyRate = (leasedSqm / plazaTotalGla) * 100;
const registeredUnits = rentRoll.length + 1;

const tenantsWithAlert = rentRoll.filter((row) => row.fiscalAlert).length;
const tenantsAlDia = rentRoll.length - tenantsWithAlert;
const collectionRate = (tenantsAlDia / rentRoll.length) * 100;

// Every billable unit in plaza order: the 84 leased locales, then the vacancy.
// Both tables draw their pro-rata share from this one apportionment, keyed by
// unit, so the rent roll and the prorateo matrix always print the same figure
// for the same tenant regardless of filtering.
const units = [
  ...rentRoll.map((row) => ({
    key: row.tenant.slug,
    label: row.tenant.name,
    sqm: row.sqm,
    vacant: false,
    fiscalAlert: row.fiscalAlert,
  })),
  { key: VACANT_KEY, label: VACANT_UNIT.label, sqm: VACANT_UNIT.sqm, vacant: true, fiscalAlert: false },
];

const displayShares = apportionPercent(
  units.map((unit) => unit.sqm),
  plazaTotalGla,
);
const shareByUnit = new Map(units.map((unit, index) => [unit.key, displayShares[index]]));

// Prorateo CAM — each unit's slice of CAM_MONTHLY_POOL, rounded to the peso.
// The rounding residual lands on the largest-GLA row so the column sums to the
// pool exactly; the same convention governs CAM_ALLOCATION in content/hub.ts.
const camRowsRaw = units.map((unit) => ({
  ...unit,
  base: Math.round((CAM_MONTHLY_POOL * unit.sqm) / plazaTotalGla),
}));

const largestCamRowIndex = camRowsRaw.reduce(
  (best, row, index) => (row.sqm > camRowsRaw[best].sqm ? index : best),
  0,
);
const camResidual = CAM_MONTHLY_POOL - camRowsRaw.reduce((sum, row) => sum + row.base, 0);

const camRows = camRowsRaw.map((row, index) => {
  const base = index === largestCamRowIndex ? row.base + camResidual : row.base;
  const admin = Math.round(base * CAM_ADMIN_RATE);
  const iva = Math.round((base + admin) * IVA_RATE);
  return { ...row, base, admin, iva, total: base + admin + iva };
});

const camTotals = camRows.reduce(
  (acc, row) => ({
    base: acc.base + row.base,
    admin: acc.admin + row.admin,
    iva: acc.iva + row.iva,
    total: acc.total + row.total,
  }),
  { base: 0, admin: 0, iva: 0, total: 0 },
);


// Agent headline metrics, summed from the cases each tab renders — never restated.
const rentProtectedAnnual = LEASING_APPLICANTS.reduce((sum, app) => sum + (app.rentProtectedAnnualMxn ?? 0), 0);
const capexRejected = CAPEX_CASES.filter((c) => c.verdict.includes("RECHAZADO")).reduce((sum, c) => sum + c.amount, 0);
const capexWarrantyRecovered = CAPEX_CASES.filter((c) => c.verdict.includes("GARANTIA")).reduce((sum, c) => sum + c.amount, 0);

/** The MINT row — the single tenant Renata flags. Its rent is the amount her PPD/PUE alert reconciles. */
const FISCAL_ALERT_ROW = rentRoll.find((row) => row.fiscalAlert);

/**
 * Inbound SAARI payment feed. Amounts are read from the rent roll rather than
 * restated, so a settlement line can never disagree with the rent it settles.
 */
const SAARI_INBOUND = [
  { local: "Local A-01", match: "Ashley", label: "Ashley", flagged: false },
  { local: "Local B-02", match: "Blue Luna", label: "Blue Luna Café", flagged: false },
  { local: "Local B-12", match: "MINT", label: "MINT Boutique", flagged: true },
].map((entry) => ({
  ...entry,
  amount: rentRoll.find((row) => row.tenant.name.includes(entry.match))?.rent ?? 0,
}));

/** Canned agent answers. Contract excerpts, so they stay server-side too. */
const MARIANA_REPLIES: AgentReply[] = [
  {
    chip: "Exclusividad Blue Luna (Loc B-02)",
    query: "¿Cuál es la exclusividad exacta de Blue Luna Café y por qué bloqueó a Starbucks?",
    answer:
      "Blue Luna Café (Local B-02, Zona 4) cuenta con la Cláusula #14 en su contrato vigente (2023-2028). Otorga exclusividad comercial absoluta en la venta de café espresso y especialidad en Zona 4. La propuesta de Starbucks Reserve presentaba un 98.4% de solapamiento semántico en menú.",
    docName: "Contrato_Arrendamiento_BlueLuna_LocB02_Firmado.pdf",
    docRef: "Página 12, Cláusula 14",
  },
  {
    chip: "Conflicto Krispy Kreme (Loc B-05)",
    query: "¿Por qué Krispy Kreme fue rechazado en la Zona 4?",
    answer:
      "La Purísima Bakery (Local B-05) ostenta exclusividad en repostería y postres glaseados (Cláusula #08). El algoritmo de Mariana detectó un 91.2% de conflicto directo en la venta de donas glaseadas.",
    docName: "Contrato_LaPurisima_Bakery_LocB05_Firmado.pdf",
    docRef: "Página 8, Cláusula 08",
  },
  {
    chip: "Dictamen La Vicenta (LFCE §3)",
    query: "¿Por qué La Vicenta fue condicionada bajo la Ley Antimonopolio?",
    answer:
      "Alma Verde solicitó bloquear a La Vicenta por vender ensaladas. Mariana aplicó el filtro de la Ley Federal de Competencia Económica (§3), dictaminando que la exclusividad genérica de Alma Verde es legalmente excesiva. Se aprueba a La Vicenta condicionada a no ofrecer bowls saludables.",
    docName: "Contrato_AlmaVerde_LocB10_Firmado.pdf",
    docRef: "Página 15, Cláusula 22 (LFCE §3)",
  },
];

const DIEGO_REPLIES: AgentReply[] = [
  {
    chip: "Póliza Carrier HVAC Ashley (#CR-884920)",
    query: "¿Por qué el reemplazo de compresor HVAC de Ashley no le cuesta al propietario?",
    answer:
      "Diego verificó el número de serie Carrier #CR-884920. La póliza de garantía del fabricante Carrier cubre fallas mecánicas de compresores de 15 toneladas durante 5 años (vigente hasta Noviembre 2028). Se tramitó la sustitución sin costo para el propietario ($0 MXN).",
    docName: "Poliza_Garantia_Carrier_Ashley_HVAC.pdf",
    docRef: "Serie #CR-884920 (Cobertura 100% Fábrica)",
  },
  {
    chip: "Iluminación Estética Derma Club ($78k)",
    query: "¿Por qué se rechazó la factura de $78,000 MXN de Derma Club?",
    answer:
      "Derma Club solicitó que la plaza cubriera la remodelación de luminarias decorativas de su fachada. Diego consultó la Sección 12 del contrato de arrendamiento, determinando que el mantenimiento estético interior es responsabilidad 100% del arrendatario.",
    docName: "Contrato_DermaClub_LocB08_Firmado.pdf",
    docRef: "Sección 12 (Mantenimiento Inquilino)",
  },
  {
    chip: "Mantenimiento Planta Emergencia Cinemex",
    query: "¿Cómo se aprueba el mantenimiento de la planta diésel de Cinemex?",
    answer:
      "La planta Caterpillar C15 (Serie #CAT-500-9942) provee respaldo eléctrico común a las salas de cine y pasillos centrales. Diego aprobó el gasto de $52,000 MXN para ser prorrateado bajo la cuota CAM NNN de la plaza.",
    docName: "Mantenimiento_Preventivo_Cat_2026.pdf",
    docRef: "Contrato Mantenimiento Infraestructura CAM",
  },
];


/**
 * Assembles the console payload. Called from the server component that renders
 * /consola, once per request.
 */
export function buildConsoleData(): ConsoleData {
  const rows: RentRollRow[] = rentRoll.map((row, index) => {
    const match = row.tenant.zone.match(/\d+/);
    const zoneNum = match ? match[0] : "1";
    const unitSeq = (index + 1).toString().padStart(2, "0");
    const unitCode = `Local ${zoneNum}-${unitSeq}`;

    return {
      slug: row.tenant.slug,
      unitCode,
      name: row.tenant.name,
      zone: row.tenant.zone,
      tag: row.tenant.tag,
      sqm: row.sqm,
      rent: row.rent,
      sharePct: shareByUnit.get(row.tenant.slug) ?? 0,
      fiscalAlert: row.fiscalAlert,
    };
  });

  const camMatrix: CamRow[] = camRows.map((row) => ({
    key: row.key,
    label: row.label,
    sqm: row.sqm,
    sharePct: shareByUnit.get(row.key) ?? 0,
    base: row.base,
    admin: row.admin,
    iva: row.iva,
    total: row.total,
    vacant: row.vacant,
    fiscalAlert: row.fiscalAlert,
  }));

  return {
    rentRoll: rows,
    vacantUnit: { ...VACANT_UNIT, sharePct: shareByUnit.get(VACANT_KEY) ?? 0 },
    camRows: camMatrix,
    camTotals: { ...camTotals, sharePct: displayShares.reduce((sum, value) => sum + value, 0) },
    camMonthlyPool: CAM_MONTHLY_POOL,

    leasedSqm,
    plazaTotalGla,
    contractedRent,
    potentialRent,
    occupancyRate,
    registeredUnits,
    tenantsAlDia,
    tenantsWithAlert,
    collectionRate,

    leasingApplicants: LEASING_APPLICANTS,
    capexCases: CAPEX_CASES,
    criticalEquipment: CRITICAL_EQUIPMENT satisfies CriticalEquipment[],
    maintenanceEvents: MAINTENANCE_EVENTS satisfies MaintenanceEvent[],
    rentProtectedAnnual,
    capexRejected,
    capexWarrantyRecovered,

    fiscalAlertRent: FISCAL_ALERT_ROW?.rent ?? 0,
    saariInbound: SAARI_INBOUND,

    // Generation time and data period are deliberately separate strings. The
    // figures close July; the view is produced now. Collapsing the two into one
    // "updated" stamp is how a dashboard ends up implying the numbers are live.
    generatedAt: (() => {
      try {
        return new Intl.DateTimeFormat("es-MX", {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: "America/Tijuana",
        }).format(new Date());
      } catch {
        return new Date().toISOString();
      }
    })(),
    periodLabel: "Agosto 2026",

    marianaReplies: MARIANA_REPLIES,
    diegoReplies: DIEGO_REPLIES,
  };
}
