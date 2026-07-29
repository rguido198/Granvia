import { HERO, NEW_TENANTS } from "@/content/home";
import { TENANTS } from "@/content/tenants";
import { PlanYourDay } from "@/components/home/plan-your-day";
import { InstagramFeed } from "@/components/instagram-feed";
import {
  ButtonLink,
  Container,
  ImagePlaceholder,
  Kicker,
  PageFade,
  SectionTitle,
} from "@/components/ui";

export default function HomePage() {
  return (
    <PageFade>
      {/* ---------------- Hero ---------------- */}
      <section aria-labelledby="hero-titulo" className="py-10 sm:py-14">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
            <div>
              <Kicker className="mb-5 tracking-[0.28em]">{HERO.kicker}</Kicker>
              <SectionTitle as="h1" id="hero-titulo" className="mb-5.5">
                {HERO.titleLead}
                <br />
                <em className="text-terra italic">{HERO.titleEm}</em>
              </SectionTitle>
              <p className="mb-8 max-w-[440px] text-[17px] text-ink-500 sm:text-lg">
                {HERO.body}
              </p>
              <div className="flex flex-wrap gap-3.5">
                <ButtonLink href="/#plan">Planea tu día</ButtonLink>
                <ButtonLink href="/eventos" variant="outline">
                  Ver eventos
                </ButtonLink>
              </div>
            </div>
            <ImagePlaceholder
              label={HERO.imageLabel}
              src={HERO.image}
              className="order-first h-64 sm:h-96 lg:order-none lg:h-[460px] xl:h-[480px] shadow-lg rounded-md"
            />
          </div>
        </Container>
      </section>

      {/* ---------------- Plan your day ---------------- */}
      <PlanYourDay tenants={TENANTS} />

      {/* ---------------- New tenants ---------------- */}
      <section aria-labelledby="nuevos-titulo">
        <Container className="py-14 pb-20 sm:py-18 sm:pb-22">
          <div className="mb-2 flex flex-wrap items-baseline gap-4">
            <SectionTitle id="nuevos-titulo">Conoce lo nuevo</SectionTitle>
            <span className="font-mono text-[11px] tracking-[0.16em] text-terra uppercase">
              Recién llegados
            </span>
          </div>
          <p className="mb-9 max-w-[460px] text-[15px] text-ink-500">
            Cada temporada abren nuevas experiencias. Estas acaban de llegar —
            pasa a saludar.
          </p>

          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {NEW_TENANTS.map((tenant) => (
              <li
                key={tenant.name}
                className="overflow-hidden rounded-sm border border-hairline bg-sand-100 transition-colors hover:border-ink-400"
              >
                <ImagePlaceholder
                  label={tenant.imageLabel}
                  src={tenant.image}
                  className="h-45 rounded-none"
                />
                <div className="p-5.5">
                  <p className="mb-2 font-mono text-[10.5px] tracking-[0.14em] text-pine uppercase">
                    {tenant.cat}
                  </p>
                  <h3 className="mb-2.5 font-display text-[27px] leading-none font-bold">
                    {tenant.name}
                  </h3>
                  <p className="text-[14.5px] text-ink-500">{tenant.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ---------------- Instagram ---------------- */}
      <InstagramFeed />
    </PageFade>
  );
}
