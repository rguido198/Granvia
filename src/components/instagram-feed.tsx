import Image from "next/image";
import { INSTAGRAM } from "@/content/instagram";
import { getInstagramPosts } from "@/lib/instagram";
import { Container, Kicker, SectionTitle } from "@/components/ui";

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <span
      aria-hidden="true"
      className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/55 backdrop-blur-sm"
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3 translate-x-px" fill="#F5EFE4">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}

/** Tarjeta de seguimiento — cierra la retícula y es el respaldo sin API. */
function FollowCard({ standalone = false }: { standalone?: boolean }) {
  return (
    <a
      href={INSTAGRAM.profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col items-center justify-center gap-3 rounded-sm border border-hairline bg-sand-200 p-6 text-center transition-colors hover:border-terra hover:bg-sand-50 ${
        standalone ? "aspect-auto py-12" : "aspect-square"
      }`}
    >
      <InstagramGlyph className="h-7 w-7 text-terra" />
      <span className="font-display text-xl leading-tight font-semibold text-ink">
        @{INSTAGRAM.handle}
      </span>
      <span className="text-[13px] text-ink-500">
        Síguenos para promos, eventos y lo que abre cada semana.
      </span>
      <span className="mt-1 text-sm font-semibold text-terra">
        Seguir{" "}
        <span className="inline-block transition-transform group-hover:translate-x-1">
          →
        </span>
      </span>
    </a>
  );
}

export async function InstagramFeed() {
  const { posts, source } = await getInstagramPosts();

  return (
    <section
      className="border-t border-hairline bg-sand-100"
      aria-labelledby="instagram-titulo"
    >
      <Container className="py-14 sm:py-18">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Kicker className="mb-3.5 tracking-[0.24em]">
              En vivo desde Instagram
            </Kicker>
            <SectionTitle id="instagram-titulo">
              Lo que está pasando hoy
            </SectionTitle>
          </div>
          <a
            href={INSTAGRAM.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-terra"
          >
            <InstagramGlyph className="h-4.5 w-4.5" />
            @{INSTAGRAM.handle}
            <span aria-hidden="true">→</span>
          </a>
        </div>

        {source === "empty" ? (
          <FollowCard standalone />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {posts.map((post) => (
              <li key={post.id}>
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-square overflow-hidden rounded-sm border border-hairline bg-sand-200"
                >
                  <Image
                    src={post.image}
                    alt={post.alt}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                  {post.isVideo && <PlayGlyph />}
                  <span className="absolute inset-0 bg-ink/0 transition-colors group-hover:bg-ink/12" />
                </a>
              </li>
            ))}
            <li>
              <FollowCard />
            </li>
          </ul>
        )}
      </Container>
    </section>
  );
}
