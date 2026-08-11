/**
 * Home page content — hero, the three "Arma tu plan del día" pillars and
 * their venues, plus the newest tenants.
 *
 * TODO(contenido-real): venue and tenant names below come from the concept
 * comp. Swap in the real directory, and replace every `image: null` with a
 * path under /public once photography is available.
 */

import { TENANTS } from "./tenants";

export type Venue = {
  name: string;
  tag: string;
  /** Optional deep link to a tenant detail page or the tenant's own site. */
  href?: string;
};

export type Pillar = {
  key: string;
  /** Spanish label, shown in mono caps. */
  kicker: string;
  /** English counterpart, shown after the middot. */
  en: string;
  title: string;
  desc: string;
  /** Accent used for the kicker when the tab is not selected. */
  accent: "terra" | "pine" | "gold";
  venues: Venue[];
};

export const PILLARS: Pillar[] = [
  {
    key: "prueba",
    kicker: "PRUEBA",
    en: "Taste",
    title: "Gastronomía & buena vida",
    desc: "Restaurantes, cafés y bares para cada antojo.",
    accent: "terra",
    venues: [
      { name: "Cantina Mezcalería", tag: "Coctelería de agave" },
      { name: "Brasa & Leña", tag: "Steakhouse" },
      { name: "Café de Olla", tag: "Desayuno todo el día" },
      { name: "Hana Nikkei", tag: "Sushi & ramen" },
      { name: "Rooftop La Vía", tag: "Bar & tapas" },
      { name: "Trattoria", tag: "Pasta artesanal" },
    ],
  },
  {
    key: "consiente",
    kicker: "CONSIÉNTETE",
    en: "Pamper",
    title: "Bienestar & belleza",
    desc: "Fitness, spa y estética para reconectar.",
    accent: "pine",
    venues: [
      { name: "Studio Move", tag: "Fitness & cycling" },
      { name: "Derma Club", tag: "Dermatología estética" },
      { name: "Nube Spa", tag: "Masaje & facial" },
      { name: "Barbería Norte", tag: "Grooming" },
      { name: "Yoga Loft", tag: "Vinyasa & meditación" },
      { name: "Estética MINT", tag: "Uñas & beauty" },
    ],
  },
  {
    key: "visita",
    kicker: "VISITA",
    en: "Explore",
    title: "Cultura & retail",
    desc: "Cine, hoteles y tiendas para explorar.",
    accent: "gold",
    venues: [
      { name: "Cinema La Vía", tag: "Salas premium" },
      { name: "Hotel Boutique", tag: "Hospedaje" },
      { name: "Ashley", tag: "Muebles & hogar" },
      { name: "MINT Boutique", tag: "Moda mujer" },
      { name: "Librería Sonora", tag: "Libros & café" },
      { name: "Óptica Visión", tag: "Lentes & examen" },
    ],
  },
];

export type NewTenant = {
  name: string;
  cat: string;
  copy: string;
  /** Alt text / placeholder caption until real photography lands. */
  imageLabel: string;
  image: string | null;
};

export const NEW_TENANTS: NewTenant[] = [
  {
    name: "Ashley",
    cat: "Muebles & Hogar",
    copy: "Estrena sala este fin de semana. Diseño que transforma tu casa desde el primer día.",
    imageLabel: "Showroom de sala en Ashley",
    image: "/photos/ashley.png",
  },
  {
    name: "Derma Club",
    cat: "Piel & Bienestar",
    copy: "Primera valoración dermatológica sin costo. Tu mejor piel empieza con una visita.",
    imageLabel: "Clínica dermatológica de Derma Club",
    image: "/photos/derma-club.png",
  },
  {
    name: "MINT Boutique",
    cat: "Moda Mujer",
    copy: "Nuevos looks cada semana. Pasa por tu outfit de temporada antes de que vuele.",
    imageLabel: "Vitrina de moda en MINT Boutique",
    image: "/photos/mint-boutique.jpg",
  },
];

export const HERO = {
  // Se deriva del directorio real para que el número nunca quede desfasado.
  kicker: `PLAZA LIFESTYLE · ${TENANTS.length} EXPERIENCIAS`,
  titleLead: "Vive un gran día,",
  titleEm: "cada día.",
  body: "Hoteles, gastronomía, moda, bienestar y cultura conviven en un mismo lugar. Arma tu plan y descubre por qué Mexicali se reúne aquí.",
  imageLabel: "La plaza al atardecer, golden hour",
  image: "/photos/hero-gran-via.jpg" as string | null,
} as const;
