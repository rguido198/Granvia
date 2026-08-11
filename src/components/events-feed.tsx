import Image from "next/image";
import Link from "next/link";
import { Container, Kicker, SectionTitle } from "@/components/ui";

const FEATURED_EVENTS = [
  {
    id: "carrera-2026",
    tag: "EVENTO PRINCIPAL · OCTUBRE 2026",
    title: "Carrera La Gran Vía 2026",
    desc: "5K y 10K por el corazón de la plaza, música en vivo todo el día y Pasaporte Digital de promociones.",
    image: "/photos/carrera-5k.png",
    date: "Dom 18 Oct · 7:00 AM",
    href: "#registro",
    badge: "5K / 10K",
    cta: "Regístrate",
  },
  {
    id: "pasaporte-digital",
    tag: "PROMOCIONES · COMUNIDAD",
    title: "Pasaporte Digital de Descuentos",
    desc: "Al registrarte en nuestros eventos, desbloqueas cupones exclusivos en restaurantes, tiendas y spas participantes.",
    image: "/photos/plaza-hotel-restaurantes.jpg",
    date: "Exclusivo Corredores",
    href: "#pasaporte-titulo",
    badge: "Pasaporte QR",
    cta: "Ver Beneficios",
  },
  {
    id: "banca-desierto",
    tag: "ARTE & CULTURA · PERMANENTE",
    title: "Una Banca en el Desierto",
    desc: "Instalación artística y punto de encuentro icónico de la plaza. Fotografía, cultura e identidad de Mexicali.",
    image: "/photos/banca-desierto.png",
    date: "Todos los Días",
    href: "/eventos",
    badge: "Arte & Cultura",
    cta: "Conocer Más",
  },
  {
    id: "tardes-musica",
    tag: "MÚSICA & AMBIENTE · FIN DE SEMANA",
    title: "Música en Vivo & Noches de Fuente",
    desc: "Disfruta de shows al aire libre, iluminación arquitectónica y el mejor ambiente familiar en la terraza principal.",
    image: "/photos/fuente-inauguracion.jpg",
    date: "Vie & Sáb · 7:00 PM",
    href: "/eventos",
    badge: "En Vivo",
    cta: "Ver Agenda",
  },
];

export function EventsFeed({ showLink = true }: { showLink?: boolean }) {
  return (
    <section
      className="border-t border-hairline bg-sand-100"
      aria-labelledby="eventos-feed-titulo"
    >
      <Container className="py-12 sm:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Kicker className="mb-3 tracking-[0.24em]">
              Eventos & Vida en la Plaza
            </Kicker>
            <SectionTitle id="eventos-feed-titulo">
              Lo que está pasando en La Gran Vía
            </SectionTitle>
          </div>
          {showLink && (
            <Link
              href="/eventos"
              className="inline-flex items-center gap-2 text-sm font-semibold text-terra hover:underline"
            >
              Ver todos los eventos
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_EVENTS.map((event) => (
            <li key={event.id} className="flex">
              <Link
                href={event.href}
                className="group flex flex-col justify-between overflow-hidden rounded-xl border border-hairline bg-sand-50 transition-all hover:border-terra hover:shadow-md w-full"
              >
                <div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand-200">
                    <Image
                      src={event.image}
                      alt={event.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                    <span className="absolute top-3 right-3 rounded-full bg-ink/80 backdrop-blur-xs px-2.5 py-1 font-mono text-[10px] font-bold text-sand-100 uppercase tracking-wider">
                      {event.badge}
                    </span>
                  </div>
                  <div className="p-4.5 space-y-2">
                    <span className="block font-mono text-[10px] font-bold text-terra uppercase tracking-wider">
                      {event.tag}
                    </span>
                    <h3 className="font-display text-lg font-bold text-ink leading-tight group-hover:text-terra transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-xs text-ink-500 leading-relaxed line-clamp-2">
                      {event.desc}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-3.5 pt-2.5 border-t border-hairline flex items-center justify-between font-mono text-[11px] gap-2">
                  <span className="text-ink-400 truncate">
                    📍 {event.date}
                  </span>
                  <span className="font-bold text-terra group-hover:translate-x-0.5 transition-transform shrink-0">
                    {event.cta} →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
