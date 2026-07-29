import { ButtonLink, Container, Kicker, SectionTitle } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col justify-center py-20">
      <div className="max-w-[560px]">
        <Kicker className="mb-5 tracking-[0.26em]">Error 404</Kicker>
        <SectionTitle as="h1" className="mb-5">
          Esta página se nos perdió en la plaza.
        </SectionTitle>
        <p className="mb-8 text-[17px] text-ink-500">
          La dirección que buscas no existe o cambió de lugar. Vuelve al inicio
          y arma tu plan desde ahí.
        </p>
        <div className="flex flex-wrap gap-3.5">
          <ButtonLink href="/">Ir al inicio</ButtonLink>
          <ButtonLink href="/eventos" variant="outline">
            Ver eventos
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
