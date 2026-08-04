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

/** Line items on the tenant's NNN / CAM operating-expense ledger — demo data. */
export type CamLineItem = {
  concept: string;
  provider: string;
  monthly: number;
};

export const CAM_LEDGER: CamLineItem[] = [
  { concept: "Seguridad & Vigilancia", provider: "Grupo Custodia Fronteriza", monthly: 4850 },
  { concept: "Recolección de Basura", provider: "Servicios Urbanos Mexicali", monthly: 1120 },
  { concept: "Jardinería & Áreas Comunes", provider: "Verde Paisajismo", monthly: 1680 },
  { concept: "Iluminación & Electricidad Común", provider: "CFE / Plaza", monthly: 2340 },
  { concept: "Administración & Limpieza", provider: "Servicios Plaza", monthly: 1510 },
];

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

export const AI_ACTIVITY_POOL: ActivityEntry[] = [
  { agent: "Agente de Arrendamiento", text: "Evaluó una solicitud entrante para Local C-08 — sin conflicto de exclusividad.", accent: "pine" },
  { agent: "Agente de Mantenimiento", text: "Despachó a Climas de Mexicali al Local A-04 (falla de AC, código E4).", accent: "terra" },
  { agent: "Agente Financiero", text: "Procesó el reporte de ventas de Bodega 8 con OCR y emitió el CFDI correspondiente.", accent: "pine" },
  { agent: "Agente de Asset Management", text: "Detectó una caída de 6% en afluencia hacia MINT Boutique — añadida al radar de riesgo.", accent: "gold" },
  { agent: "Agente de Arrendamiento", text: "Generó lineamientos de Islas Comerciales para un giro con cláusula de exclusividad activa.", accent: "terra" },
  { agent: "Agente Financiero", text: "Envió recordatorio automático de reporte de ventas a 3 locales pendientes.", accent: "pine" },
  { agent: "Agente de Mantenimiento", text: "Cerró el ticket #INC-401 (trampa de grasa) — confirmado por Alma Verde.", accent: "pine" },
  { agent: "Agente de Asset Management", text: "Actualizó el prorrateo de CAM de julio para los 79 locales activos.", accent: "gold" },
];

/** CAM allocation demo — one plaza invoice divided proportionally by tenant m². */
export type CamAllocationRow = { tenant: string; sqm: number; share: number; amount: number };

export const CAM_ALLOCATION = {
  invoiceLabel: "Recibo CFE + Seguridad + Mantenimiento — Julio 2026",
  invoiceTotal: 268500,
  // Shares and amounts are derived from sqm / 7,550 m² total, at full precision.
  // Invariants: shares sum to exactly 1.000 and amounts sum to exactly
  // invoiceTotal. The 1-peso rounding residual is assigned to the largest-GLA
  // row. Keep both invariants intact if these figures are ever edited.
  rows: [
    { tenant: "Ashley Furniture", sqm: 1450, share: 0.192, amount: 51566 },
    { tenant: "Cinépolis VIP", sqm: 1180, share: 0.156, amount: 41964 },
    { tenant: "MINT Boutique", sqm: 145, share: 0.019, amount: 5157 },
    { tenant: "Derma Club", sqm: 95, share: 0.013, amount: 3378 },
    { tenant: "Resto de la plaza (75 locales)", sqm: 4680, share: 0.620, amount: 166435 },
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
    tenant: "Ashley Furniture",
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
    tenant: "MINT Boutique",
    leaseEnds: "Dic 2026",
    portalActivity: "Baja · 34%",
    risk: "red",
    note: "Afluencia -6%, sin respuesta a la propuesta de renovación.",
  },
];

export const HUB_INTRO = {
  title: "Tu operación, en orden.",
  lead: "Bienvenido al Tenant Hub. Aquí resuelves todo con la administración en un solo lugar — nada de mensajes perdidos ni cadenas de WhatsApp. Elige una acción para empezar.",
  note: "Reemplaza el WhatsApp personal del arrendador con solicitudes trazables",
} as const;
