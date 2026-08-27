/**
 * Tenant Hub — inquilinos.lagranvia.com.mx
 *
 * The comp frames this as the replacement for the landlord's personal
 * WhatsApp: every request becomes traceable.
 *
 * TODO(contenido-real): each action currently points at a placeholder route.
 * Wire `href` to the real ticketing / reporting endpoints, and drop the actual
 * reglamento PDF into /public when it's ready.
 */

export type HubAction = {
  key: string;
  title: string;
  /** English subtitle in mono caps. */
  en: string;
  desc: string;
  cta: string;
  href: string;
  accent: "terra" | "pine" | "gold";
  /** Distinguishes the three icon tiles: diamond, circle, square. */
  icon: "diamond" | "circle" | "square";
};

export const HUB_ACTIONS: HubAction[] = [
  {
    key: "ticket",
    title: "Reportar Incidencia",
    en: "Maintenance Ticket",
    desc: "Plomería, eléctrico o seguridad. Registra el problema y dale seguimiento sin llamadas.",
    cta: "Abrir ticket",
    href: "#ticket",
    accent: "terra",
    icon: "diamond",
  },
  {
    key: "ventas",
    title: "Reporte Mensual de Ventas",
    en: "Sales Reporting",
    desc: "Formulario seguro para tu reporte mensual. Se organiza solo — nada de capturas por chat.",
    cta: "Enviar reporte",
    href: "#ventas",
    accent: "pine",
    icon: "circle",
  },
  {
    key: "reglamentos",
    title: "Descargar Reglamentos",
    en: "Rules & Hours",
    desc: "Reglamento de la plaza, horarios y lineamientos vigentes en un solo PDF.",
    cta: "Descargar PDF",
    href: "#reglamentos",
    accent: "gold",
    icon: "square",
  },
];

/**
 * Line items on the tenant's NNN / CAM operating-expense ledger — demo data.
 *
 * `plazaMonthly` is what the plaza pays that provider; `tenantShare` is Local
 * B-12's slice of it, at its 70 / 12,745 m² pro-rata share.
 *
 * The 12,745 m² basis is the plaza GLA the landlord dashboard derives from the
 * rent roll (12,300 m² leased + 445 m² vacant). Every CAM figure in this file
 * uses it; nothing here may be rebased in isolation.
 */
export type CamLineItem = {
  concept: string;
  provider: string;
  plazaMonthly: number;
  tenantShare: number;
};

/**
 * Reconciles to CAM_ALLOCATION: plazaMonthly sums to its invoiceTotal
 * (268,500), and tenantShare sums to MINT Boutique's allocated 1,475 — the
 * ledger itemizes exactly what that one number is made of. The rounding
 * residual sits on the largest line. Keep both totals tied if these figures
 * are ever edited.
 */
export const CAM_LEDGER: CamLineItem[] = [
  { concept: "Seguridad & Vigilancia", provider: "Grupo Custodia Fronteriza", plazaMonthly: 113237, tenantShare: 622 },
  { concept: "Recolección de Basura", provider: "Servicios Urbanos Mexicali", plazaMonthly: 26150, tenantShare: 144 },
  { concept: "Jardinería & Áreas Comunes", provider: "Verde Paisajismo", plazaMonthly: 39224, tenantShare: 215 },
  { concept: "Iluminación & Electricidad Común", provider: "CFE / Plaza", plazaMonthly: 54634, tenantShare: 300 },
  { concept: "Administración & Limpieza", provider: "Servicios Plaza", plazaMonthly: 35255, tenantShare: 194 },
];

/**
 * The tenant whose own view the portal demo renders.
 *
 * Every figure here matches what the landlord console shows for the same unit:
 * 70 m² and $32,000 come from the rent roll, and the lease end date comes from
 * CHURN_RADAR below. The portal previously said 145 m², $40,000 and "Octubre
 * 2026" — three numbers a tenant could disprove by reading their own contract.
 */
export const PORTAL_TENANT = {
  name: "Buffalo Wild Wings",
  unit: "Local 03",
  zone: "Zona Restaurantes & Terrazas",
  sqm: 450,
  monthlyRent: 98500,
  leaseEnds: "Noviembre 2028",
  contactEmail: "gerencia@bwwmexicali.com.mx",
} as const;

/** Scripted exchange for the AC-malfunction ticket simulator. */
export type AcTicketMessage = { role: "ai" | "tenant"; text: string };

