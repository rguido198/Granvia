import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type GoldenCase = {
  id: string;
  agent_focus: string;
  query: string;
  target_source_field: string;
  golden_reasoning_anchor: string;
  golden_prose_answer: string;
};

// Mock portfolio context for MINT Boutique (Unit B-10 / Local 66) & plaza anchors to supply complete context for the benchmark
const MOCK_PORTFOLIO_DATA = {
  estadisticas_agregadas_contratos: {
    total_contratos: 5,
    contratos_digitalizados: 5,
    por_estatus: { Vigente: 5 },
    por_anio_vencimiento: { "2026": 2, "2027": 3 },
    responsabilidad_por_sistema: { hvac: { Arrendatario: 3, Arrendador: 2 } },
    clausulas_nombradas_presentes: { clausula_exclusividad: 3 }
  },
  contratos_de_arrendamiento: [
    {
      inquilino: "MINT BOUTIQUE, S.A. DE C.V.",
      nombre_comercial: "MINT Boutique",
      local: "Local B-10 (Local 66)",
      m2: 95,
      renta_mensual_mxn: 45000,
      uso_permitido: "venta de ropa de diseño importado para dama y alta costura femenina",
      clausula_exclusividad: "venta de ropa de diseño importado para dama y alta costura femenina",
      clausula_estacionamiento: "2 cajones preferenciales marcados B-10",
      clausula_publicidad_directorio: "mención destacada en directorio digital",
      clausula_ampliacion_futura: null,
      clausula_horario_extendido: null,
      clausula_senalizacion: "logotipo en marquesina frontal",
      clausula_mascotas: null,
      clausula_restriccion_subarrendamiento: "subarrendamiento prohibido sin autorización previa por escrito del arrendador",
      clausula_remodelacion: null,
      inicio: "2023-01-15",
      vencimiento: "2026-01-15",
      estatus_contractual: "Vigente",
      matriz_responsabilidad: {
        hvac: "Arrendatario",
        roof: "Arrendador",
        plumbing: "Arrendatario",
        electrical: "Arrendatario"
      },
      dias_aviso_terminacion: 90,
      clausulas_especiales: [
        "Cláusula Sexta: La unidad HVAC Carrier Serie HVAC-B10-2023 cuenta con garantía de fábrica vigente hasta el 31 de diciembre de 2027 que cubre fallas de fabricación y componentes cubiertos a costo $0 para el inquilino."
      ]
    },
    {
      inquilino: "CINÉPOLIS DE MÉXICO, S.A. DE C.V.",
      nombre_comercial: "Cinépolis",
      local: "Zone D (Anchor)",
      m2: 4500,
      renta_mensual_mxn: 350000,
      uso_permitido: "exhibición cinematográfica y dulcería",
      clausula_exclusividad: "exhibición de películas y salas de cine comercial",
      inicio: "2020-01-01",
      vencimiento: "2030-01-01",
      estatus_contractual: "Vigente",
      matriz_responsabilidad: { hvac: "Arrendatario", roof: "Arrendador" },
      dias_aviso_terminacion: 180
    }
  ],
  tickets_de_mantenimiento: [
    {
      ticket_id: "INC-008",
      local: "Local B-10 (Local 66)",
      inquilino: "MINT Boutique",
      diagnostico: "el aire acondicionado dejó de enfriar por completo esta mañana",
      estatus: "needs_approval",
      costo_estimado_mxn: 6500,
      cost_bucket: "INQUILINO"
    },
    {
      ticket_id: "INC-009",
      local: "Local B-10 (Local 66)",
      inquilino: "MINT Boutique",
      diagnostico: "el aire acondicionado volvió a fallar y no enfría",
      estatus: "dispatched",
      costo_estimado_mxn: 4500,
      cost_bucket: "INQUILINO"
    },
    {
      ticket_id: "INC-010",
      local: "Local B-10 (Local 66)",
      inquilino: "MINT Boutique",
      diagnostico: "compresor quemado, unidad al final de vida útil, técnico recomienda reemplazo completo de unidad HVAC",
      estatus: "closed_administrative",
      costo_estimado_mxn: 65000,
      cost_bucket: "INQUILINO"
    }
  ],
  solicitudes_de_arrendamiento: [
    {
      application_number: "APP-006",
      applicant_entity: "SWEAT & STYLE ATHLETICS",
      category: "Ropa y Calzado Deportivo",
      subcategory: "Moda Deportiva Femenina",
      products: ["ropa deportiva para dama", "leggings", "tops de ejercicio"],
      status: "needs_landlord_review",
      risk_level: "BAJO"
    }
  ]
};

const SYSTEM_PROMPT = `Eres Consulta IA de La Gran Vía Mexicali — cubres los contratos de arrendamiento y la pantalla de exclusividades para prospectos (antes "Mariana"), los tickets de mantenimiento y CapEx (antes "Diego"), y las solicitudes de arrendamiento de nuevos inquilinos. Respondes preguntas del propietario usando únicamente los datos reales que se te proporcionan a continuación.

Reglas:
- Responde en español, de forma directa y ejecutiva.
- Cita el inquilino y el local cuando refieras un contrato, el número de ticket cuando refieras mantenimiento, y el número de solicitud cuando refieras una solicitud.
- Si la pregunta no puede responderse con los datos proporcionados, dilo explícitamente — nunca inventes cifras, cláusulas, diagnósticos, costos o fechas que no aparezcan en los datos.
- No tienes acceso a pólizas de seguro ni a garantías en depósito — esos datos no existen en este sistema.`;

