"use client";

import { useState } from "react";
import Link from "next/link";
import { PILLAR_LABELS, type Pillar, type Tenant } from "@/content/tenants";
import { TenantLogo } from "@/components/tenant-logo";
import { Container, Kicker, SectionTitle, accentText, cn } from "@/components/ui";

/** Los tres pilares del comp; `servicios` vive solo en el directorio. */
const TABS: { key: Pillar; accent: "terra" | "pine" | "gold" }[] = [
  { key: "prueba", accent: "terra" },
  { key: "consiente", accent: "pine" },
  { key: "visita", accent: "gold" },
];

/** Cuántos locales mostrar por pilar antes de enviar al directorio completo. */
const PREVIEW = 6;

export function PlanYourDay({ tenants }: { tenants: Tenant[] }) {
  const [activeKey, setActiveKey] = useState<Pillar>("prueba");
  const shown = tenants
    .filter((t) => t.pillar === activeKey)
    .slice(0, PREVIEW);
  const total = tenants.filter((t) => t.pillar === activeKey).length;

  return (
    <section
      id="plan"
      className="border-y border-hairline bg-sand-200"
      aria-labelledby="plan-titulo"
    >
      <Container className="py-14 sm:py-18">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Kicker accent="pine" className="mb-3.5 tracking-[0.24em]">
              Plan your day · Guía interactiva
            </Kicker>
            <SectionTitle id="plan-titulo">Arma tu plan del día</SectionTitle>
          </div>
          <p className="max-w-80 text-[15px] text-ink-500">
            Tres formas de vivir La Gran Vía. Elige por dónde empezar y te
            mostramos a dónde ir.
          </p>
        </div>

        {/* Pilares */}
        <div
          role="tablist"
          aria-label="Pilares de la plaza"
          className="mb-9 grid gap-3.5 md:grid-cols-3"
        >
          {TABS.map(({ key, accent }) => {
            const label = PILLAR_LABELS[key];
            const selected = key === activeKey;
            return (
              <button
                key={key}
                role="tab"
                id={`tab-${key}`}
                aria-selected={selected}
                aria-controls={`panel-${key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveKey(key)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  e.preventDefault();
                  const i = TABS.findIndex((t) => t.key === activeKey);
                  const next =
                    e.key === "ArrowRight"
                      ? (i + 1) % TABS.length
                      : (i - 1 + TABS.length) % TABS.length;
                  setActiveKey(TABS[next].key);
                  document.getElementById(`tab-${TABS[next].key}`)?.focus();
                }}
                className={cn(
                  "cursor-pointer rounded-md border px-5 py-5.5 text-left transition-all duration-200 sm:px-5.5",
                  selected
                    ? "border-ink bg-ink text-sand-100"
                    : "border-hairline bg-sand-100 text-ink hover:border-ink-400",
                )}
              >
                <span
                  className={cn(
                    "block font-mono text-[11px] tracking-[0.2em] uppercase",
                    selected ? "text-gold" : accentText(accent),
                  )}
                >
                  {label.kicker} · {label.en}
                </span>
                <span className="mt-2 mb-1 block font-display text-[26px] leading-tight font-semibold">
                  {label.title}
                </span>
                <span
                  className={cn(
                    "block text-[13.5px]",
                    selected ? "text-dune-200" : "text-ink-500",
                  )}
                >
                  {label.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Locales del pilar activo */}
        <ul
          key={activeKey}
          role="tabpanel"
          id={`panel-${activeKey}`}
          aria-labelledby={`tab-${activeKey}`}
          className="grid animate-fade-up gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {shown.map((tenant) => (
            <li
              key={tenant.slug}
              className="flex items-center gap-4 rounded-sm border border-hairline bg-sand-100 p-3.5 transition-colors hover:border-terra"
            >
              <TenantLogo tenant={tenant} className="h-14 w-20 flex-none" />
              <span className="min-w-0">
                <span className="block truncate font-display text-xl leading-tight font-semibold">
                  {tenant.name}
                </span>
                <span className="mt-0.5 block font-mono text-[10.5px] tracking-[0.06em] text-ink-400 uppercase">
                  {tenant.tag}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-7">
          <Link
            href={`/directorio?pilar=${activeKey}`}
            className="text-sm font-semibold text-terra"
          >
            Ver los {total} locales de {PILLAR_LABELS[activeKey].title}{" "}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Container>
    </section>
  );
}
