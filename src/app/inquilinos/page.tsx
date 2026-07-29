import type { Metadata } from "next";
import Link from "next/link";
import { HUB_ACTIONS, HUB_INTRO } from "@/content/hub";
import { SITE } from "@/content/site";
import {
  Container,
  MonoNote,
  PageFade,
  SectionTitle,
  accentBg,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Tenant Hub",
  description:
    "Portal para inquilinos de La Gran Vía: reporta incidencias, envía tu reporte mensual de ventas y descarga los reglamentos vigentes.",
  // Internal-facing utility page — no reason for it to rank.
  robots: { index: false, follow: false },
};

/** The three icon tiles differ only by shape; keep the mapping in one place. */
const ICON_SHAPE = {
  diamond: "rotate-45 rounded-[2px]",
  circle: "rounded-full",
  square: "rounded-[1px]",
} as const;

export default function TenantHubPage() {
  return (
    <PageFade>
      <div className="flex min-h-[calc(100vh-74px)] items-center bg-sand-200">
        <Container className="max-w-[1000px]! py-14 sm:py-16">
          <div className="mx-auto mb-3 max-w-[560px] text-center">
            <p className="mb-6 inline-flex items-center gap-2 rounded-[20px] border border-pine/35 bg-sand-100 px-3.5 py-1.5 font-mono text-[11px] tracking-[0.08em] text-pine">
              <span
                aria-hidden="true"
                className="inline-block h-1.75 w-1.75 rounded-full bg-pine"
              />
              inquilinos.lagranvia.com.mx
            </p>
            <SectionTitle
              as="h1"
              className="mb-4.5 text-[clamp(2.5rem,5.5vw,3.5rem)]!"
            >
              {HUB_INTRO.title}
            </SectionTitle>
            <p className="text-[17px] text-ink-500">{HUB_INTRO.lead}</p>
          </div>

          <MonoNote className="mb-9 text-center">{HUB_INTRO.note}</MonoNote>

          <ul className="grid gap-4.5 md:grid-cols-3">
            {HUB_ACTIONS.map((action) => (
              <li key={action.key} className="flex">
                <Link
                  href={action.href}
                  className="group flex min-h-[250px] w-full flex-col rounded-lg border border-hairline bg-sand-100 p-6.5 text-left transition-all duration-200 hover:border-ink hover:shadow-[0_14px_36px_-24px_rgba(33,31,28,0.6)]"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-11.5 w-11.5 items-center justify-center rounded-sm ${accentBg(action.accent)}`}
                  >
                    <span
                      className={`block h-4.5 w-4.5 bg-sand-100 ${ICON_SHAPE[action.icon]}`}
                    />
                  </span>

                  <span className="mt-4.5 block font-display text-[25px] leading-[1.05] font-semibold text-ink">
                    {action.title}
                  </span>
                  <span className="mt-1.5 block font-mono text-[10px] tracking-[0.12em] text-ink-400 uppercase">
                    {action.en}
                  </span>
                  <span className="mt-3 block text-[13.5px] text-ink-500">
                    {action.desc}
                  </span>

                  <span className="mt-auto block pt-4.5 text-sm font-semibold text-terra">
                    {action.cta}{" "}
                    <span
                      aria-hidden="true"
                      className="inline-block transition-transform duration-200 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-center text-[13px] text-ink-400">
            ¿Problemas para entrar? Escribe a{" "}
            <span dangerouslySetInnerHTML={{ __html: "<!--email_off-->" }} />
            <a href={`mailto:${SITE.emails.support}`}>{SITE.emails.support}</a>
            <span dangerouslySetInnerHTML={{ __html: "<!--/email_off-->" }} />
          </p>
        </Container>
      </div>
    </PageFade>
  );
}
