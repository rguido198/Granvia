/**
 * Events page — Carrera La Gran Vía and the Pasaporte Digital.
 *
 * TODO(contenido-real): the race date, distances and participating-tenant
 * offers are placeholders from the concept comp. Confirm with the events team
 * and update `RACE.dateISO` so the structured data stays accurate.
 */

export const RACE = {
  kicker: "EVENTOS · COMUNIDAD",
  name: "Carrera La Gran Vía",
  year: "2026",
  lead: '5K y 10K por el corazón de la plaza, más "Una Banca en el Desierto" y música en vivo todo el día.',
  /** Human-readable, as shown in the comp. */
  when: "Domingo 18 de octubre · 7:00 AM · Salida frente al hotel.",
  /** Machine-readable, for JSON-LD and any countdown. */
  dateISO: "2026-10-18T07:00:00-07:00",
  cta: "Regístrate a la Carrera",
  /** Point the CTA at the real registration platform when it exists. */
  registrationUrl: "#registro",
  imageLabel: "Corredores al amanecer en la Carrera La Gran Vía",
  image: "/photos/carrera-5k.png" as string | null,
} as const;

export const PASSPORT = {
  kicker: "NUEVO · PASAPORTE DIGITAL",
  title: "Pasaporte Carrera La Gran Vía",
  lead: "Al registrarte, se desbloquea al instante un pasaporte digital en tu teléfono — cargado con promociones por tiempo limitado en tiendas, restaurantes y spas participantes. Corres, y la plaza te premia.",
  /** Sample wallet shown inside the phone mockup. */
  holder: { id: "#1042", name: "Ana R." },
  validity: "Válidos del 11 al 25 de octubre.",
} as const;

export type PassportOffer = {
  tenant: string;
  offer: string;
  /** ACTIVO = redeemable now, HOY = expires today. */
  status: "ACTIVO" | "HOY";
  code: string;
};

export const PASSPORT_OFFERS: PassportOffer[] = [
  {
    tenant: "MINT Boutique",
    offer: "-20% en temporada",
    status: "ACTIVO",
    code: "MINT-CARR20",
  },
  {
    tenant: "Derma Club",
    offer: "Facial de regalo",
    status: "ACTIVO",
    code: "DERMA-FREE",
  },
  {
    tenant: "Rooftop La Vía",
    offer: "2x1 en bebidas",
    status: "HOY",
    code: "ROOFTOP-2X1",
  },
];

export type PassportStep = { n: string; title: string; desc: string };

export const PASSPORT_FLOW: PassportStep[] = [
  {
    n: "1",
    title: "El participante se registra",
    desc: "Al inscribirse a la Carrera, acepta activar su pasaporte digital.",
  },
  {
    n: "2",
    title: "Recibe su correo con vouchers",
    desc: "Códigos de promoción por cada negocio participante, listos en su teléfono.",
  },
  {
    n: "3",
    title: "Canjea en sitio vía QR",
    desc: "El comercio escanea el código del pasaporte al momento de pagar.",
  },
  {
    n: "4",
    title: "El tenant registra la venta",
    desc: "Cada canje queda medido — prueba real de que la Carrera genera ventas.",
  },
];
