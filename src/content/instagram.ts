/**
 * Instagram — @lagranviamxl
 *
 * El feed en vivo se obtiene con la Instagram Graph API (ver src/lib/instagram.ts).
 * Sin credenciales, la sección cae a `CURATED_POSTS`; si esa lista está vacía,
 * se muestra únicamente la tarjeta de "Síguenos".
 */

export const INSTAGRAM = {
  handle: "lagranviamxl",
  profileUrl: "https://www.instagram.com/lagranviamxl/",
  /** Cuántas publicaciones mostrar en la retícula. */
  limit: 8,
} as const;

export type CuratedPost = {
  /** Enlace permanente a la publicación. */
  permalink: string;
  /** Imagen local bajo /public/instagram — descárgala desde la publicación. */
  image: string;
  /** Texto alternativo descriptivo, en español. */
  alt: string;
  isVideo?: boolean;
};

/**
 * Respaldo curado, usado solo cuando no hay token configurado.
 *
 * TODO(contenido-real): para activarlo sin API, guarda las imágenes en
 * /public/instagram y agrega aquí su permalink + alt. Con token configurado
 * esta lista se ignora.
 */
export const CURATED_POSTS: CuratedPost[] = [];
