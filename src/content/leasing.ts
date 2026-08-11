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

export type LeaseKey = "standard" | "mid" | "long";

export type LeaseOption = {
  key: LeaseKey;
  label: string;
  /** All commercial retail inquiries trigger a scheduled call & proposal. */
  branch: "call";
};

export const LEASE_OPTIONS: LeaseOption[] = [
  { key: "standard", label: "1 a 3 años", branch: "call" },
  { key: "mid", label: "3 a 5 años", branch: "call" },
  { key: "long", label: "5+ años (Ancla)", branch: "call" },
];

export const LEASE_KEYS = LEASE_OPTIONS.map((option) => option.key);

export function branchFor(_key: LeaseKey): "call" {
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

/**
 * AI Leasing Agent — demo scenarios & screening rules.
 *
 * Pre-fills for the two live-demo buttons on the leasing form, plus the
 * lightweight rule set the "AI Thinking Terminal" evaluates against. This is
 * a sales-demo simulation, not a real exclusivity registry.
 */
export type LeasingScenario = {
  key: "rival" | "healthy";
  label: string;
  sublabel: string;
  nombre: string;
  telefono: string;
  correo: string;
  giro: BusinessCategory;
  metros: number;
  duracion: LeaseKey;
};

export const LEASING_SCENARIOS: LeasingScenario[] = [
  {
    key: "rival",
    label: "Boutique de moda rival a ZARA",
    sublabel: "Match bajo · posible conflicto de exclusividad",
    nombre: "Valeria Ponce",
    telefono: "686 234 5566",
    correo: "valeria@modaurbana.mx",
    giro: "Moda & Boutiques",
    metros: 75,
    duracion: "standard",
  },
  {
    key: "healthy",
    label: "Barra de jugos & café orgánico",
    sublabel: "Match alto · sin conflictos detectados",
    nombre: "Diego Salcido",
    telefono: "686 778 9012",
    correo: "diego@barraverde.mx",
    giro: "Restaurante / Gastronomía",
    metros: 120,
    duracion: "mid",
  },
];

/** Giros con cláusula de uso exclusivo activa — motor de reglas del demo. */
export const EXCLUSIVE_USE_CLAUSES: Partial<Record<BusinessCategory, { tenant: string; local: string }>> = {
  "Moda & Boutiques": { tenant: "ZARA Mexicali", local: "Local B-12" },
};

export const AI_TERMINAL_STEPS = [
  "Comparando el giro contra los más de 70 negocios que ya están en la plaza…",
  "Revisando si algún inquilino tiene exclusividad sobre esta categoría…",
  "Confirmando que el espacio y el giro sean compatibles…",
] as const;

/**
 * Match-score rules for giros sin conflicto de exclusividad.
 *
 * Keyed off `BUSINESS_CATEGORIES`, not string-literal `if`s in the
 * component — a giro missing from `categoryBonus` just gets no bonus
 * (correct, boring default) instead of the component silently failing to
 * recognize a category it was never told about.
 */
export const SCORING_RULES = {
  base: 70,
  categoryBonus: {
    "Restaurante / Gastronomía": 14,
    "Salud & Bienestar": 10,
  } as Partial<Record<BusinessCategory, number>>,
  metrosBonus: { min: 80, max: 180, amount: 8 },
  nonShortDurationBonus: 6,
  cap: 96,
} as const;

export const LEASING_HERO = {
  kicker: "CRECE TU NEGOCIO",
  title: "El lugar donde tu marca encuentra a su gente.",
  lead: "Más de 70 negocios ya crecen aquí, con miles de visitas cada fin de semana. Buscamos conceptos que suban el nivel de la plaza — no solo llenar un local.",
  support:
    "Cuéntanos qué necesitas y en menos de 5 minutos recibirás por correo la información y los siguientes pasos para tu tipo de espacio. Sin llamadas de venta, sin rodeos.",
} as const;
