/**
 * Leasing page — "Crece Tu Negocio".
 *
 * The comp shows the prospect a live preview of the automation that fires
 * after they submit. Lease duration drives the whole branch: pop-up terms get
 * a self-serve PDF guide, anything longer gets a scheduled call.
 *
 * TODO(contenido-real): confirm the real business categories, lease bands and
 * follow-up cadence with the leasing team before these emails go live.
 */

export type BusinessCategory = string;

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  "Restaurante / Gastronomía",
  "Moda & Boutiques",
  "Salud & Bienestar",
  "Servicios & Corporativo",
  "Entretenimiento & Hoteles",
];

export type LeaseKey = "short" | "mid" | "long";

export type LeaseOption = {
  key: LeaseKey;
  label: string;
  /** All commercial retail inquiries trigger a scheduled call & proposal. */
  branch: "call";
};

export const LEASE_OPTIONS: LeaseOption[] = [
  { key: "short", label: "Corto plazo · 6 a 12 meses", branch: "call" },
  { key: "mid", label: "Mediano plazo · 1 a 3 años", branch: "call" },
  { key: "long", label: "Contrato Ancla · 3 a 5+ años", branch: "call" },
];

export const LEASE_KEYS = LEASE_OPTIONS.map((option) => option.key);

export function branchFor(key: LeaseKey): "call" {
  return "call";
}

export type FollowUp = { when: string; text: string };

export const FOLLOW_UPS: Record<"call", FollowUp[]> = {
  call: [
    {
      when: "t+0 min",
      text: "Correo con Ficha Técnica de Arrendamiento en PDF y enlace para agendar llamada.",
    },
    {
      when: "Día 1",
      text: "Al completar el perfil comercial, el Agente crea la ficha del prospecto en el ERP.",
    },
    {
      when: "Post-llamada",
      text: "Borrador de contrato de arrendamiento pre-generado según giro y m².",
    },
  ],
};

/** Fields collected in the commercial tenant profile questionnaire. */
export const PROFILE_FIELDS = [
  "Años de operación",
  "Ventas anuales est.",
  "Sucursales actuales",
  "Inversión en fit-out",
  "Concepto / marca",
  "Referencias comerciales",
];

export const GUIDE_PDF = {
  filename: "Ficha_Tecnica_Arrendamiento_LaGranVia.pdf",
  meta: "Planos de planta · Especificaciones técnicas · Requisitos · 12 págs",
} as const;

export const LEASING_HERO = {
  kicker: "CRECE TU NEGOCIO",
  title: "El lugar donde tu marca encuentra a su gente.",
  lead: "Más de 70 negocios ya crecen aquí, con miles de visitas cada fin de semana. Buscamos conceptos que suban el nivel de la plaza — no solo llenar un local.",
  support:
    "Cuéntanos qué necesitas y en menos de 5 minutos recibirás por correo la información y los siguientes pasos para tu tipo de espacio. Sin llamadas de venta, sin rodeos.",
} as const;
