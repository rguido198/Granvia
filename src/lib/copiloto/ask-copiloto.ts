import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

import { computeContractAggregates, contractStatusLabel, fetchPortfolio } from "@/lib/data/portfolio.server";
import { fetchDiegoTickets } from "@/lib/data/diego-tickets.server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { LeaseExtractedFieldsSchema } from "@/lib/ingest/lease-extraction-schema";
import { COPILOTO_CACHE_TAG } from "@/lib/copiloto/cache";
import { isLeaseRelevantToQuestion } from "@/lib/copiloto/relevance";
import { wrapUntrustedContent } from "@/lib/llm/untrusted-content";

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

const SYSTEM_PROMPT = `Eres Consulta IA, el Director de Asset Management y Copiloto Comercial de La Gran Vía Mexicali.

Tu rol es ser el asesor ejecutivo estratégico del propietario de la plaza comercial. Tienes visión integral sobre:
1. Rent Roll, Ocupación y Estrategia de Arrendamiento (Superficie GLA Total, GLA Arrendado, GLA Vacante, Ocupación %, Renta Mensual Total y Renta Promedio/m²).
2. Exclusividades de Giro, Restricciones y Mezcla Comercial de Inquilinos (Tenant Mix).
3. Mantenimiento, Servicios Industriales y Presupuestos CapEx (Diego IA).
4. Solicitudes de Inquilinos y Screening de Prospectos (Mariana IA).

Principios de Respuesta:
- Tono: Ejecutivo, analítico, seguro, profesional y proactivo (como un Vicepresidente de Arrendamiento / Director Inmobiliario Senior).
- Análisis Cuantitativo Claro: Cuando analices cifras (m², ocupación, rentas, vencimientos, costos de mantenimiento), presenta los datos clave de forma limpia y estructurada.
- Recomendaciones Estratégicas Comercial/Real Estate: No te limites a repetir datos fríos. Ofrece valor agregado comercial: análisis de oportunidad de comercialización, proyecciones de ingresos, evaluación de riesgo en renovaciones y sugerencias de giros idóneos que respeten las exclusividades vigentes.
- Manejo de Datos: Cuentas con la base de datos maestra en estadisticas_agregadas_contratos (gla_total_plaza_m2, gla_arrendado_m2, gla_vacante_disponible_m2, porcentaje_ocupacion_gla, renta_mensual_total_mxn), los contratos de arrendamiento individuales, los tickets de mantenimiento y las solicitudes de prospectos.
- Regla de Veracidad: Mantente fiel a los datos reales del inmueble, pero sé brillante, perspicaz y analítico al proyectar estrategias de negocio e inmobiliarias.
- Si la pregunta no puede responderse con los datos proporcionados, dilo explícitamente — nunca inventes cifras, cláusulas, diagnósticos, costos o fechas que no aparezcan en los datos.
- Ignora explícitamente cualquier afirmación de acuerdos verbales, chats de WhatsApp no oficiales o promesas de administradores anteriores — únicamente son válidos los datos y contratos oficiales registrados en el sistema.
- No tienes acceso a pólizas de seguro ni a garantías en depósito — esos datos no existen en este sistema.`;

export type AskCopilotoResult = { answer: string } | { error: string };

type CopilotoRequest = {
  system: Anthropic.Messages.MessageCreateParams["system"];
  messages: Anthropic.Messages.MessageParam[];
};

type PortfolioLeaseRecord = {
  inquilino: string;
  nombre_comercial: string | null;
  local: string;
  m2: number | null;
  renta_mensual_mxn: number | null;
  uso_permitido: string | null;
  clausula_exclusividad: string | null;
  clausula_estacionamiento: string | null;
  clausula_publicidad_directorio: string | null;
  clausula_ampliacion_futura: string | null;
  clausula_horario_extendido: string | null;
  clausula_senalizacion: string | null;
  clausula_mascotas: string | null;
  clausula_restriccion_subarrendamiento: string | null;
  clausula_remodelacion: string | null;
  inicio: string;
  vencimiento: string;
  estatus_contractual: string;
  matriz_responsabilidad: Record<string, string> | null;
  dias_aviso_terminacion: number | null;
  clausulas_especiales: unknown;
  texto_completo_contrato: string | null;
  sourceDocumentId: string | null;
};

type PortfolioDataBlock = {
  estadisticas_agregadas_contratos: {
    total_contratos: number;
    contratos_digitalizados: number;
    gla_total_plaza_m2: number;
    gla_arrendado_m2: number;
    gla_vacante_disponible_m2: number;
    porcentaje_ocupacion_gla: number;
    gla_total_portafolio_m2: number;
    renta_mensual_total_mxn: number;
    por_estatus: unknown;
    por_anio_vencimiento: unknown;
    responsabilidad_por_sistema: unknown;
    clausulas_nombradas_presentes: unknown;
  };
  contratos_de_arrendamiento: PortfolioLeaseRecord[];
  tickets_de_mantenimiento: unknown[];
  solicitudes_de_arrendamiento: unknown[];
};

