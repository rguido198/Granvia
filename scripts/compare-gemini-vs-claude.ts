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

async function runGeminiQuery(modelName: string, query: string): Promise<{ answer: string; latencyMs: number }> {
  const key = process.env.GEMINI_API_KEY;
  const startTime = Date.now();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: `${SYSTEM_PROMPT}\n\nDatos reales de la plaza (JSON):\n${JSON.stringify(MOCK_PORTFOLIO_DATA)}\n\nHoy es 2026-08-31.\n\nPregunta del propietario: ${query}` }
          ]
        }
      ]
    })
  });
  const latencyMs = Date.now() - startTime;
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { answer, latencyMs };
}

async function judgeGrounding(client: Anthropic, anchor: string, answer: string): Promise<{ pass: boolean; reasoning: string }> {
  if (!answer) return { pass: false, reasoning: "Respuesta vacía de Gemini" };
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

  const geminiModels = [
    { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (Opus equivalent)" },
    { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash (Haiku equivalent)" }
  ];

  console.log("=========================================================================");
  console.log(" GRAN VÍA BENCHMARK: GEMINI 3.1 PRO & GEMINI 3.6 FLASH vs CLAUDE SONNET 5");
  console.log("=========================================================================\n");

  for (const m of geminiModels) {
    let passed = 0;
    let totalLatency = 0;
    console.log(`-------------------------------------------------------------------------`);
    console.log(`MODEL: ${m.name}`);
    console.log(`-------------------------------------------------------------------------`);

    for (const c of cases) {
      try {
        const res = await runGeminiQuery(m.id, c.query);
        const verdict = await judgeGrounding(client, c.golden_reasoning_anchor, res.answer);
        totalLatency += res.latencyMs;
        if (verdict.pass) passed++;

        console.log(`  [${c.id}] Status: ${verdict.pass ? "✅ PASS" : "❌ FAIL"} | Speed: ${(res.latencyMs / 1000).toFixed(2)}s`);
        console.log(`    Answer: ${res.answer.substring(0, 140).replace(/\n/g, ' ')}...`);
        if (!verdict.pass) {
          console.log(`    ⚠️ Judge verdict reasoning: ${verdict.reasoning}`);
        }
      } catch (err: unknown) {
        console.error(`  [${c.id}] ERRORED:`, err instanceof Error ? err.message : String(err));
      }
    }
    const avgLat = (totalLatency / cases.length / 1000).toFixed(2);
    console.log(`\n=> ${m.name} Score: ${passed}/${cases.length} passed | Avg Speed: ${avgLat}s\n`);
  }
}

main().catch(console.error);
