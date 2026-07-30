import type { Metadata } from "next";
import { TEAM_INTRO } from "@/content/team";
import { TeamShowcase } from "@/components/team/team-showcase";
import { Container, Kicker, PageFade, SectionTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Tu Equipo de IA",
  description: "Conoce a los tres Agentes de IA que trabajan para La Gran Vía, día y noche.",
  robots: { index: false, follow: false },
};

export default function TeamPage() {
  return (
    <PageFade>
      <section className="bg-sand-200 border-b border-hairline" aria-labelledby="equipo-titulo">
        <Container className="py-14 sm:py-18">
          <div className="mx-auto max-w-[680px] text-center">
            <Kicker className="mb-4 tracking-[0.24em]">{TEAM_INTRO.kicker}</Kicker>
            <SectionTitle as="h1" id="equipo-titulo" className="mb-4.5">
              {TEAM_INTRO.title}
            </SectionTitle>
            <p className="text-[17px] text-ink-500">{TEAM_INTRO.lead}</p>
          </div>
        </Container>
      </section>

      <section aria-label="El equipo">
        <Container className="py-14 sm:py-18">
          <TeamShowcase />
        </Container>
      </section>
    </PageFade>
  );
}
