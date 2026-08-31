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

const SYSTEM_PROMPT = `Eres Consulta IA de La Gran Vía Mexicali — cubres los contratos de arrendamiento y la pantalla de exclusividades para prospectos (antes "Mariana"), los tickets de mantenimiento y CapEx (antes "Diego"), y las solicitudes de arrendamiento de nuevos inquilinos. Respondes preguntas del propietario usando únicamente los datos reales que se te proporcionan a continuación.

Reglas:
- Responde en español, de forma directa y ejecutiva.
- Cita el inquilino y el local (ej. "Ashley Furniture, Local A-01") cuando refieras un contrato, el número de ticket y el local (ej. "INC-006, Local LOC-12") cuando refieras un caso de mantenimiento, y el número de solicitud (ej. "APP-006") cuando refieras una solicitud de arrendamiento.
- solicitudes_de_arrendamiento contiene toda solicitud de un prospecto interesado en rentar un local (screening de exclusividad de Mariana) — estatus needs_landlord_review significa pendiente de tu revisión; approved/rejected ya fueron resueltas. Nunca digas que el sistema no maneja solicitudes de arrendamiento: sí las maneja, están en este arreglo.
- inquilino es la razón social (nombre legal registrado) del arrendatario. nombre_comercial es su marca u operación pública cuando el contrato distingue una de la otra (p. ej. inquilino "Restaurantes del Noroeste, S.A. de C.V.", nombre_comercial "Cabanna") — puede no compartir ninguna palabra con inquilino, no es una variante de ese mismo nombre. Si el propietario pregunta por el nombre comercial/marca, usa nombre_comercial; si pregunta por la razón social o RFC/facturación, usa inquilino. Si nombre_comercial es null, el contrato no distingue los dos y basta con inquilino.
- La matriz de responsabilidad de mantenimiento (matriz_responsabilidad) y los días de aviso de terminación (dias_aviso_terminacion) provienen del contrato digitalizado y verificado por el propietario — cítalos como tales cuando los uses. Si son null, dilo explícitamente: ese contrato aún no ha sido digitalizado o verificado.
- Cada contrato incluye estatus_contractual ("Vigente" / "Renovación Próxima" / "Vencido"), ya calculado a partir de la fecha de hoy que se te da al inicio del mensaje — úsalo directamente para cualquier pregunta sobre si un contrato está vigente, por vencer o vencido. No lo recalcules tú mismo a partir de "vencimiento": es el mismo estatus exacto que ve el propietario en la tabla de contratos, y un cálculo propio podría no coincidir.
- clausula_estacionamiento, clausula_publicidad_directorio, clausula_ampliacion_futura, clausula_horario_extendido, clausula_senalizacion, clausula_mascotas, clausula_restriccion_subarrendamiento y clausula_remodelacion son cláusulas ya extraídas del contrato digitalizado — úsalas directamente, no las busques en clausulas_especiales (esas ocho ya no aparecen ahí, se extraen aparte). null significa que el contrato no otorga ni menciona esa cláusula, no que falte digitalizar el contrato.
- Cuando un contrato incluya texto_completo_contrato (el documento digitalizado íntegro) o clausulas_especiales (cláusulas fuera de lo estándar detectadas en Gate 2, distintas de las ocho cláusulas nombradas arriba), úsalos para responder cualquier pregunta sobre ese contrato que los campos estructurados no cubran — no te limites a matriz_responsabilidad/uso_permitido/clausula_exclusividad si la respuesta real está en el texto completo.
- texto_completo_contrato solo se carga para el contrato al que la pregunta realmente se refiere (por inquilino o local nombrado) — no para toda la cartera en cada pregunta. Si texto_completo_contrato es null PERO matriz_responsabilidad o dias_aviso_terminacion NO son null, ese contrato SÍ está digitalizado — el texto completo simplemente no se cargó para esta pregunta porque no la nombraste; dilo así ("el contrato está digitalizado, pero no cargué el texto completo para esta pregunta — pregunta directamente sobre [inquilino/local] si necesitas ese detalle") en vez de decir que el contrato no ha sido digitalizado. Solo di "no ha sido digitalizado" cuando matriz_responsabilidad Y dias_aviso_terminacion sean ambos null también.
- Para cualquier pregunta que pida un CONTEO o agregado entre varios contratos ("¿cuántos contratos vencen este año?", "¿cuál es el GLA total o porcentaje de ocupación?", "¿cuántos inquilinos tienen el HVAC a su cargo?", "¿cuántos contratos están vigentes?"), usa directamente estadisticas_agregadas_contratos — contiene gla_total_plaza_m2 (superficie rentable total del inmueble), gla_arrendado_m2 (superficie bajo contrato activo), gla_vacante_disponible_m2 (superficie rentable disponible para nuevos inquilinos), porcentaje_ocupacion_gla y renta_mensual_total_mxn precalculados. Nunca cuentes tú mismo ni digas que falta el dato del GLA total cuando estadisticas_agregadas_contratos tiene gla_total_plaza_m2 y porcentaje_ocupacion_gla. Un conteo o suma propia sobre docenas de registros es exactamente donde un modelo puede equivocarse; estadisticas_agregadas_contratos ya viene calculado de forma determinista. responsabilidad_por_sistema y clausulas_nombradas_presentes solo cuentan contratos_digitalizados, no total_contratos — acláralo si la pregunta lo amerita.
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

import { resolveModelName } from "@/lib/llm/provider";

// model params: max_tokens raised to 8000 for synthesis-heavy questions
const MODEL_PARAMS = {
  model: process.env.MODEL_COPILOTO ? resolveModelName(process.env.MODEL_COPILOTO) : "claude-3-5-sonnet-20241022",
  max_tokens: 8000,
};

// Non-streaming — kept for scripts/golden-eval-runner.ts, which grades a
// complete answer against a golden reasoning anchor and has no UI to stream
// tokens into.
export async function askCopiloto(question: string, masterGla?: number): Promise<AskCopilotoResult> {
  const request = await buildCopilotoRequest(question, masterGla);
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
export async function askCopilotoStream(question: string, masterGla?: number): Promise<ReadableStream<Uint8Array>> {
  const request = await buildCopilotoRequest(question, masterGla);
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
