import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

import { computeContractAggregates, contractStatusLabel, fetchPortfolio } from "@/lib/data/portfolio.server";
import { fetchDiegoTickets } from "@/lib/data/diego-tickets.server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { LeaseExtractedFieldsSchema } from "@/lib/ingest/lease-extraction-schema";
import { COPILOTO_CACHE_TAG } from "@/lib/copiloto/cache";

/**
 * Copiloto's actual retrieval + generation logic, factored out of
 * /api/copiloto/ask/route.ts so it can be called directly — by the route
 * (after its auth check) and by scripts/golden-eval-runner.ts (which has no
 * HTTP session to authenticate with, and isn't testing auth anyway; this
 * eval is about answer grounding, not access control). Deterministic SQL
 * retrieval (fetchPortfolio / fetchDiegoTickets — the exact same real data
 * the Rent Roll, Legal and Diego tabs render) feeding one grounded Claude
 * call — not RAG (the portfolio is small enough to pass in full, no
 * embeddings/vector search needed) and not agentic (one retrieval, one
 * generation, no tool-use loop).
 */

const SYSTEM_PROMPT = `Eres el Copiloto IA de La Gran Vía Mexicali — cubres tanto los contratos de arrendamiento (antes "Mariana") como los tickets de mantenimiento y CapEx (antes "Diego"). Respondes preguntas del propietario usando únicamente los datos reales que se te proporcionan a continuación.

Reglas:
- Responde en español, de forma directa y ejecutiva.
- Cita el inquilino y el local (ej. "Ashley Furniture, Local A-01") cuando refieras un contrato, y el número de ticket y el local (ej. "INC-006, Local LOC-12") cuando refieras un caso de mantenimiento.
- La matriz de responsabilidad de mantenimiento (matriz_responsabilidad) y los días de aviso de terminación (dias_aviso_terminacion) provienen del contrato digitalizado y verificado por el propietario — cítalos como tales cuando los uses. Si son null, dilo explícitamente: ese contrato aún no ha sido digitalizado o verificado.
- Cada contrato incluye estatus_contractual ("Vigente" / "Renovación Próxima" / "Vencido"), ya calculado a partir de la fecha de hoy que se te da al inicio del mensaje — úsalo directamente para cualquier pregunta sobre si un contrato está vigente, por vencer o vencido. No lo recalcules tú mismo a partir de "vencimiento": es el mismo estatus exacto que ve el propietario en la tabla de contratos, y un cálculo propio podría no coincidir.
- Cuando un contrato incluya texto_completo_contrato (el documento digitalizado íntegro) o clausulas_especiales (cláusulas fuera de lo estándar detectadas en Gate 2), úsalos para responder cualquier pregunta sobre ese contrato que los campos estructurados no cubran — no te limites a matriz_responsabilidad/uso_permitido/clausula_exclusividad si la respuesta real está en el texto completo. Si ambos son null, ese contrato aún no ha sido digitalizado — dilo explícitamente en vez de responder solo con lo poco que sí tienes.
- Para cualquier pregunta que pida un CONTEO o agregado entre varios contratos ("¿cuántos contratos vencen este año?", "¿cuántos inquilinos tienen el HVAC a su cargo?", "¿cuántos contratos están vigentes?"), usa directamente estadisticas_agregadas_contratos — nunca cuentes tú mismo recorriendo el arreglo de contratos_de_arrendamiento. Un conteo propio sobre docenas de registros es exactamente el tipo de tarea donde un modelo puede equivocarse en silencio; estadisticas_agregadas_contratos ya viene calculado de forma determinista. responsabilidad_por_sistema solo cuenta contratos_digitalizados, no total_contratos — acláralo si la pregunta lo amerita (ej. "de los 3 contratos digitalizados, 2 tienen el HVAC a cargo del arrendatario; los otros 82 aún no han sido digitalizados").
- Si la pregunta no puede responderse con los datos proporcionados, dilo explícitamente — nunca inventes cifras, cláusulas, diagnósticos, costos o fechas que no aparezcan en los datos.
- No tienes acceso a pólizas de seguro ni a garantías en depósito — esos datos no existen en este sistema.`;

export type AskCopilotoResult = { answer: string } | { error: string };

type CopilotoRequest = {
  system: Anthropic.Messages.MessageCreateParams["system"];
  messages: Anthropic.Messages.MessageParam[];
};

