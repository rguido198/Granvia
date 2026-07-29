/**
 * Site-wide identity, contact points and navigation.
 *
 * TODO(contenido-real): replace the placeholder domain, emails and tenant
 * count with the live values before launch.
 */

export const SITE = {
  name: "La Gran Vía",
  city: "Mexicali",
  state: "B.C.",
  tagline: "Plaza Lifestyle",
  url: "https://lagranvia.com.mx",
  tenantHubUrl: "https://inquilinos.lagranvia.com.mx",
  description:
    "Hoteles, mesa, moda, bienestar y cultura conviven en un mismo lugar. Arma tu plan y descubre por qué Mexicali se reúne en La Gran Vía.",
  /** Conteo real: se deriva de TENANTS.length; ver src/content/tenants.ts. */
  emails: {
    leasing: "leasing@lagranvia.com.mx",
    noReply: "no-reply@lagranvia.com.mx",
    race: "carrera@lagranvia.com.mx",
    support: "soporte@lagranvia.com.mx",
  },
} as const;

export type NavItem = {
  href: string;
  label: string;
};

export const NAV: NavItem[] = [
  { href: "/", label: "Vive Un Gran Día" },
  { href: "/directorio", label: "Directorio" },
  { href: "/crece-tu-negocio", label: "Crece Tu Negocio" },
  { href: "/eventos", label: "Eventos & Carrera" },
];

export const SOCIAL = {
  instagram: "https://www.instagram.com/lagranviamxl/",
  instagramHandle: "lagranviamxl",
} as const;

export const HUB_NAV: NavItem = { href: "/inquilinos", label: "Tenant Hub" };
