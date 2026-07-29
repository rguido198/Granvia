import type { Metadata } from "next";
import Link from "next/link";
import {
  PILLAR_LABELS,
  TENANTS,
  type Pillar,
} from "@/content/tenants";
import { TenantLogo } from "@/components/tenant-logo";
import {
  Container,
  Kicker,
  MonoNote,
  PageFade,
  SectionTitle,
  cn,
} from "@/components/ui";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Directorio",
  description: `Los ${TENANTS.length} locales de La Gran Vía: restaurantes, moda, bienestar, cine, hoteles y servicios en un solo lugar.`,
};

const ORDER: Pillar[] = ["prueba", "consiente", "visita", "servicios"];

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ pilar?: string }>;
}) {
  const { pilar } = await searchParams;
  const active = ORDER.includes(pilar as Pillar) ? (pilar as Pillar) : null;
  const shown = active ? TENANTS.filter((t) => t.pillar === active) : TENANTS;

  return (
    <PageFade>
      <section aria-labelledby="directorio-titulo">
        <Container className="pt-12 pb-8 sm:pt-16">
          <Kicker className="mb-5 tracking-[0.26em]">
            Directorio · {TENANTS.length} locales
          </Kicker>
          <SectionTitle as="h1" id="directorio-titulo" className="mb-5">
            Todo lo que vive en la plaza.
          </SectionTitle>
          <p className="max-w-[560px] text-[17px] text-ink-500">
            Mesa, moda, bienestar, cultura y servicios. Filtra por lo que buscas
            hoy — o recórrelo completo.
          </p>
        </Container>
      </section>

      {/* Filtros */}
      <section aria-label="Filtrar directorio">
        <Container className="pb-8">
          <ul className="flex flex-wrap gap-2.5">
            <li>
              <Link
                href="/directorio"
                aria-current={!active ? "true" : undefined}
                className={cn(
                  "inline-flex rounded-xs border px-4 py-2 text-[13px] font-semibold transition-colors",
                  !active
                    ? "border-ink bg-ink text-sand-100"
                    : "border-hairline-strong bg-sand-50 text-ink hover:border-ink-400",
                )}
              >
                Todos ({TENANTS.length})
              </Link>
            </li>
            {ORDER.map((key) => {
              const count = TENANTS.filter((t) => t.pillar === key).length;
              const selected = active === key;
              return (
                <li key={key}>
                  <Link
                    href={`/directorio?pilar=${key}`}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "inline-flex rounded-xs border px-4 py-2 text-[13px] font-semibold transition-colors",
                      selected
                        ? "border-ink bg-ink text-sand-100"
                        : "border-hairline-strong bg-sand-50 text-ink hover:border-ink-400",
                    )}
                  >
                    {PILLAR_LABELS[key].kicker} ({count})
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* Retícula */}
      <section aria-label="Locales">
        <Container className="pb-20">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((tenant) => (
              <li
                key={tenant.slug}
                className="flex gap-4 rounded-md border border-hairline bg-sand-100 p-4 transition-colors hover:border-terra"
              >
                <TenantLogo tenant={tenant} className="h-20 w-24 flex-none" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[21px] leading-tight font-semibold">
                    {tenant.name}
                  </h2>
                  <p className="mt-0.5 font-mono text-[10.5px] tracking-[0.06em] text-ink-400 uppercase">
                    {tenant.tag}
                  </p>
                  <p className="mt-2 text-[13px] text-ink-500">{tenant.zone}</p>
                  {tenant.phone && (
                    <p className="mt-1 text-[13px]">
                      <a
                        href={`tel:${tenant.phone.replace(/[^\d+]/g, "")}`}
                        className="text-terra"
                      >
                        {tenant.phone}
                      </a>
                    </p>
                  )}
                  {tenant.hours.length > 0 &&
                    (tenant.hoursNeedsReview ? (
                      // El horario oficial viene desalineado: se muestra tal
                      // cual, en una sola línea que fluye, en lugar de
                      // inventar un emparejamiento día/hora que sería falso.
                      <p className="mt-2 text-[12px] leading-snug text-ink-400">
                        {tenant.hours[0].days} · {tenant.hours[0].times}
                      </p>
                    ) : (
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 text-[12px] leading-snug text-ink-400">
                        {tenant.hours.map((h) => (
                          <div key={h.days + h.times} className="contents">
                            <dt className="font-medium whitespace-nowrap">
                              {h.days}
                            </dt>
                            <dd>{h.times}</dd>
                          </div>
                        ))}
                      </dl>
                    ))}
                </div>
              </li>
            ))}
          </ul>

          <MonoNote className="mt-10">
            Directorio y logotipos tomados del sitio oficial de La Gran Vía.
            Horarios sujetos a cambio.
          </MonoNote>
        </Container>
      </section>
    </PageFade>
  );
}
