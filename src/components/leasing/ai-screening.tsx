"use client";

import { useEffect, useRef, useState } from "react";
import {
  AI_TERMINAL_STEPS,
  EXCLUSIVE_USE_CLAUSES,
  SCORING_RULES,
  type BusinessCategory,
  type LeaseKey,
} from "@/content/leasing";
import { downloadBlob, generateMockPdf } from "@/lib/mock-pdf";
import { cn, Kicker } from "@/components/ui";

const LEASE_LABEL: Record<LeaseKey, string> = {
  standard: "1–3 años",
  mid: "3–5 años",
  long: "5+ años (Ancla)",
};

type Outcome =
  | { kind: "conflict"; tenant: string; local: string }
  | { kind: "match"; score: number };

function evaluate(giro: BusinessCategory, metros: number, duracion: LeaseKey): Outcome {
  const clause = EXCLUSIVE_USE_CLAUSES[giro];
  if (clause) return { kind: "conflict", tenant: clause.tenant, local: clause.local };

  const { base, categoryBonus, metrosBonus, nonShortDurationBonus, cap } = SCORING_RULES;
  let score = base;
  score += categoryBonus[giro] ?? 0;
  if (metros >= metrosBonus.min && metros <= metrosBonus.max) score += metrosBonus.amount;
  if (duracion !== "standard") score += nonShortDurationBonus;
  return { kind: "match", score: Math.min(score, cap) };
}

function downloadGuidelines(giro: BusinessCategory, tenant: string, local: string) {
  const blob = generateMockPdf(
    "Lineamientos de Islas y Espacios de Corto Plazo",
    [
      {
        body: [
          "La Gran Vía Mexicali — Dirección Comercial",
          `Generado automáticamente por el Agente de IA de Arrendamiento.`,
        ],
      },
      {
        heading: "Motivo de este documento",
        body: [
          `Tu solicitud (giro: ${giro}) coincide con una categoría que tiene`,
          `cláusula de uso exclusivo activa en la plaza, actualmente asignada a`,
          `${tenant} (${local}). No podemos ofrecerte un local estándar en esa`,
          "categoría, pero sí espacios de formato corto que no compiten con la",
          "cláusula vigente.",
        ],
      },
      {
        heading: "Lo que sí está disponible",
        body: [
          "- Islas comerciales y kioscos de temporada (formato reducido, sin",
          "  exhibición de prenda como categoría principal).",
          "- Activaciones de marca de 2 a 6 semanas en zona de alto tránsito.",
          "- Espacios pop-up rotativos sujetos a calendario comercial.",
        ],
      },
      {
        heading: "Siguientes pasos",
        body: [
          "1. Responde este correo si te interesa el formato de isla comercial.",
          "2. Un ejecutivo te compartirá el plano de zonas disponibles y tarifas.",
          "3. Confirmación de espacio sujeta a calendario y a la vigencia de la",
          "   cláusula de exclusividad del giro solicitado.",
        ],
      },
    ],
    "Documento generado automáticamente para fines de demostración — La Gran Vía Mexicali.",
  );
  downloadBlob(blob, "Lineamientos_Islas_Comerciales_LaGranVia.pdf");
}

function downloadProposal(giro: BusinessCategory, metros: number, duracion: LeaseKey, score: number) {
  const blob = generateMockPdf(
    "Propuesta Preliminar de Arrendamiento",
    [
      {
        body: [
          "La Gran Vía Mexicali — Dirección Comercial",
          "Generado automáticamente por el Agente de IA de Arrendamiento.",
        ],
      },
      {
        heading: "Resumen de la solicitud",
        body: [
          `Giro: ${giro}`,
          `Superficie solicitada: ${metros} m²`,
          `Duración: ${LEASE_LABEL[duracion]}`,
          `Compatibilidad con el mix comercial: ${score}%`,
        ],
      },
      {
        heading: "Por qué es un buen match",
        body: [
          "- Sin conflicto con cláusulas de uso exclusivo vigentes.",
          "- Categoría alineada con la demanda de afluencia registrada por el",
          "  Agente de Asset Management en las últimas 8 semanas.",
          "- Superficie dentro del rango óptimo para el giro solicitado.",
        ],
      },
      {
        heading: "Siguientes pasos",
        body: [
          "1. Un ejecutivo comercial confirmará disponibilidad de local.",
          "2. Firma de carta de intención y depósito de apartado.",
          "3. Entrega de Ficha Técnica final y planos para fit-out.",
        ],
      },
    ],
    "Documento generado automáticamente para fines de demostración — La Gran Vía Mexicali.",
  );
  downloadBlob(blob, "Propuesta_Arrendamiento_LaGranVia.pdf");
}