// The Supabase retrieval + dataBlock assembly below is identical for every
// question asked in a session — only the date line and the question itself
// change per call (added back in buildCopilotoRequest). Wrapped in
// unstable_cache so a same-session follow-up question skips re-querying
// leases/tickets/documents entirely, on top of the Anthropic-side prompt
// cache already covering the assembled block. 30s revalidate is a safety
// net; invalidateCopilotoCache() (called from every write path that touches
// leases/tickets/documents) is the real freshness mechanism.
async function fetchDataBlock(): Promise<string> {
  const [{ leases }, { tickets }] = await Promise.all([fetchPortfolio(), fetchDiegoTickets()]);

  // A digitized lease's structured fields (matriz_responsabilidad,
  // clausula_exclusividad, etc.) were the only thing Copiloto ever saw —
  // `special_clauses` (the Gate 2 review form's "unusual clause" list —
  // warranty terms, late-fee percentages, anything that didn't fit the
  // universal matrix) and the full transcribed contract text never made it
  // into this endpoint's data block at all. A landlord asking anything not
  // covered by those ~9 fields got "no tengo ese dato" about a document
  // that had, in fact, already been read in full. Only fetched for leases
  // that actually went through digitization (sourceDocumentId set) — most
  // of this plaza's 85 leases are seed data with nothing to fetch.
  const documentIds = [...new Set(leases.map((l) => l.sourceDocumentId).filter((id): id is string => id !== null))];
  const documentDetailsById = new Map<string, { rawText: string | null; specialClauses: unknown }>();
  if (documentIds.length > 0) {
    const supabase = getSupabaseServiceClient();
    const { data: docs } = await supabase
      .from("documents")
      .select("id, raw_text, extracted_fields")
      .in("id", documentIds);
    for (const d of docs ?? []) {
      // Validates only special_clauses' own sub-schema, not the full
      // LeaseExtractedFieldsSchema — a document extracted under an older
      // schema version (missing a field added later, like area_sqm on
      // MINT Boutique's b10 contract) has a special_clauses array that is
      // itself perfectly valid, but a whole-object .strict() parse fails on
      // the unrelated missing keys and discards it anyway. Found live: real
      // clauses (HVAC warranty, exclusivity, late fees) silently dropped
      // from every Copiloto answer about that lease, with no error anywhere
      // to notice it by.
      const extractedFields = d.extracted_fields as Record<string, unknown> | null;
      const parsedClauses = LeaseExtractedFieldsSchema.shape.special_clauses.safeParse(
        extractedFields?.special_clauses,
      );
      documentDetailsById.set(d.id, {
        rawText: d.raw_text,
        specialClauses: parsedClauses.success ? parsedClauses.data : null,
      });
    }
  }

  const leasesBlock = leases.map((l) => {
    const doc = l.sourceDocumentId ? documentDetailsById.get(l.sourceDocumentId) : undefined;
    return {
      inquilino: l.tenantEntity,
      local: l.unitCode,
      m2: l.sqm,
      renta_mensual_mxn: l.rentMonthly,
      uso_permitido: l.permittedUse,
      clausula_exclusividad: l.exclusiveUseClause,
      inicio: l.startDate,
      vencimiento: l.endDate,
      // Precomputed rather than left for the model to derive from
      // `vencimiento` — the model has no reliable notion of "today" on its
      // own, and this is the exact same isExpired/renewalSoon precedence the
      // SSOT contracts table's status pill renders (contractStatusLabel), so
      // an answer here can't drift from what the landlord sees in the table
      // for the same lease.
      estatus_contractual: contractStatusLabel(l),
      matriz_responsabilidad: l.responsibilityMatrix ?? null,
      dias_aviso_terminacion: l.noticePeriodDays ?? null,
      clausulas_especiales: doc?.specialClauses ?? null,
      texto_completo_contrato: doc?.rawText ?? null,
    };
  });

  const ticketsBlock = tickets.map((t) => ({
    ticket: t.ticketNumber,
    local: t.unitNumber,
    estatus: t.status,
    prioridad: t.priority,
    responsable_costo: t.costBucket,
    costo_estimado_mxn: t.estimatedCost,
    reporte: t.rawReport,
    diagnostico: t.diagnosis,
    contratista: t.contractorName,
    creado: t.createdAt,
  }));

  const aggregates = computeContractAggregates(leases);
  return JSON.stringify({
    estadisticas_agregadas_contratos: {
      total_contratos: aggregates.totalContratos,
      contratos_digitalizados: aggregates.contratosDigitalizados,
      por_estatus: aggregates.porEstatus,
      por_anio_vencimiento: aggregates.porAnioVencimiento,
      responsabilidad_por_sistema: aggregates.responsabilidadPorSistema,
    },
    contratos_de_arrendamiento: leasesBlock,
    tickets_de_mantenimiento: ticketsBlock,
  });
}

