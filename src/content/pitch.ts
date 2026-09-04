/**
 * "Propuesta" — the client-facing pitch deck at /propuesta.
 *
 * A link-only presentation, not a site fixture — it's meant to be sent
 * directly to one prospect, not discovered through nav. The whole deck
 * exists to defuse one specific worry: that this reads as "we redesigned
 * your website" instead of "we're proposing a team." Slide 2 says so
 * outright; every other slide backs that claim up.
 *
 * Agent copy (slides 4–6) is intentionally the same as content/team.ts —
 * this deck and /equipo-ia are two doors into the same pitch.
 */

export const PITCH_COVER = {
  eyebrow: "PROPUESTA · JULIO 2026",
  title: "Tu nuevo equipo.",
  lead: "Una propuesta para La Gran Vía, preparada por Technology Consultants.",
} as const;

export const PITCH_THESIS = {
  eyebrow: "ANTES DE EMPEZAR",
  title: "Esto no es un rediseño.",
  lead: "El sitio se ve igual. Lo que te estamos proponiendo es lo que pasa detrás de él.",
  caption: "Mismo sitio. Misma marca. Un equipo nuevo trabajando adentro.",
  urlBefore: "lagranvia.com.mx",
  labelBefore: "Hoy",
  urlAfter: "granvia.technologyconsultants.ai",
  labelAfter: "La propuesta",
  badge: "+ Equipo de IA",
} as const;

export const PITCH_COST = {
  eyebrow: "LO QUE TE ESTÁ COSTANDO HOY",
  title: "Tu tiempo, en tareas que se repiten.",
  items: [
    { tag: "Renta", text: "Cada solicitud de local, revisada a mano — a veces después de haber dicho que sí." },
    { tag: "Mantenim.", text: "Cada falla de aire acondicionado, un mensaje a tu WhatsApp personal." },
    { tag: "CAM", text: "Cada mes, horas en Excel dividiendo los gastos comunes entre 84 locales." },
    { tag: "Contratos", text: "Cada renovación por vencer, una alarma que pusiste tú, para no olvidarla tú." },
  ],
  close: "Ninguna de estas tareas necesita que seas tú quien las haga.",
} as const;

export const PITCH_TOGETHER = {
  eyebrow: "CUANDO TRABAJAN JUNTOS",
  title: "Esto es lo que ves tú cada mañana.",
  lead: "Mariana, Diego y Renata no trabajan solos — todo lo que hacen se junta en un solo panel para ti.",
  outcomes: ["Recuperas tus tardes.", "Duermes sin el teléfono junto a la almohada.", "El CAM cuadra solo, cada mes."],
} as const;

export const PITCH_DEMO = {
  eyebrow: "VÁMOSLO A VER",
  title: "Conócelos en vivo.",
  lead: "Cada agente de esta propuesta funciona de verdad. Vamos a probarlos juntos, ahora mismo.",
  ctaLabel: "Abrir la demo en vivo",
  url: "https://granvia.technologyconsultants.ai/equipo-ia",
  urlLabel: "granvia.technologyconsultants.ai/equipo-ia",
} as const;

export const PITCH_CLOSE = {
  eyebrow: "SIGUIENTE PASO",
  title: "¿Le damos la bienvenida a tu equipo?",
  lead: "Esto es solo el principio de lo que Mariana, Diego y Renata pueden hacer por La Gran Vía.",
  creditLabel: "Propuesta preparada por",
  creditName: "Technology Consultants",
  creditUrl: "https://technologyconsultants.ai",
  creditEmail: "roberto@technologyconsultants.ai",
} as const;
