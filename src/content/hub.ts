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

export const HUB_INTRO = {
  title: "Tu operación, en orden.",
  lead: "Bienvenido al Tenant Hub. Aquí resuelves todo con la administración en un solo lugar — nada de mensajes perdidos ni cadenas de WhatsApp. Elige una acción para empezar.",
  note: "Reemplaza el WhatsApp personal del arrendador con solicitudes trazables",
} as const;