export const AC_TICKET_SCRIPT: AcTicketMessage[] = [
  {
    role: "ai",
    text: "Veo que reportaste una falla de aire acondicionado. ¿Puedes confirmar si el código de error E4 está parpadeando en tu termostato?",
  },
  { role: "tenant", text: "Sí, E4 está parpadeando." },
  {
    role: "ai",
    text: "Entendido. Según el manual de la unidad, eso corresponde a un respaldo de condensación. Ya despaché a tu contratista preaprobado, ‘Climas de Mexicali’, para hoy a las 3:00 PM. Ticket #INC-404 registrado.",
  },
];

/** Rotating pool for the Landlord Command Center's live activity feed — demo data. */
export type ActivityEntry = { agent: string; text: string; accent: "terra" | "pine" | "gold" };

// Diego (Mantenimiento) and Mariana (Arrendamiento) only — the two agents
// actually contracted for this engagement. Previously included "Agente
// Financiero" (CFDI invoice automation) and "Agente de Asset Management"
// (CAM proration) entries; neither exists here — no ERP/accounting
// connection for the first, and Renata/cam-allocator isn't contracted for
// the second (same rule applied throughout the console this session).
export const AI_ACTIVITY_POOL: ActivityEntry[] = [
  { agent: "Agente de Arrendamiento", text: "Evaluó una solicitud entrante para Local C-08 — sin conflicto de exclusividad.", accent: "pine" },
  { agent: "Agente de Mantenimiento", text: "Despachó a Climas de Mexicali al Local 03 (falla de AC, código E4).", accent: "terra" },
  { agent: "Agente de Arrendamiento", text: "Generó lineamientos de Islas Comerciales para un giro con cláusula de exclusividad activa.", accent: "terra" },
  { agent: "Agente de Mantenimiento", text: "Cerró el ticket #INC-401 (trampa de grasa) — confirmado por Alma Verde.", accent: "pine" },
];

/** CAM allocation demo — one plaza invoice divided proportionally by tenant m². */
export type CamAllocationRow = { tenant: string; sqm: number; share: number; amount: number };

export const CAM_ALLOCATION = {
  invoiceLabel: "Recibo CFE + Seguridad + Mantenimiento — Agosto 2026",
  invoiceTotal: 268500,
  // Shares and amounts are derived from sqm / 12,745 m² GLA, at full precision.
  // Tenant names and areas match the rent roll in landlord-dashboard.tsx — the
  // two views describe one plaza and must not diverge.
  // Invariants: shares sum to exactly 1.000 and amounts sum to exactly
  // invoiceTotal. The rounding residual is assigned to the largest-GLA row.
  // Keep both invariants intact if these figures are ever edited.
  rows: [
    { tenant: "Ashley", sqm: 1450, share: 0.114, amount: 30547 },
    { tenant: "Cinemex Premium", sqm: 1180, share: 0.093, amount: 24859 },
    { tenant: "Buffalo Wild Wings", sqm: 450, share: 0.035, amount: 9480 },
    { tenant: "Derma Club Farmacia Dermatológica", sqm: 66, share: 0.005, amount: 1390 },
    { tenant: "Resto de la plaza (80 locales + vacancia)", sqm: 9599, share: 0.753, amount: 202224 },
  ] as CamAllocationRow[],
} as const;

/** Proactive churn radar — demo lease-health snapshot for key anchor/marquee tenants. */
export type ChurnRow = {
  tenant: string;
  leaseEnds: string;
  portalActivity: string;
  risk: "green" | "yellow" | "red";
  note: string;
};

export const CHURN_RADAR: ChurnRow[] = [
  {
    tenant: "Ashley",
    leaseEnds: "Mar 2027",
    portalActivity: "Alta · 92%",
    risk: "green",
    note: "Ventas +11% YoY, sin incidencias abiertas.",
  },
  {
    tenant: "Derma Club",
    leaseEnds: "Ene 2027",
    portalActivity: "Media · 61%",
    risk: "yellow",
    note: "Reportes de ventas 2 de los últimos 3 meses con retraso.",
  },
  {
    tenant: "Buffalo Wild Wings",
    leaseEnds: "Nov 2028",
    portalActivity: "Alta · 98%",
    risk: "green",
    note: "Excelente desempeño comercial, pago de renta al día y reporte POS constante.",
  },
];

export const HUB_INTRO = {
  title: "Tu operación, en orden.",
  lead: "Bienvenido al Tenant Hub. Aquí resuelves todo con la administración en un solo lugar — nada de mensajes perdidos ni cadenas de WhatsApp. Elige una acción para empezar.",
  note: "Reemplaza el WhatsApp personal del arrendador con solicitudes trazables",
} as const;