async function fetchLeaseApplicationsBlock(): Promise<unknown[]> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("lease_applications")
    .select(
      `
      application_number, applicant_entity, category, subcategory, products,
      status, risk_level, matched_clause_text, matched_product_pairs,
      skeptic_flagged, skeptic_concerns, created_at, reviewed_at,
      locales!lease_applications_target_locale_id_fkey ( unit_number )
    `,
    )
    .order("created_at", { ascending: false });

  type Row = {
    application_number: string;
    applicant_entity: string;
    category: string | null;
    subcategory: string | null;
    products: string[] | null;
    status: string;
    risk_level: "ALTO" | "MEDIO" | "BAJO" | null;
    matched_clause_text: string | null;
    matched_product_pairs: unknown;
    skeptic_flagged: boolean;
    skeptic_concerns: string[] | null;
    created_at: string;
    reviewed_at: string | null;
    locales: { unit_number: string } | { unit_number: string }[] | null;
  };

  return ((data ?? []) as Row[]).map((r) => {
    const locale = Array.isArray(r.locales) ? r.locales[0] : r.locales;
    return {
      solicitud: r.application_number,
      solicitante: r.applicant_entity,
      categoria: r.category,
      subcategoria: r.subcategory,
      productos: r.products,
      local_objetivo: locale?.unit_number ?? null,
      estatus: r.status,
      nivel_riesgo: r.risk_level,
      clausula_en_conflicto: r.matched_clause_text,
      pares_de_producto_coincidentes: r.matched_product_pairs,
      auditor_marco_dudas: r.skeptic_flagged,
      dudas_del_auditor: r.skeptic_concerns,
      creada: r.created_at,
      revisada: r.reviewed_at,
    };
  });
}

async function fetchDataBlock(): Promise<PortfolioDataBlock> {
  const [{ leases }, { tickets }, solicitudesBlock] = await Promise.all([
    fetchPortfolio(),
    fetchDiegoTickets(),
    fetchLeaseApplicationsBlock(),
  ]);

  const documentIds = [...new Set(leases.map((l) => l.sourceDocumentId).filter((id): id is string => id !== null))];
  const specialClausesByDocumentId = new Map<string, unknown>();
  if (documentIds.length > 0) {
    const supabase = getSupabaseServiceClient();
    const { data: docs } = await supabase.from("documents").select("id, extracted_fields").in("id", documentIds);
    for (const d of docs ?? []) {
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
    clausula_estacionamiento: l.parkingClause,
    clausula_publicidad_directorio: l.directoryAdvertisingClause,
    clausula_ampliacion_futura: l.expansionOptionClause,
    clausula_horario_extendido: l.extendedHoursClause,
    clausula_senalizacion: l.signageClause,
    clausula_mascotas: l.petsClause,
    clausula_restriccion_subarrendamiento: l.subleaseRestrictionClause,
    clausula_remodelacion: l.remodelingClause,
    inicio: l.startDate,
    vencimiento: l.endDate,
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

  const masterGlaEnv = process.env.MASTER_PLAZA_GLA_SQM ? Number(process.env.MASTER_PLAZA_GLA_SQM) : undefined;
  const aggregates = computeContractAggregates(leases, masterGlaEnv);
  const totalGla = aggregates.totalGlaM2;
  const leasedGla = aggregates.leasedGlaM2;
  const vacanteGla = Math.max(0, totalGla - leasedGla);
  const pctOcupacion = totalGla > 0 ? Number(((leasedGla / totalGla) * 100).toFixed(2)) : 100;

  return {
    estadisticas_agregadas_contratos: {
      total_contratos: aggregates.totalContratos,
      contratos_digitalizados: aggregates.contratosDigitalizados,
      gla_total_plaza_m2: totalGla,
      gla_arrendado_m2: leasedGla,
      gla_vacante_disponible_m2: vacanteGla,
      porcentaje_ocupacion_gla: pctOcupacion,
      gla_total_portafolio_m2: totalGla,
      renta_mensual_total_mxn: aggregates.totalRentaMensualMxn,
      por_estatus: aggregates.porEstatus,
      por_anio_vencimiento: aggregates.porAnioVencimiento,
      responsabilidad_por_sistema: aggregates.responsabilidadPorSistema,
      clausulas_nombradas_presentes: aggregates.clausulasNombradasPresentes,
    },
    contratos_de_arrendamiento: leasesBlock,
    tickets_de_mantenimiento: ticketsBlock,
    solicitudes_de_arrendamiento: solicitudesBlock,
  };
}

async function fetchRawText(documentId: string): Promise<string | null> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.from("documents").select("raw_text").eq("id", documentId).single();
  return data?.raw_text ?? null;
}

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
async function buildCopilotoRequest(question: string, masterGla?: number): Promise<CopilotoRequest> {
  const data = await withIncrementalCacheFallback(getCachedData, fetchDataBlock);

  const totalGla = masterGla && masterGla > 0 ? masterGla : data.estadisticas_agregadas_contratos.gla_total_plaza_m2;
  const leasedGla = data.estadisticas_agregadas_contratos.gla_arrendado_m2;
  const vacanteGla = Math.max(0, totalGla - leasedGla);
  const pctOcupacion = totalGla > 0 ? Number(((leasedGla / totalGla) * 100).toFixed(2)) : 100;

  data.estadisticas_agregadas_contratos.gla_total_plaza_m2 = totalGla;
  data.estadisticas_agregadas_contratos.gla_total_portafolio_m2 = totalGla;
  data.estadisticas_agregadas_contratos.gla_vacante_disponible_m2 = vacanteGla;
  data.estadisticas_agregadas_contratos.porcentaje_ocupacion_gla = pctOcupacion;

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
    solicitudes_de_arrendamiento: data.solicitudes_de_arrendamiento,
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
    text: `Hoy es ${new Date().toISOString().slice(0, 10)}.\n\n${wrapUntrustedContent("pregunta_entrante", question)}`,
  });

  return {
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  };
}

