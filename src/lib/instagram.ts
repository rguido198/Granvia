import { CURATED_POSTS, INSTAGRAM } from "@/content/instagram";

export type InstagramPost = {
  id: string;
  permalink: string;
  /** Ya resuelta al frame correcto para videos. */
  image: string;
  alt: string;
  isVideo: boolean;
  /** ISO timestamp, ausente en el respaldo curado. */
  timestamp?: string;
};

/** Cómo se resolvió el feed — se usa para decidir qué avisar en el UI. */
export type InstagramResult = {
  posts: InstagramPost[];
  source: "api" | "curated" | "empty";
};

type GraphMedia = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp?: string;
};

const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";

/**
 * Convierte el caption en texto alternativo utilizable.
 * Instagram no expone alt real, así que usamos la primera frase del caption
 * y caemos a una descripción genérica cuando no hay texto.
 */
function altFrom(caption: string | undefined, isVideo: boolean) {
  const clean = (caption ?? "")
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) {
    return `${isVideo ? "Video" : "Publicación"} de @${INSTAGRAM.handle} en Instagram`;
  }
  const firstSentence = clean.split(/(?<=[.!?])\s/)[0];
  return firstSentence.length > 160
    ? `${firstSentence.slice(0, 157)}…`
    : firstSentence;
}

function curated(): InstagramResult {
  if (CURATED_POSTS.length === 0) return { posts: [], source: "empty" };
  return {
    source: "curated",
    posts: CURATED_POSTS.slice(0, INSTAGRAM.limit).map((p, i) => ({
      id: `curated-${i}`,
      permalink: p.permalink,
      image: p.image,
      alt: p.alt,
      isVideo: p.isVideo ?? false,
    })),
  };
}

/**
 * Trae las publicaciones recientes de @lagranviamxl.
 *
 * Requiere INSTAGRAM_ACCESS_TOKEN (token de larga duración de la Instagram
 * Graph API). Sin token —o si la API falla— degrada al respaldo curado en
 * lugar de romper la página: el feed social nunca debe tumbar el sitio.
 *
 * Las URLs del CDN de Instagram vienen firmadas y caducan, por eso
 * revalidamos cada hora en lugar de cachear indefinidamente.
 */
export async function getInstagramPosts(): Promise<InstagramResult> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return curated();

  // Sobrescribible para pruebas locales y staging; en producción se omite.
  const base = process.env.INSTAGRAM_API_BASE ?? "https://graph.instagram.com";
  const url = new URL("/me/media", base);
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("limit", String(INSTAGRAM.limit));
  url.searchParams.set("access_token", token);

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600, tags: ["instagram"] },
    });

    if (!res.ok) {
      // El cuerpo del error trae el token — nunca lo registres completo.
      console.error(
        `[instagram] la API respondió ${res.status} ${res.statusText}`,
      );
      return curated();
    }

    const json = (await res.json()) as { data?: GraphMedia[] };
    const posts = (json.data ?? [])
      .map((m): InstagramPost | null => {
        const isVideo = m.media_type === "VIDEO";
        // Los videos solo tienen thumbnail_url; los álbumes usan la portada.
        const image = isVideo ? m.thumbnail_url : m.media_url;
        if (!image) return null;
        return {
          id: m.id,
          permalink: m.permalink,
          image,
          alt: altFrom(m.caption, isVideo),
          isVideo,
          timestamp: m.timestamp,
        };
      })
      .filter((p): p is InstagramPost => p !== null);

    return posts.length > 0 ? { posts, source: "api" } : curated();
  } catch (error) {
    console.error("[instagram] no se pudo obtener el feed", error);
    return curated();
  }
}
