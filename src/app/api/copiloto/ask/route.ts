import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { fetchPortfolio } from "@/lib/data/portfolio.server";
import { fetchDiegoTickets } from "@/lib/data/diego-tickets.server";

/**
 * The real Copiloto ask-endpoint. Deterministic SQL retrieval (fetchPortfolio /
 * fetchDiegoTickets — the exact same real data the Rent Roll, Legal and Diego
 * tabs render) feeding one grounded Claude call — not RAG (the portfolio is
 * small enough to pass in full, no embeddings/vector search needed) and not
 * agentic (one retrieval, one generation, no tool-use loop). See the session
 * discussion this route follows from: at 83 leases, a single well-scoped
 * query beats either architecture on accuracy, latency, and cost.
 */

const MARIANA_SYSTEM_PROMPT = `Eres Mariana, la agente legal de arrendamiento de La Gran Vía Mexicali. Respondes preguntas del propietario sobre los contratos de arrendamiento reales de la plaza, usando únicamente los datos que se te proporcionan a continuación.

Reglas:
- Responde en español, de forma directa y ejecutiva.
- Cita el inquilino y el local (ej. "Ashley Furniture, Local A-01") cuando refieras un contrato específico.
- Si la pregunta no puede responderse con los datos proporcionados, dilo explícitamente — nunca inventes cifras, cláusulas o fechas que no aparezcan en los datos.
- No tienes acceso a pólizas de seguro, garantías en depósito, ni documentos PDF — esos datos no existen en este sistema. Si te preguntan por ellos, acláralo.`;

const DIEGO_SYSTEM_PROMPT = `Eres Diego, el agente de mantenimiento y CapEx de La Gran Vía Mexicali. Respondes preguntas del propietario sobre los tickets de mantenimiento reales de la plaza, usando únicamente los datos que se te proporcionan a continuación.

Reglas:
- Responde en español, de forma directa y ejecutiva.
- Cita el número de ticket y el local cuando refieras un caso específico.
- Si la pregunta no puede responderse con los datos proporcionados, dilo explícitamente — nunca inventes diagnósticos, costos o fechas que no aparezcan en los datos.`;

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { agent, question } = body as { agent?: string; question?: string };
  if (agent !== "diego" && agent !== "mariana") {
    return NextResponse.json({ error: "agent must be 'diego' or 'mariana'" }, { status: 400 });
  }
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  let systemPrompt: string;
  let dataBlock: string;

  if (agent === "mariana") {
    const { leases } = await fetchPortfolio();
    systemPrompt = MARIANA_SYSTEM_PROMPT;
    dataBlock = JSON.stringify(
      leases.map((l) => ({
        inquilino: l.tenantEntity,
        local: l.unitCode,
        m2: l.sqm,
        renta_mensual_mxn: l.rentMonthly,
        uso_permitido: l.permittedUse,
        clausula_exclusividad: l.exclusiveUseClause,
        inicio: l.startDate,
        vencimiento: l.endDate,
      })),
    );
  } else {
    const { tickets } = await fetchDiegoTickets();
    systemPrompt = DIEGO_SYSTEM_PROMPT;
    dataBlock = JSON.stringify(
      tickets.map((t) => ({
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
      })),
    );
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Datos reales de la plaza (JSON):\n${dataBlock}\n\nPregunta del propietario: ${question}`,
      },
    ],
  });

  const answer = response.content.find((block) => block.type === "text")?.text ?? "";
  return NextResponse.json({ answer });
}