// unstable_cache needs Next.js's incremental cache, which only exists inside
// an actual Next.js server request (dev/prod runtime) — not in
// scripts/golden-eval-runner.ts, which runs fetchDataBlock via plain tsx
// with no Next runtime at all. buildCopilotoRequest below tries this first
// and falls back to the raw fetchDataBlock on that specific failure, so the
// eval script keeps working uncached rather than breaking outright.
const getCachedDataBlock = unstable_cache(fetchDataBlock, ["copiloto-data-block"], {
  tags: [COPILOTO_CACHE_TAG],
  revalidate: 30,
});

// Shared by askCopiloto (non-streaming — used by scripts/golden-eval-runner.ts,
// which needs a plain string to grade) and askCopilotoStream (the live
// endpoint) so the two never drift on what data the model actually sees.
async function buildCopilotoRequest(question: string): Promise<CopilotoRequest> {
  let dataBlock: string;
  try {
    dataBlock = await getCachedDataBlock();
  } catch (err) {
    if (err instanceof Error && err.message.includes("incrementalCache")) {
      dataBlock = await fetchDataBlock();
    } else {
      throw err;
    }
  }

  return {
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          // Cached separately from the date/question below — the portfolio
          // barely changes between two questions in the same landlord
          // session, so a same-session follow-up question can hit this
          // block's cache instead of reprocessing the full data dump.
          {
            type: "text",
            text: `Datos reales de la plaza (JSON):\n${dataBlock}`,
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            // "Hoy" goes per-request, not into the cached blocks above: it's
            // a different value every day, and estatus_contractual already
            // carries the one date computation this endpoint actually needs
            // to get right — this is a fallback for anything else
            // date-relative the model might reason about (a model has no
            // reliable notion of the real-world "today" on its own).
            text: `Hoy es ${new Date().toISOString().slice(0, 10)}.\n\nPregunta del propietario: ${question}`,
          },
        ],
      },
    ],
  };
}

// claude-opus-5's extended thinking counts against max_tokens, and has no
// separate hard cap on this model (budget_tokens is rejected). Two levers
// instead of one: max_tokens raised to the SDK's own non-streaming default
// (16000, well past the ~2900 tokens a synthesis-heavy question measured
// at), and effort held to "medium" since this endpoint is data lookup +
// summary, not deep multi-step reasoning — cuts thinking spend at the
// source rather than just raising the ceiling it can hit.
const MODEL_PARAMS = {
  model: "claude-opus-5" as const,
  max_tokens: 16000,
  output_config: { effort: "medium" as const },
};

// Non-streaming — kept for scripts/golden-eval-runner.ts, which grades a
// complete answer against a golden reasoning anchor and has no UI to stream
// tokens into.
export async function askCopiloto(question: string): Promise<AskCopilotoResult> {
  const request = await buildCopilotoRequest(question);
  const client = new Anthropic();
  const response = await client.messages.create({ ...MODEL_PARAMS, ...request });

  const answer = response.content.find((block) => block.type === "text")?.text ?? "";
  if (!answer) {
    // Fail loudly rather than return {"answer": ""} — a blank box in the
    // Copiloto looked like the app silently doing nothing, when a real
    // token-budget or model failure was happening underneath it.
    return {
      error: `El agente no generó una respuesta (stop_reason: ${response.stop_reason}). Intenta de nuevo o reformula la pregunta.`,
    };
  }
  return { answer };
}

// Streaming — what /api/copiloto/ask actually serves. Same retrieval, same
// prompt, same model params as askCopiloto above; only the generation call
// differs, so the landlord sees the first tokens as soon as Claude produces
// them instead of waiting for the entire ~2900+ token answer to finish
// before anything renders.
export async function askCopilotoStream(question: string): Promise<ReadableStream<Uint8Array>> {
  const request = await buildCopilotoRequest(question);
  const client = new Anthropic();
  const anthropicStream = client.messages.stream({ ...MODEL_PARAMS, ...request });

  let sawText = false;
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      anthropicStream.on("text", (delta) => {
        sawText = true;
        controller.enqueue(encoder.encode(delta));
      });
      anthropicStream.on("end", () => {
        // Same "fail loudly, don't return a silent blank" principle as
        // askCopiloto's empty-answer check above — mid-stream there's no
        // status code left to change, so the explanation is sent as the
        // only text the client ever receives instead.
        if (!sawText) {
          controller.enqueue(
            encoder.encode(
              "El agente no generó una respuesta. Intenta de nuevo o reformula la pregunta.",
            ),
          );
        }
        controller.close();
      });
      anthropicStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      anthropicStream.abort();
    },
  });
}
