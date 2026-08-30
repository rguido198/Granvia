import type { Metadata } from "next";
import { LeasingExperience } from "@/components/leasing/leasing-experience";
import { Container, Kicker, PageFade, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crece Tu Negocio",
  description:
    "Renta tu espacio comercial en La Gran Vía Mexicali. Consulta disponibilidad de locales, plantas y Ficha Técnica de Arrendamiento.",
};

export default function LeasingPage() {
  return (
    <PageFade>
      <section aria-labelledby="leasing-titulo">
        <Container className="pt-12 pb-6 sm:pt-16">
          <div className="max-w-[760px]">
            <Kicker className="mb-4 tracking-[0.26em]">
              COMERCIALIZACIÓN & ARRENDAMIENTO
            </Kicker>
            <SectionTitle as="h1" id="leasing-titulo" className="mb-4">
              El lugar donde tu marca encuentra a su gente.
            </SectionTitle>
            <p className="text-[16px] sm:text-[17px] text-ink-500 leading-relaxed">
              La Gran Vía es el centro comercial, financiero y gastronómico de mayor plusvalía en Mexicali. Más de 84 marcas consolidadas reciben a miles de visitantes cada semana sobre Calzada CETYS.
            </p>
          </div>
        </Container>
      </section>

      <section aria-label="Solicitud de espacio comercial">
        <Container className="pt-4 pb-20">
          <LeasingExperience />
        </Container>
      </section>
    </PageFade>
  );
}
