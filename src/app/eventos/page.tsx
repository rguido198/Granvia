import type { Metadata } from "next";
import {
  PASSPORT,
  PASSPORT_FLOW,
  PASSPORT_OFFERS,
  RACE,
} from "@/content/events";
import { SITE } from "@/content/site";
import { PassportPhone } from "@/components/events/passport-phone";
import {
  Container,
  ImagePlaceholder,
  Kicker,
  MonoNote,
  PageFade,
  SectionTitle,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Eventos & Carrera",
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

      {/* ---------------- Race hero ---------------- */}
      <section className="bg-ink text-sand-100" aria-labelledby="carrera-titulo">
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

      {/* ---------------- Digital passport ---------------- */}
      <section aria-labelledby="pasaporte-titulo">
        <Container className="py-16 sm:py-19">
          <div className="mx-auto mb-12 max-w-[620px] text-center">
            <Kicker className="mb-4 tracking-[0.22em]">{PASSPORT.kicker}</Kicker>
            <SectionTitle
              id="pasaporte-titulo"
              className="mb-4.5 text-[clamp(2.25rem,5vw,3.25rem)]!"
            >
              {PASSPORT.title}
            </SectionTitle>
            <p className="text-[17px] text-ink-500">{PASSPORT.lead}</p>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <PassportPhone />

            <div>
              <Kicker accent="pine" className="mb-4.5 tracking-[0.2em]">
                El loop · de la carrera a la venta
              </Kicker>

              <ol className="mb-7 grid gap-3.5">
                {PASSPORT_FLOW.map((step) => (
                  <li
                    key={step.n}
                    className="flex items-start gap-4.5 rounded-md border border-hairline bg-sand-100 px-4.5 py-4"
                  >
                    <span
                      aria-hidden="true"
                      className="w-8.5 flex-none font-display text-[30px] leading-none font-bold text-terra"
                    >
                      {step.n}
                    </span>
                    <span>
                      <span className="mb-0.5 block text-[15px] font-semibold">
                        {step.title}
                      </span>
                      <span className="block text-[13.5px] text-ink-500">
                        {step.desc}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              {/* Confirmation email mock */}
              <div className="overflow-hidden rounded-lg border border-hairline bg-sand-50 shadow-[0_10px_30px_-20px_rgba(33,31,28,0.5)]">
                <div className="flex flex-wrap justify-between gap-2 bg-ink px-4 py-2.75 text-dune-100">
                  <span className="font-mono text-[10.5px] tracking-[0.08em]">
                    EMAIL · CONFIRMACIÓN DE REGISTRO
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: "<!--email_off-->" }} />
                  <span className="font-mono text-[10.5px] text-gold">
                    {SITE.emails.race}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: "<!--/email_off-->" }} />
                </div>
                <div className="p-4.5">
                  <p className="mb-2 font-display text-xl font-semibold">
                    ¡Estás dentro! Tu pasaporte te espera 🏃
                  </p>
                  <p className="mb-3.5 text-[13.5px] text-ink-700">
                    Abre tu pasaporte digital y presenta cada código en caja.{" "}
                    {PASSPORT.validity}
                  </p>
                  <ul className="flex flex-wrap gap-2.5">
                    {PASSPORT_OFFERS.map((offer) => (
                      <li
                        key={offer.code}
                        className="rounded-sm border border-dashed border-terra bg-sand-100 px-3 py-1.75 font-mono text-xs text-terra"
                      >
                        {offer.code}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <MonoNote className="mt-4">
                Códigos de ejemplo — los reales se generan por corredor al
                registrarse.
              </MonoNote>
            </div>
          </div>
        </Container>
      </section>
    </PageFade>
  );
}
