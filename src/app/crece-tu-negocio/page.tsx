import type { Metadata } from "next";
import { LEASING_HERO } from "@/content/leasing";
import { LeasingExperience } from "@/components/leasing/leasing-experience";
import { Container, Kicker, PageFade, SectionTitle } from "@/components/ui";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crece Tu Negocio",
  description:
    "Renta tu espacio en La Gran Vía. Cuéntanos qué necesitas y recibe en minutos la información y los siguientes pasos para tu tipo de espacio.",
};

export default function LeasingPage() {
  return (
    <PageFade>
      <section aria-labelledby="leasing-titulo">
        <Container className="pt-12 pb-8 sm:pt-16">
          <div className="max-w-[680px]">
            <Kicker className="mb-5 tracking-[0.26em]">
              {LEASING_HERO.kicker}
            </Kicker>
            <SectionTitle as="h1" id="leasing-titulo" className="mb-5.5">
              {LEASING_HERO.title}
            </SectionTitle>
            <p className="mb-3.5 text-[17px] text-ink-500">
              {LEASING_HERO.lead}
            </p>
            <p className="text-[15px] text-ink-500">
              Cuéntanos qué necesitas y en{" "}
              <strong className="font-semibold text-ink">
                menos de 5 minutos
              </strong>{" "}
              recibirás por correo la información y los siguientes pasos para tu
              tipo de espacio. Sin llamadas de venta, sin rodeos.
            </p>
          </div>
        </Container>
      </section>

      <section aria-label="Solicitud de espacio">
        <Container className="pt-5 pb-20">
          <LeasingExperience />
        </Container>
      </section>
    </PageFade>
  );
}