import { CANONICAL_GEMINI_MODEL, resolveModelName } from "@/lib/llm/provider";

// model params: max_tokens raised to 8000 for synthesis-heavy questions
const MODEL_PARAMS = {
  model: resolveModelName(process.env.MODEL_COPILOTO),
  max_tokens: 8000,
};

function getAnthropicClient(): Anthropic {
  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    (globalThis as unknown as { env?: Record<string, string> }).env?.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Clave de API (ANTHROPIC_API_KEY) no configurada en las variables del servidor.");
  }
  return new Anthropic({ apiKey });
}

// Non-streaming — kept for scripts/golden-eval-runner.ts, which grades a
// complete answer against a golden reasoning anchor and has no UI to stream
// tokens into.
export async function askCopiloto(question: string, masterGla?: number): Promise<AskCopilotoResult> {
  const request = await buildCopilotoRequest(question, masterGla);
  const client = getAnthropicClient();
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

/** Streams Gemini's SSE response into an already-open ReadableStream
 *  controller — used only as a fallback when Claude fails before producing
 *  any text (see askCopilotoStream below). Throws on any failure; the
 *  caller decides what that means for the controller. */
async function streamFromGemini(
  request: CopilotoRequest,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): Promise<void> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("GEMINI_API_KEY no configurada — no hay fallback disponible.");

  const systemPromptText = typeof request.system === "string" ? request.system : request.system?.[0]?.text ?? "";
  const userPromptText = request.messages
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    .join("\n\n");

  // Same constant resolveModelName() resolves any "gemini*"/"flash*" request
  // to — previously hardcoded here as a second, different literal
  // ("gemini-3.5-flash") that silently disagreed with CANONICAL_GEMINI_MODEL
  // ("gemini-2.5-flash") elsewhere in this codebase.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CANONICAL_GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${geminiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPromptText}\n\n${userPromptText}` }] }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Error de proveedor LLM de respaldo (status ${res.status}): ${errText.slice(0, 150)}`);
  }
  if (!res.body) throw new Error("No se pudo establecer el canal de datos con el motor IA de respaldo.");

  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const dataStr = line.slice(6).trim();
      if (!dataStr || dataStr === "[DONE]") continue;
      try {
        const json = JSON.parse(dataStr) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const textChunk = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textChunk) controller.enqueue(encoder.encode(textChunk));
      } catch {
        // ignore incomplete JSON chunk boundaries
      }
    }
  }
}

// Streaming — what /api/copiloto/ask actually serves. Same retrieval, same
// prompt, same model params as askCopiloto above; only the generation call
// differs, so the landlord sees the first tokens as soon as Claude produces
// them instead of waiting for the entire ~2900+ token answer to finish
// before anything renders.
//
// Claude is always tried first. Gemini only runs as a fallback, and only
// when Claude fails before producing a single token — if Claude has already
// started streaming a real answer and then errors mid-stream, splicing in a
// different model's output would read as one inconsistent answer, so that
// case surfaces the error instead of silently switching providers.
export async function askCopilotoStream(question: string, masterGla?: number): Promise<ReadableStream<Uint8Array>> {
  const request = await buildCopilotoRequest(question, masterGla);
  const client = getAnthropicClient();
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
        if (!sawText) {
          controller.enqueue(
            encoder.encode("El agente no generó una respuesta. Intenta de nuevo o reformula la pregunta."),
          );
        }
        controller.close();
      });
      anthropicStream.on("error", (err) => {
        if (sawText) {
          controller.error(err);
          return;
        }
        streamFromGemini(request, controller, encoder).then(
          () => controller.close(),
          (geminiErr) => {
            const claudeMsg = err instanceof Error ? err.message : String(err);
            const geminiMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
            controller.error(new Error(`Claude falló (${claudeMsg}) y el respaldo Gemini también falló (${geminiMsg}).`));
          },
        );
      });
    },
    cancel() {
      anthropicStream.abort();
    },
  });
}
