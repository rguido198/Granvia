import type { Metadata } from "next";
import { TENANTS } from "@/content/tenants";
import { DirectoryMap } from "@/components/directory-map";
import {
  Container,
  Kicker,
  MonoNote,
  PageFade,
  SectionTitle,
} from "@/components/ui";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Directorio & Plano Interactivo",
  description: `Explora el plano interactivo y los ${TENANTS.length} locales de La Gran Vía Mexicali: restaurantes, moda, bienestar, cine, hoteles y servicios en un solo lugar.`,
};

export default function DirectoryPage() {
  return (
    <PageFade>
      <section aria-labelledby="directorio-titulo">
        <Container className="pt-12 pb-8 sm:pt-16">
          <Kicker className="mb-5 tracking-[0.26em]">
            Plano Interactivo & Directorio · {TENANTS.length} locales
          </Kicker>
          <SectionTitle as="h1" id="directorio-titulo" className="mb-5">
            Todo lo que vive en La Gran Vía.
          </SectionTitle>
          <p className="max-w-[620px] text-[17px] text-ink-500">
            Explora el mapa arquitectónico de la plaza por zonas o busca directamente tu restaurante, tienda o servicio favorito.
          </p>
        </Container>
      </section>

      {/* Interactive Map & Integrated Tenant Directory */}
      <section aria-label="Mapa interactivo y directorio">
        <Container className="pb-20">
          <DirectoryMap />

          <MonoNote className="mt-12">
            Directorio y plano arquitectónico oficial de La Gran Vía Mexicali (Calzada CETYS).
            Horarios y disponibilidad de locales sujetos a cambios.
          </MonoNote>
        </Container>
      </section>
    </PageFade>
  );
}
