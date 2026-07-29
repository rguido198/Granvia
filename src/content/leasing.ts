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
  "Restaurante / Bar",
  "Moda & Retail",
  "Belleza & Bienestar",
  "Fitness",
  "Servicios",
  "Pop-Up / Temporal",
];

export type LeaseKey = "popup" | "short" | "mid" | "long";

export type LeaseOption = {
  key: LeaseKey;
  label: string;
  /** Which post-submit automation this duration triggers. */
  branch: "guide" | "call";
};

export const LEASE_OPTIONS: LeaseOption[] = [
  { key: "popup", label: "Pop-Up · 1 a 3 meses", branch: "guide" },
  { key: "short", label: "Corto plazo · 4 a 6 meses", branch: "call" },
  { key: "mid", label: "Mediano plazo · 6 a 12 meses", branch: "call" },
  { key: "long", label: "Largo plazo · 12+ meses", branch: "call" },
];

export const LEASE_KEYS = LEASE_OPTIONS.map((option) => option.key);

export function branchFor(key: LeaseKey): "guide" | "call" {
  return LEASE_OPTIONS.find((option) => option.key === key)?.branch ?? "call";
}

export type FollowUp = { when: string; text: string };

export const FOLLOW_UPS: Record<"guide" | "call", FollowUp[]> = {
  guide: [
    {
      when: "t+0 min",
      text: "Correo automático con la Guía Pop-Up PDF y botón de reserva.",
    },
    {
      when: "Día 2",
      text: 'Recordatorio si no reservó: "¿Aún te interesa el espacio pop-up?"',
    },
    {
      when: "Día 5",
      text: "Se archiva como lead frío — cero seguimiento manual del equipo.",
    },
  ],
  call: [
    {
      when: "t+0 min",
      text: "Correo con enlace para agendar llamada y perfil de negocio.",
    },
    {
      when: "Día 1",
      text: "Al completar el perfil, se crea la ficha del prospecto para el equipo.",
    },
    {
      when: "Post-llamada",
      text: "Contrato base pre-generado según giro y m² — listo para revisar.",
    },
  ],
};

/** The three pre-approved sections inside the pop-up PDF. */
export const GUIDE_CONTENTS = [
  {
    n: "01",
    title: "Requisitos físicos.",
    text: "Medidas, energía, límites de fit-out y qué NO se permite instalar.",
  },
  {
    n: "02",
    title: "Reglas de seguro.",
    text: "Póliza mínima y cómo enviarla antes de abrir.",
  },
  {
    n: "03",
    title: "Precios estándar.",
    text: "Tarifas fijas por m² y depósito — sin negociación caso por caso.",
  },
];

/** Fields collected in the long-term tenant profile questionnaire. */
export const PROFILE_FIELDS = [
  "Años operando",
  "Ventas anuales est.",
  "Otras sucursales",
  "Inversión en fit-out",
  "Concepto / marca",
  "Referencias",
];

export const GUIDE_PDF = {
  filename: "Guía_PopUp_LaGranVia.pdf",
  meta: "Requisitos físicos · Seguro · Precios · 8 págs",
} as const;

export const LEASING_HERO = {
  kicker: "CRECE TU NEGOCIO",
  title: "El lugar donde tu marca encuentra a su gente.",
  lead: "Más de 70 negocios ya crecen aquí, con miles de visitas cada fin de semana. Buscamos conceptos que suban el nivel de la plaza — no solo llenar un local.",
  support:
    "Cuéntanos qué necesitas y en menos de 5 minutos recibirás por correo la información y los siguientes pasos para tu tipo de espacio. Sin llamadas de venta, sin rodeos.",
} as const;
