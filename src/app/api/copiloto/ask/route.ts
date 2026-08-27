import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { contractStatusLabel, fetchPortfolio } from "@/lib/data/portfolio.server";
import { fetchDiegoTickets } from "@/lib/data/diego-tickets.server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { LeaseExtractedFieldsSchema } from "@/lib/ingest/lease-extraction-schema";

/**
 * The real Copiloto ask-endpoint. Deterministic SQL retrieval (fetchPortfolio /
 * fetchDiegoTickets — the exact same real data the Rent Roll, Legal and Diego
 * tabs render) feeding one grounded Claude call — not RAG (the portfolio is
 * small enough to pass in full, no embeddings/vector search needed) and not
 * agentic (one retrieval, one generation, no tool-use loop). See the session
 * discussion this route follows from: at 83 leases, a single well-scoped
 * query beats either architecture on accuracy, latency, and cost.
 *
 * One agent, not two. Both datasets are small enough to pass in full on
 * every question, so there's no real reason to make the landlord pick
 * "Mariana" or "Diego" before asking — the model just has both leases and
 * tickets in context and answers whatever's actually asked.
 */

const SYSTEM_PROMPT = `Eres el Copiloto IA de La Gran Vía Mexicali — cubres tanto los contratos de arrendamiento (antes "Mariana") como los tickets de mantenimiento y CapEx (antes "Diego"). Respondes preguntas del propietario usando únicamente los datos reales que se te proporcionan a continuación.

Reglas:
- Responde en español, de forma directa y ejecutiva.
- Cita el inquilino y el local (ej. "Ashley Furniture, Local A-01") cuando refieras un contrato, y el número de ticket y el local (ej. "INC-006, Local LOC-12") cuando refieras un caso de mantenimiento.
- La matriz de responsabilidad de mantenimiento (matriz_responsabilidad) y los días de aviso de terminación (dias_aviso_terminacion) provienen del contrato digitalizado y verificado por el propietario — cítalos como tales cuando los uses. Si son null, dilo explícitamente: ese contrato aún no ha sido digitalizado o verificado.
- Cada contrato incluye estatus_contractual ("Vigente" / "Renovación Próxima" / "Vencido"), ya calculado a partir de la fecha de hoy que se te da al inicio del mensaje — úsalo directamente para cualquier pregunta sobre si un contrato está vigente, por vencer o vencido. No lo recalcules tú mismo a partir de "vencimiento": es el mismo estatus exacto que ve el propietario en la tabla de contratos, y un cálculo propio podría no coincidir.
- Cuando un contrato incluya texto_completo_contrato (el documento digitalizado íntegro) o clausulas_especiales (cláusulas fuera de lo estándar detectadas en Gate 2), úsalos para responder cualquier pregunta sobre ese contrato que los campos estructurados no cubran — no te limites a matriz_responsabilidad/uso_permitido/clausula_exclusividad si la respuesta real está en el texto completo. Si ambos son null, ese contrato aún no ha sido digitalizado — dilo explícitamente en vez de responder solo con lo poco que sí tienes.
- Si la pregunta no puede responderse con los datos proporcionados, dilo explícitamente — nunca inventes cifras, cláusulas, diagnósticos, costos o fechas que no aparezcan en los datos.
- No tienes acceso a pólizas de seguro ni a garantías en depósito — esos datos no existen en este sistema.`;

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { question } = body as { question?: string };
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

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
      const parsed = LeaseExtractedFieldsSchema.safeParse(d.extracted_fields);
      documentDetailsById.set(d.id, {
        rawText: d.raw_text,
        specialClauses: parsed.success ? parsed.data.special_clauses : null,
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

  const dataBlock = JSON.stringify({ contratos_de_arrendamiento: leasesBlock, tickets_de_mantenimiento: ticketsBlock });

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-5",
    // claude-opus-5's extended thinking counts against max_tokens, and has no
    // separate hard cap on this model (budget_tokens is rejected). Two levers
    // instead of one: max_tokens raised to the SDK's own non-streaming default
    // (16000, well past the ~2900 tokens a synthesis-heavy question measured
    // at), and effort held to "medium" since this endpoint is data lookup +
    // summary, not deep multi-step reasoning — cuts thinking spend at the
    // source rather than just raising the ceiling it can hit.
    max_tokens: 16000,
    output_config: { effort: "medium" },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        // "Hoy" goes per-request, not into the cached system prompt: it's a
        // different value every day, and estatus_contractual already carries
        // the one date computation this endpoint actually needs to get
        // right — this is a fallback for anything else date-relative the
        // model might reason about (a model has no reliable notion of the
        // real-world "today" on its own).
        content: `Hoy es ${new Date().toISOString().slice(0, 10)}.\n\nDatos reales de la plaza (JSON):\n${dataBlock}\n\nPregunta del propietario: ${question}`,
      },
    ],
  });

  const answer = response.content.find((block) => block.type === "text")?.text ?? "";
  if (!answer) {
    // Fail loudly rather than return {"answer": ""} — a blank box in the
    // Copiloto looked like the app silently doing nothing, when a real
    // token-budget or model failure was happening underneath it.
    return NextResponse.json(
      { error: `El agente no generó una respuesta (stop_reason: ${response.stop_reason}). Intenta de nuevo o reformula la pregunta.` },
      { status: 502 },
    );
  }
  return NextResponse.json({ answer });
}
