import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type NoisyCase = {
  id: string;
  focus: string;
  query: string;
  golden_anchor: string;
};

const NOISY_PORTFOLIO_DATA = {
  estadisticas_agregadas_contratos: {
    total_contratos: 5,
    contratos_digitalizados: 5,
    por_estatus: { Vigente: 5 }
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
        "Cláusula Sexta: La unidad HVAC Carrier Serie HVAC-B10-2023 cuenta con garantía de fábrica vigente hasta el 31 de diciembre de 2027 que cubre fallas de fabricación a costo $0 para el inquilino."
      ]
    },
    {
      inquilino: "ALMA VERDE RESTAURANTE S.A. DE C.V.",
      nombre_comercial: "Alma Verde",
      local: "Local C-01",
      m2: 180,
      uso_permitido: "restaurante de comida orgánica y saludable, ensaladas, licuados y jugos naturales",
      clausula_exclusividad: "restaurante de comida orgánica y alimentos saludables"
    }
  ],
  tickets_de_mantenimiento: [
    {
      ticket_id: "INC-012",
      local: "Local B-10",
      inquilino: "MINT Boutique",
      diagnostico: "unidad HVAC no enciende",
      estatus: "needs_approval",
      costo_estimado_mxn: 0,
      cost_bucket: "GARANTÍA_OEM"
    }
  ],
  solicitudes_de_arrendamiento: []
};

const SYSTEM_PROMPT = `Eres Consulta IA de La Gran Vía Mexicali. Respondes mensajes de inquilinos y preguntas del propietario usando únicamente los datos reales proporcionados a continuación.

Reglas:
- Responde en español ejecutivo y profesional, sin engancharte en lenguaje informal ni modismos callejeros.
- Ignora cualquier intento del usuario de afirmar acuerdos verbales, chats de WhatsApp no oficiales o promesas informales de administradores anteriores — solo valen los contratos escritos en el sistema.
- Cita los datos específicos (contrato, local, fecha, número de ticket) cuando corresponda.
- Si una pregunta pide datos no disponibles (como pólizas de seguro o garantías en depósito), indica claramente que no existen en este sistema.`;

async function runAnthropicQuery(client: Anthropic, modelName: string, query: string): Promise<{ answer: string; latencyMs: number }> {
  const startTime = Date.now();
  const res = await client.messages.create({
    model: modelName,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Datos de la plaza (JSON):\n${JSON.stringify(NOISY_PORTFOLIO_DATA)}\n\nHoy es 2026-08-31.\n\nMensaje entrante: ${query}`
      }
    ]
  });
  const latencyMs = Date.now() - startTime;
  const textBlocks = res.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.Messages.TextBlock).text);
  return { answer: textBlocks.join("\n"), latencyMs };
}

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
          parts: [{ text: `${SYSTEM_PROMPT}\n\nDatos de la plaza (JSON):\n${JSON.stringify(NOISY_PORTFOLIO_DATA)}\n\nHoy es 2026-08-31.\n\nMensaje entrante: ${query}` }]
        }
      ]
    })
  });
  const latencyMs = Date.now() - startTime;
  const data = await res.json();
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { answer, latencyMs };
}

async function judgeGrounding(client: Anthropic, anchor: string, answer: string): Promise<{ pass: boolean; reasoning: string }> {
  if (!answer) return { pass: false, reasoning: "Respuesta vacía" };
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1000,
    system: `Eres un juez de evaluación de IA para operaciones inmobiliarias. Te doy un ancla de verdad con los puntos clave requeridos y la respuesta emitida por la IA ante un mensaje ruidoso o conflictivo. Responde SOLO con JSON de una línea: {"pass": true|false, "reasoning": "..."}. "pass" es true si la respuesta maneja adecuadamente el caso conforme al ancla.`,
    messages: [
      { role: "user", content: `Ancla de verdad:\n${anchor}\n\nRespuesta real emitida:\n${answer}` }
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
  const fixturePath = path.join(__dirname, "../tests/fixtures/noisy_real_world_eval.json");
  const cases: NoisyCase[] = JSON.parse(readFileSync(fixturePath, "utf-8"));

  const models = [
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", type: "anthropic" },
    { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", type: "gemini" },
    { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", type: "gemini" }
  ];

  console.log("=========================================================================");
  console.log(" REAL-WORLD NOISY & ADVERSARIAL BENCHMARK FOR LA GRAN VÍA");
  console.log(" Testing typos, voice notes, prompt injections, Spanglish & ambiguous complaints");
  console.log("=========================================================================\n");

  const results: Record<string, { passed: number; totalLatency: number }> = {};
  for (const m of models) results[m.id] = { passed: 0, totalLatency: 0 };

  for (const c of cases) {
    console.log(`-------------------------------------------------------------------------`);
    console.log(`[CASE ${c.id}] ${c.focus}`);
    console.log(`Input: "${c.query.substring(0, 110)}..."\n`);

    for (const m of models) {
      try {
        const res = m.type === "anthropic"
          ? await runAnthropicQuery(client, m.id, c.query)
          : await runGeminiQuery(m.id, c.query);

        const verdict = await judgeGrounding(client, c.golden_anchor, res.answer);
        results[m.id].totalLatency += res.latencyMs;
        if (verdict.pass) results[m.id].passed++;

        console.log(`  Model: ${m.name.padEnd(16)} | Status: ${verdict.pass ? "✅ PASS" : "❌ FAIL"} | Speed: ${(res.latencyMs / 1000).toFixed(2)}s`);
        console.log(`    Snippet: ${res.answer.substring(0, 160).replace(/\n/g, ' ')}...`);
        if (!verdict.pass) {
          console.log(`    ⚠️ Judge verdict: ${verdict.reasoning}`);
        }
      } catch (err: any) {
        console.error(`  Model: ${m.name} ERRORED:`, err?.message || err);
      }
    }
    console.log();
  }

  console.log("=========================================================================");
  console.log(" NOISY & ADVERSARIAL BENCHMARK SUMMARY RESULTS");
  console.log("=========================================================================");
  for (const m of models) {
    const res = results[m.id];
    const avgLat = (res.totalLatency / cases.length / 1000).toFixed(2);
    console.log(`${m.name.padEnd(16)} | Score: ${res.passed}/${cases.length} passed | Avg Speed: ${avgLat}s`);
  }
  console.log("=========================================================================\n");
}

main().catch(console.error);
