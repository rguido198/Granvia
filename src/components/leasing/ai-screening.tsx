"use client";

import { useEffect, useRef, useState } from "react";
import {
  AI_TERMINAL_STEPS,
  EXCLUSIVE_USE_CLAUSES,
  type BusinessCategory,
  type LeaseKey,
} from "@/content/leasing";
import { downloadBlob, generateMockPdf } from "@/lib/mock-pdf";
import { cn, Kicker } from "@/components/ui";

const LEASE_LABEL: Record<LeaseKey, string> = {
  short: "Corto plazo (6–12 meses)",
  mid: "Mediano plazo (1–3 años)",
  long: "Contrato ancla (3–5+ años)",
};

type Outcome =
  | { kind: "conflict"; tenant: string; local: string }
  | { kind: "match"; score: number };

function evaluate(giro: BusinessCategory, metros: number, duracion: LeaseKey): Outcome {
  const clause = EXCLUSIVE_USE_CLAUSES[giro];
  if (clause) return { kind: "conflict", tenant: clause.tenant, local: clause.local };

  let score = 70;
  if (giro === "Restaurante / Gastronomía") score += 14;
  if (giro === "Salud & Bienestar") score += 10;
  if (metros >= 80 && metros <= 180) score += 8;
  if (duracion !== "short") score += 6;
  return { kind: "match", score: Math.min(score, 96) };
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
    <div className="mb-7 overflow-hidden rounded-lg border border-hairline-strong shadow-[0_10px_30px_-20px_rgba(33,31,28,0.5)]">
      <div className="flex items-center justify-between bg-ink px-4.5 py-2.5">
        <span className="font-mono text-[11px] tracking-[0.1em] text-dune-100">
          AGENTE DE IA · ARRENDAMIENTO
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-gold">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-gold",
              thinking && "animate-pulse",
            )}
          />
          {thinking ? "ANALIZANDO" : "COMPLETADO"}
        </span>
      </div>

      <div className="bg-dune-900 px-4.5 py-4 font-mono text-[12.5px] leading-relaxed text-dune-100">
        {AI_TERMINAL_STEPS.slice(0, visibleSteps).map((step, i) => (
          <p key={i} className="animate-fadeIn">
            <span className="text-pine">$</span> {step}
          </p>
        ))}
        {thinking && visibleSteps > 0 && (
          <span className="inline-block h-3.5 w-1.5 animate-blink bg-dune-100 align-text-bottom" />
        )}
        {visibleSteps === 0 && (
          <p className="text-dune-300">
            <span className="text-pine">$</span> iniciando análisis…
          </p>
        )}
      </div>

      {outcome && (
        <div className="animate-fadeIn bg-sand-50 p-4.5 sm:p-5.5">
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
