import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

import { computeContractAggregates, contractStatusLabel, fetchPortfolio } from "@/lib/data/portfolio.server";
import { fetchDiegoTickets } from "@/lib/data/diego-tickets.server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { LeaseExtractedFieldsSchema } from "@/lib/ingest/lease-extraction-schema";
import { COPILOTO_CACHE_TAG } from "@/lib/copiloto/cache";
import { isLeaseRelevantToQuestion } from "@/lib/copiloto/relevance";

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
- inquilino es la razón social (nombre legal registrado) del arrendatario. nombre_comercial es su marca u operación pública cuando el contrato distingue una de la otra (p. ej. inquilino "Restaurantes del Noroeste, S.A. de C.V.", nombre_comercial "Cabanna") — puede no compartir ninguna palabra con inquilino, no es una variante de ese mismo nombre. Si el propietario pregunta por el nombre comercial/marca, usa nombre_comercial; si pregunta por la razón social o RFC/facturación, usa inquilino. Si nombre_comercial es null, el contrato no distingue los dos y basta con inquilino.
- La matriz de responsabilidad de mantenimiento (matriz_responsabilidad) y los días de aviso de terminación (dias_aviso_terminacion) provienen del contrato digitalizado y verificado por el propietario — cítalos como tales cuando los uses. Si son null, dilo explícitamente: ese contrato aún no ha sido digitalizado o verificado.
- Cada contrato incluye estatus_contractual ("Vigente" / "Renovación Próxima" / "Vencido"), ya calculado a partir de la fecha de hoy que se te da al inicio del mensaje — úsalo directamente para cualquier pregunta sobre si un contrato está vigente, por vencer o vencido. No lo recalcules tú mismo a partir de "vencimiento": es el mismo estatus exacto que ve el propietario en la tabla de contratos, y un cálculo propio podría no coincidir.
- Cuando un contrato incluya texto_completo_contrato (el documento digitalizado íntegro) o clausulas_especiales (cláusulas fuera de lo estándar detectadas en Gate 2), úsalos para responder cualquier pregunta sobre ese contrato que los campos estructurados no cubran — no te limites a matriz_responsabilidad/uso_permitido/clausula_exclusividad si la respuesta real está en el texto completo.
- texto_completo_contrato solo se carga para el contrato al que la pregunta realmente se refiere (por inquilino o local nombrado) — no para toda la cartera en cada pregunta. Si texto_completo_contrato es null PERO matriz_responsabilidad o dias_aviso_terminacion NO son null, ese contrato SÍ está digitalizado — el texto completo simplemente no se cargó para esta pregunta porque no la nombraste; dilo así ("el contrato está digitalizado, pero no cargué el texto completo para esta pregunta — pregunta directamente sobre [inquilino/local] si necesitas ese detalle") en vez de decir que el contrato no ha sido digitalizado. Solo di "no ha sido digitalizado" cuando matriz_responsabilidad Y dias_aviso_terminacion sean ambos null también.
- Para cualquier pregunta que pida un CONTEO o agregado entre varios contratos ("¿cuántos contratos vencen este año?", "¿cuántos inquilinos tienen el HVAC a su cargo?", "¿cuántos contratos están vigentes?"), usa directamente estadisticas_agregadas_contratos — nunca cuentes tú mismo recorriendo el arreglo de contratos_de_arrendamiento. Un conteo propio sobre docenas de registros es exactamente el tipo de tarea donde un modelo puede equivocarse en silencio; estadisticas_agregadas_contratos ya viene calculado de forma determinista. responsabilidad_por_sistema solo cuenta contratos_digitalizados, no total_contratos — acláralo si la pregunta lo amerita (ej. "de los 3 contratos digitalizados, 2 tienen el HVAC a cargo del arrendatario; los otros 82 aún no han sido digitalizados").
- Si la pregunta no puede responderse con los datos proporcionados, dilo explícitamente — nunca inventes cifras, cláusulas, diagnósticos, costos o fechas que no aparezcan en los datos.
- No tienes acceso a pólizas de seguro ni a garantías en depósito — esos datos no existen en este sistema.`;

export type AskCopilotoResult = { answer: string } | { error: string };

type CopilotoRequest = {
  system: Anthropic.Messages.MessageCreateParams["system"];
  messages: Anthropic.Messages.MessageParam[];
};

type PortfolioLeaseRecord = {
  inquilino: string;
  // The operating brand/DBA name when the digitized contract states one
  // distinct from `inquilino` (its registered legal name) — e.g. inquilino
  // "Restaurantes del Noroeste, S.A. de C.V.", nombre_comercial "Cabanna".
  // null for an undigitized lease, or one whose contract never distinguishes
  // the two. See SYSTEM_PROMPT's guidance on citing both.
  nombre_comercial: string | null;
  local: string;
  m2: number | null;
  renta_mensual_mxn: number | null;
  uso_permitido: string | null;
  clausula_exclusividad: string | null;
  inicio: string;
  vencimiento: string;
  estatus_contractual: string;
  matriz_responsabilidad: Record<string, string> | null;
  dias_aviso_terminacion: number | null;
  clausulas_especiales: unknown;
  texto_completo_contrato: string | null;
  // Not sent to the model (stripped in buildCopilotoRequest) — kept here so
  // buildCopilotoRequest can fetch this lease's raw_text on demand once it
  // knows the question is actually about it. See isLeaseRelevantToQuestion.
  sourceDocumentId: string | null;
};

type PortfolioDataBlock = {
  estadisticas_agregadas_contratos: {
    total_contratos: number;
    contratos_digitalizados: number;
    por_estatus: unknown;
    por_anio_vencimiento: unknown;
    responsabilidad_por_sistema: unknown;
  };
  contratos_de_arrendamiento: PortfolioLeaseRecord[];
  tickets_de_mantenimiento: unknown[];
};

// The Supabase retrieval + assembly below is identical for every question
// asked in a session — only the date line, the question, and which lease's
// raw_text (if any) gets attached change per call. Wrapped in unstable_cache
// so a same-session follow-up question skips re-querying leases/tickets/
// documents entirely, on top of the Anthropic-side prompt cache already
// covering the assembled block. 30s revalidate is a safety net;
// invalidateCopilotoCache() (called from every write path that touches
// leases/tickets/documents) is the real freshness mechanism.
//
// texto_completo_contrato is always null here regardless of digitization —
// deliberately. A real commercial lease runs 20-50 pages; dumping every
// digitized lease's full text into every question doesn't scale past a
// couple of digitized leases, the exact risk the pipeline's own design doc
// flagged and deferred ("raw_text ... never dumped in bulk"). This base
// block only carries the ~9 structured fields per lease, which stay cheap
// regardless of portfolio size. buildCopilotoRequest splices in the one or
// two relevant leases' raw_text separately, only when the question actually
// names that tenant/unit.
async function fetchDataBlock(): Promise<PortfolioDataBlock> {
  const [{ leases }, { tickets }] = await Promise.all([fetchPortfolio(), fetchDiegoTickets()]);

  const documentIds = [...new Set(leases.map((l) => l.sourceDocumentId).filter((id): id is string => id !== null))];
  const specialClausesByDocumentId = new Map<string, unknown>();
  if (documentIds.length > 0) {
    const supabase = getSupabaseServiceClient();
    const { data: docs } = await supabase.from("documents").select("id, extracted_fields").in("id", documentIds);
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
      specialClausesByDocumentId.set(d.id, parsedClauses.success ? parsedClauses.data : null);
    }
  }

  const leasesBlock: PortfolioLeaseRecord[] = leases.map((l) => ({
    inquilino: l.tenantEntity,
    nombre_comercial: l.tradeName,
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
    clausulas_especiales: l.sourceDocumentId ? (specialClausesByDocumentId.get(l.sourceDocumentId) ?? null) : null,
    texto_completo_contrato: null,
    sourceDocumentId: l.sourceDocumentId,
  }));

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
  return {
    estadisticas_agregadas_contratos: {
      total_contratos: aggregates.totalContratos,
      contratos_digitalizados: aggregates.contratosDigitalizados,
      por_estatus: aggregates.porEstatus,
      por_anio_vencimiento: aggregates.porAnioVencimiento,
      responsabilidad_por_sistema: aggregates.responsabilidadPorSistema,
    },
    contratos_de_arrendamiento: leasesBlock,
    tickets_de_mantenimiento: ticketsBlock,
  };
}

async function fetchRawText(documentId: string): Promise<string | null> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.from("documents").select("raw_text").eq("id", documentId).single();
  return data?.raw_text ?? null;
}

// unstable_cache needs Next.js's incremental cache, which only exists inside
// an actual Next.js server request (dev/prod runtime) — not in
// scripts/golden-eval-runner.ts, which runs these via plain tsx with no
// Next runtime at all. getCachedData/getCachedRawText below are tried first;
// both call sites fall back to the raw fetch on that specific failure, so
// the eval script keeps working uncached rather than breaking outright.
const getCachedData = unstable_cache(fetchDataBlock, ["copiloto-data-block"], {
  tags: [COPILOTO_CACHE_TAG],
  revalidate: 30,
});
const getCachedRawText = unstable_cache(fetchRawText, ["copiloto-raw-text"], {
  tags: [COPILOTO_CACHE_TAG],
  revalidate: 30,
});

async function withIncrementalCacheFallback<T>(cached: () => Promise<T>, raw: () => Promise<T>): Promise<T> {
  try {
    return await cached();
  } catch (err) {
    if (err instanceof Error && err.message.includes("incrementalCache")) {
      return await raw();
    }
    throw err;
  }
}

// Shared by askCopiloto (non-streaming — used by scripts/golden-eval-runner.ts,
// which needs a plain string to grade) and askCopilotoStream (the live
// endpoint) so the two never drift on what data the model actually sees.
async function buildCopilotoRequest(question: string): Promise<CopilotoRequest> {
  const data = await withIncrementalCacheFallback(getCachedData, fetchDataBlock);

  // Only fetch (and only send) raw_text for the lease(s) this question
  // actually names — see fetchDataBlock's comment for why the base block
  // never carries it. Most questions match zero or one lease; a global
  // question ("how many leases expire this year") matches none, which is
  // correct — the aggregates already cover that without any raw text.
  const relevantLeases = data.contratos_de_arrendamiento.filter(
    (l) =>
      l.sourceDocumentId &&
      isLeaseRelevantToQuestion(question, { tenantEntity: l.inquilino, unitCode: l.local, tradeName: l.nombre_comercial }),
  );
  const relevantTexts: { inquilino: string; local: string; texto_completo_contrato: string }[] = [];
  for (const l of relevantLeases) {
    const documentId = l.sourceDocumentId as string;
    const rawText = await withIncrementalCacheFallback(
      () => getCachedRawText(documentId),
      () => fetchRawText(documentId),
    );
    if (rawText) relevantTexts.push({ inquilino: l.inquilino, local: l.local, texto_completo_contrato: rawText });
  }

  // sourceDocumentId (internal, used just above) and texto_completo_contrato
  // (always null on the base block — see fetchDataBlock) are stripped
  // before this reaches the model.
  const baseBlock = JSON.stringify({
    estadisticas_agregadas_contratos: data.estadisticas_agregadas_contratos,
    contratos_de_arrendamiento: data.contratos_de_arrendamiento.map(
      ({ sourceDocumentId: _sourceDocumentId, texto_completo_contrato: _texto_completo_contrato, ...rest }) => rest,
    ),
    tickets_de_mantenimiento: data.tickets_de_mantenimiento,
  });

  const content: Anthropic.Messages.TextBlockParam[] = [
    // Cached separately from everything below — this is the part that stays
    // byte-identical across every question in a session regardless of
    // portfolio size, so it's the one worth Anthropic-side caching.
    {
      type: "text",
      text: `Datos reales de la plaza (JSON, sin texto completo de contratos):\n${baseBlock}`,
      cache_control: { type: "ephemeral" },
    },
  ];
  if (relevantTexts.length > 0) {
    // Deliberately uncached — its content is whichever lease(s) this
    // specific question named, so it changes question to question and
    // caching it wouldn't hit anyway. Bounded to the matched lease(s)
    // instead of the whole portfolio, so it stays cheap even at 85
    // digitized leases.
    content.push({
      type: "text",
      text: `Texto completo del/de los contrato(s) relevantes a esta pregunta:\n${JSON.stringify(relevantTexts)}`,
    });
  }
  content.push({
    type: "text",
    // "Hoy" goes per-request, not into the cached block above: it's a
    // different value every day, and estatus_contractual already carries
    // the one date computation this endpoint actually needs to get right —
    // this is a fallback for anything else date-relative the model might
    // reason about (a model has no reliable notion of the real-world
    // "today" on its own).
    text: `Hoy es ${new Date().toISOString().slice(0, 10)}.\n\nPregunta del propietario: ${question}`,
  });

  return {
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
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
