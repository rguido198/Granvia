import type { Metadata } from "next";
import { RACE } from "@/content/events";
import { SITE } from "@/content/site";
import { EventsFeed } from "@/components/events-feed";
import {
  Container,
  ImagePlaceholder,
  Kicker,
  PageFade,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Eventos",
  description: `${RACE.name} ${RACE.year}: 5K y 10K por el corazón de la plaza, música en vivo y un pasaporte digital con promociones en los negocios participantes.`,
};

/** Event structured data so the race can surface in search results. */
function raceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${RACE.name} ${RACE.year}`,
    startDate: RACE.dateISO,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    description: RACE.lead,
    location: {
      "@type": "Place",
      name: SITE.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: SITE.city,
        addressRegion: SITE.state,
        addressCountry: "MX",
      },
    },
    organizer: { "@type": "Organization", name: SITE.name, url: SITE.url },
  };
}

export default function EventsPage() {
  return (
    <PageFade>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(raceJsonLd()) }}
      />

      {/* ---------------- Featured Events Grid ---------------- */}
      <EventsFeed showLink={false} />

      {/* ---------------- Race hero ---------------- */}
      <section className="bg-ink text-sand-100" id="registro" aria-labelledby="carrera-titulo">
        <Container className="py-14 sm:py-18">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <Kicker accent="gold" className="mb-5 tracking-[0.26em]">
                {RACE.kicker}
              </Kicker>
              <h1
                id="carrera-titulo"
                className="mb-5 font-display text-[clamp(2.75rem,6.5vw,4rem)] leading-[0.98] font-semibold"
              >
                Carrera
                <br />
                {SITE.name} <span className="text-gold">{RACE.year}</span>
              </h1>
              <p className="mb-3 max-w-[420px] text-[17px] text-dune-200">
                {RACE.lead}
              </p>
              <p className="mb-7 max-w-[420px] text-[15px] text-dune-300">
                {RACE.when}
              </p>
              <a
                href={RACE.registrationUrl}
                className="inline-flex rounded-xs border border-terra bg-terra px-7 py-[15px] text-[15px] font-semibold text-sand-100 transition-colors hover:border-terra-dark hover:bg-terra-dark hover:text-sand-100"
              >
                {RACE.cta}
              </a>
            </div>
            <ImagePlaceholder
              label={RACE.imageLabel}
              src={RACE.image}
              tone="dark"
              className="order-first h-56 sm:h-80 lg:order-none lg:h-[380px]"
            />
          </div>
        </Container>
      </section>
    </PageFade>
  );
}