async function runModelQuery(client: Anthropic, modelName: string, query: string): Promise<{ answer: string; latencyMs: number; inputTokens: number; outputTokens: number }> {
  const startTime = Date.now();
  const message = await client.messages.create({
    model: modelName,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Datos reales de la plaza (JSON):\n${JSON.stringify(MOCK_PORTFOLIO_DATA)}\n\nHoy es 2026-08-31.\n\nPregunta del propietario: ${query}`
      }
    ]
  });
  const latencyMs = Date.now() - startTime;
  const answer = message.content.find((b) => b.type === "text")?.text ?? "";
  return {
    answer,
    latencyMs,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens
  };
}

async function judgeGrounding(client: Anthropic, anchor: string, answer: string): Promise<{ pass: boolean; reasoning: string }> {
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1000,
    system: `Eres un juez de evaluación estricto para un agente de bienes raíces. Te doy un "ancla de verdad" (el hecho correcto que debe aparecer) y la respuesta real de un agente. Responde SOLO con JSON de una línea: {"pass": true|false, "reasoning": "..."}. "pass" es true únicamente si la respuesta real contiene, de forma sustantiva, el hecho del ancla.`,
    messages: [
      { role: "user", content: `Ancla de verdad:\n${anchor}\n\nRespuesta real del agente:\n${answer}` }
    ]
  });
  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  try {
    const parsed = JSON.parse(text);
    return { pass: parsed.pass === true, reasoning: parsed.reasoning || "" };
  } catch {
    return { pass: false, reasoning: `JSON parse error: ${text}` };
  }
}

async function main() {
  const client = new Anthropic();
  const fixturePath = path.join(__dirname, "../tests/fixtures/golden-eval-set.json");
  const cases: GoldenCase[] = JSON.parse(readFileSync(fixturePath, "utf-8"));

  const modelsToCompare = [
    { id: "claude-opus-5", name: "Claude Opus 5", inputPrice: 15.0, outputPrice: 75.0 },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", inputPrice: 3.0, outputPrice: 15.0 }
  ];

  console.log("=========================================================================");
  console.log(" GRAN VÍA EMPIRICAL BENCHMARK: CLAUDE OPUS 5 vs CLAUDE SONNET 5");
  console.log("=========================================================================\n");

  const results: Record<string, { passed: number; totalCost: number; avgLatency: number; caseDetails: any[] }> = {};
  for (const m of modelsToCompare) {
    results[m.id] = { passed: 0, totalCost: 0, avgLatency: 0, caseDetails: [] };
  }

  for (const c of cases) {
    console.log(`-------------------------------------------------------------------------`);
    console.log(`[CASE ${c.id}] ${c.agent_focus}`);
    console.log(`Q: ${c.query}\n`);

    for (const m of modelsToCompare) {
      try {
        const res = await runModelQuery(client, m.id, c.query);
        const verdict = await judgeGrounding(client, c.golden_reasoning_anchor, res.answer);
        const cost = (res.inputTokens / 1_000_000) * m.inputPrice + (res.outputTokens / 1_000_000) * m.outputPrice;

        results[m.id].totalCost += cost;
        results[m.id].avgLatency += res.latencyMs;
        if (verdict.pass) results[m.id].passed++;

        results[m.id].caseDetails.push({
          caseId: c.id,
          pass: verdict.pass,
          reasoning: verdict.reasoning,
          answer: res.answer,
          latencyMs: res.latencyMs,
          cost
        });

        console.log(`  Model: ${m.name.padEnd(16)} | Status: ${verdict.pass ? "✅ PASS" : "❌ FAIL"} | Speed: ${(res.latencyMs / 1000).toFixed(2)}s | Tokens: In=${res.inputTokens}/Out=${res.outputTokens} | Cost: $${cost.toFixed(5)}`);
        console.log(`    Answer snippet: ${res.answer.substring(0, 160).replace(/\n/g, ' ')}...`);
        if (!verdict.pass) {
          console.log(`    ⚠️ Judge verdict reasoning: ${verdict.reasoning}`);
        }
      } catch (err: any) {
        console.error(`  Model: ${m.name} ERRORED:`, err?.message || err);
      }
    }
    console.log();
  }

  console.log("=========================================================================");
  console.log(" FINAL BENCHMARK SUMMARY FOR LA GRAN VÍA TEST SET");
  console.log("=========================================================================");
  for (const m of modelsToCompare) {
    const res = results[m.id];
    const avgLat = (res.avgLatency / cases.length / 1000).toFixed(2);
    console.log(`${m.name.padEnd(16)} | Score: ${res.passed}/${cases.length} passed | Avg Speed: ${avgLat}s | Total Cost (6 queries): $${res.totalCost.toFixed(5)}`);
  }
  console.log("=========================================================================\n");
}

main().catch(console.error);