export function AiScreeningPanel({
  giro,
  metros,
  duracion,
  trigger,
}: {
  giro: BusinessCategory;
  metros: number;
  duracion: LeaseKey;
  trigger: number;
}) {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisibleSteps(0);
    setOutcome(null);

    AI_TERMINAL_STEPS.forEach((_, i) => {
      timers.current.push(
        setTimeout(() => setVisibleSteps(i + 1), 550 * (i + 1)),
      );
    });
    timers.current.push(
      setTimeout(
        () => setOutcome(evaluate(giro, metros || 0, duracion)),
        550 * AI_TERMINAL_STEPS.length + 400,
      ),
    );

    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (trigger === 0) return null;

  const thinking = visibleSteps < AI_TERMINAL_STEPS.length || !outcome;

  return (
    <div className="mb-7 overflow-hidden rounded-lg border border-hairline-strong bg-sand-50 shadow-[0_10px_30px_-20px_rgba(33,31,28,0.35)]">
      <div className="flex items-center justify-between border-b border-hairline bg-sand-100 px-4.5 py-3">
        <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
          <span aria-hidden="true" className="text-base">
            🤖
          </span>
          Agente de Arrendamiento
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            thinking ? "bg-gold/15 text-gold" : "bg-pine/15 text-pine",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              thinking ? "bg-gold animate-pulse" : "bg-pine",
            )}
          />
          {thinking ? "Pensando…" : "Listo"}
        </span>
      </div>

      <ul className="space-y-3 px-4.5 py-4.5 sm:px-5.5">
        {AI_TERMINAL_STEPS.map((step, i) => {
          const done = i < visibleSteps;
          const active = i === visibleSteps && thinking;
          return (
            <li key={i} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors duration-300",
                  done
                    ? "border-pine bg-pine text-sand-100"
                    : active
                      ? "border-gold text-gold animate-pulse"
                      : "border-hairline-strong text-transparent",
                )}
                aria-hidden="true"
              >
                {done ? "✓" : "•"}
              </span>
              <span
                className={cn(
                  "text-[13.5px] leading-snug transition-colors duration-300",
                  done || active ? "text-ink-700" : "text-ink-300",
                )}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ul>

      {outcome && (
        <div className="animate-fadeIn border-t border-hairline bg-sand-100 p-4.5 sm:p-5.5">
          {outcome.kind === "conflict" ? (
            <>
              <Kicker accent="terra" className="mb-2 tracking-[0.18em]">
                ⚠ Conflicto de uso exclusivo detectado
              </Kicker>
              <p className="mb-3.5 text-[14px] text-ink-700">
                <strong className="font-semibold text-ink">{giro}</strong> tiene
                una cláusula de exclusividad activa con{" "}
                <strong className="font-semibold text-ink">{outcome.tenant}</strong>{" "}
                ({outcome.local}). El Agente generó automáticamente una guía
                alterna con los formatos de corto plazo sí disponibles para
                este giro.
              </p>
              <button
                type="button"
                onClick={() => downloadGuidelines(giro, outcome.tenant, outcome.local)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xs border border-terra bg-terra px-4.5 py-2.5 text-[13.5px] font-semibold text-sand-100 transition-colors hover:bg-terra-dark"
              >
                ↓ Descargar Lineamientos de Islas Comerciales (PDF)
              </button>
            </>
          ) : (
            <>
              <Kicker accent="pine" className="mb-2 tracking-[0.18em]">
                ✓ Match Score: {outcome.score}%
              </Kicker>
              <p className="mb-3.5 text-[14px] text-ink-700">
                Sin conflictos de uso exclusivo. La superficie y el giro
                encajan con la demanda de afluencia actual — el Agente ya
                redactó una propuesta de arrendamiento preliminar.
              </p>
              <button
                type="button"
                onClick={() => downloadProposal(giro, metros || 0, duracion, outcome.score)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xs border border-pine bg-pine px-4.5 py-2.5 text-[13.5px] font-semibold text-sand-100 transition-colors hover:bg-ink"
              >
                ↓ Descargar Propuesta de Arrendamiento (PDF)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
