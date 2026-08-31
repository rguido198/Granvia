import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COMPLEX_PORTFOLIO_DATA = {
  plaza: {
    nombre: "La Gran Vía Mexicali",
    gla_total_m2: 7550,
    gla_vacante_m2: 1000
  },
  contratos: [
    {
      inquilino: "MINT BOUTIQUE, S.A. DE C.V.",
      nombre_comercial: "MINT Boutique",
      local: "Local B-10",
      m2: 95,
      renta_mensual_base_2023: 45000,
      renta_mensual_actual_2025: 50562,
      uso_permitido: "venta de ropa de diseño importado para dama y alta costura femenina",
      clausula_exclusividad: "venta de ropa de diseño importado para dama y alta costura femenina",
      clausula_escalacion: "Cláusula Tercera: La renta mensual se incrementará anualmente en el aniversario del contrato conforme a la variación del INPC acumulado de los 12 meses anteriores, o el 6.0% anual, lo que resulte MAYOR.",
      clausula_cam_cap: "Cláusula Novena: La cuota de mantenimiento de áreas comunes (CAM) asignada al Arrendatario no podrá incrementarse más de un 4.0% trimestral respecto al trimestre inmediato anterior.",
      matriz_responsabilidad: {
        hvac: "Arrendatario",
        roof: "Arrendador",
        plumbing: "Arrendatario",
        electrical: "Arrendatario",
        estructura_techo: "Arrendador"
      },
      clausula_fuerza_mayor_cascadas: "Cláusula Octava: Daños originados por fallas o filtraciones en la estructura exterior o techo de la plaza son responsabilidad del Arrendador, excepto cuando el mantenimiento preventivo del área concesionada haya sido omitido por el Arrendatario."
    },
    {
      inquilino: "DERMA CLUB MÉXICO, S. DE R.L. DE C.V.",
      nombre_comercial: "Derma Club",
      local: "Local B-12",
      m2: 110,
      uso_permitido: "clínica dermatológica, procedimientos estéticos no invasivos y farmacia especializada en cuidado médico de la piel",
      clausula_exclusividad: "clínica dermatológica, tratamientos faciales dermatológicos y venta de productos dermocosméticos medicinales con receta o prescripción médica"
    },
    {
      inquilino: "ASHLEY FURNITURE HOMESTORE S.A. DE C.V.",
      nombre_comercial: "Ashley Furniture",
      local: "Local A-01",
      m2: 2500,
      clausula_cam_grossup: "Cláusula Décima: En caso de vacancia en la plaza superior al 10% del GLA, los gastos comunes se calcularán bajo la cláusula de gross-up al 95% de ocupación teórica."
    }
  ],
  datos_economicos_historicos: {
    inpc_anual_2023: "4.2%",
    inpc_anual_2024: "7.1%",
    cam_q2_2025_cuota_mint: 5000,
    cam_q3_2025_gasto_total_plaza: 450000
  }
};

const COMPLEX_TEST_CASES = [
  {
    id: "COMPLEX_001_cascading_liability",
    focus: "Diego / Legal — Cascading Multi-System Fault",
    query: `Una lluvia intensa causó un desbordamiento en el drenaje del techo (responsabilidad del Arrendador según matriz). El agua se filtró hacia el falso techo del Local B-10 (MINT Boutique), cayó directamente sobre la unidad de HVAC del inquilino, provocó un corto circuito en el tablero eléctrico interno del local y destruyó $120,000 MXN en acabados de tablaroca y prendas del inquilino. El técnico emitió una sola factura de $120,000 MXN cargada al inquilino. Analiza la cadena de causalidad entre Cláusula Quinta (Matriz), Cláusula Octava (Estructura/Techo) y determina la atribución legal exacta del costo entre Arrendador, Arrendatario y Seguro.`,
    golden_anchor: `El origen primario fue la filtración/desbordamiento del drenaje del techo (responsabilidad del Arrendador bajo la matriz y Cláusula Octava). La filtración causó los daños consecuenciales (HVAC, eléctrico, tablaroca). Cargar los $120,000 MXN íntegros al inquilino es incorrecto; la causa raíz recae en la falla estructural del Arrendador.`
  },
  {
    id: "COMPLEX_002_three_way_exclusivity",
    focus: "Mariana — Multi-Tenant Covenant Triangulation",
    query: `El prospecto APP-009 ("Skin & Silk Spa") solicita rentar un local para vender "lencería fina importada de seda, batas de descanso de diseñador para dama, y sueros cosméticos dermocosméticos con ácido hialurónico". Evalúa si APP-009 entra en conflicto con MINT Boutique (ropa de diseño importado para dama y alta costura) y/o con Derma Club (dermocosméticos y cuidado médico de la piel). Aplica las reglas de Mariana (descomposición en sustantivo cabeza, eliminación de adjetivos de calidad como 'fina', 'de diseñador') y determina la severidad (ALTO o MEDIO) de cada conflicto.`,
    golden_anchor: `Conflicto con MINT Boutique: ALTO o MEDIO (las batas de descanso y lencería para dama entran en ropa de vestir para dama importada). Conflicto con Derma Club: ALTO o MEDIO (los sueros dermocosméticos colisionan con productos dermocosméticos de Derma Club). El análisis debe identificar ambos conflictos.`
  },
  {
    id: "COMPLEX_003_cam_cap_grossup_math",
    focus: "Renata — CAM Cap & Gross-Up Reconciliation",
    query: `En el Q3 2025, el gasto total de CAM de la plaza fue de $450,000 MXN. MINT Boutique ocupa 95 m² de 7,550 m² totales (1.2583% del GLA). La cuota de MINT en el Q2 2025 fue de $5,000 MXN y su contrato (Cláusula Novena) tiene un CAP del 4.0% trimestral máximo de incremento. 
1) ¿Cuál sería la cuota proporcional de MINT sin CAP?
2) ¿Cuál es la cuota máxima permitida a cobrar a MINT en Q3 aplicando su CAP del 4.0%?
3) ¿Quién absorbe la diferencia/excedente entre la cuota sin CAP y la cuota con CAP?`,
    golden_anchor: `1) Cuota sin CAP: aproximadamente $5,662.25 MXN. 2) Cuota máxima con CAP: $5,200.00 MXN ($5,000 * 1.04). 3) La diferencia (aproximadamente $462.25 MXN) es absorbida por el Arrendador.`
  },
  {
    id: "COMPLEX_004_multi_year_escalation_audit",
    focus: "Renata / Legal — Multi-Year Rent Escalation Audit",
    query: `El contrato de MINT Boutique inició el 15 de enero de 2023 con renta base de $45,000 MXN. La Cláusula Tercera exige incremento anual por el MAYOR entre el INPC acumulado del año anterior y 6.0%. En 2023 el INPC fue 4.2% (aplica 6.0% por ser mayor). En 2024 el INPC fue 7.1% (aplica 7.1% por ser mayor). 
El propietario cobró:
- Renta 2023: $45,000 MXN
- Renta 2024 cobrada: $47,700 MXN
- Renta 2025 cobrada: $50,562 MXN
Audita los cobros históricos: ¿Son correctos los montos cobrados en 2024 y 2025? ¿Cuál debe ser la renta mensual exacta para el periodo 2025?`,
    golden_anchor: `Auditoría 2024: $45,000 * 1.06 = $47,700 MXN (CORRECTO). Auditoría 2025: $47,700 * 1.071 = $51,086.70 MXN (INCORRECTO, cobró $50,562 aplicando 6.0% en vez de 7.1%). La renta correcta para 2025 debió ser $51,086.70 MXN.`
  }
];

async function runModelQuery(client: Anthropic, modelName: string, query: string): Promise<{ answer: string; latencyMs: number; inputTokens: number; outputTokens: number }> {
  const startTime = Date.now();
  const message = await client.messages.create({
    model: modelName,
    max_tokens: 8000,
    system: `Eres el Agente Senior de Inteligencia Operativa y Legal de La Gran Vía Mexicali. Respondes consultas complejas de análisis legal, atribución de costos y auditorías financieras usando los datos y cláusulas proporcionadas. Sé exhaustivo, preciso en la matemática y riguroso en el razonamiento jurídico. Responde directamente en texto.`,
    messages: [
      {
        role: "user",
        content: `Datos de la Plaza y Contratos (JSON):\n${JSON.stringify(COMPLEX_PORTFOLIO_DATA)}\n\nPregunta Compleja: ${query}`
      }
    ]
  });
  const latencyMs = Date.now() - startTime;
  // Combine all text content blocks (ignoring thinking blocks if present)
  const textBlocks = message.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.Messages.TextBlock).text);
  const answer = textBlocks.join("\n").trim();
  return {
    answer,
    latencyMs,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens
  };
}

async function judgeGrounding(client: Anthropic, anchor: string, answer: string): Promise<{ pass: boolean; reasoning: string }> {
  if (!answer) return { pass: false, reasoning: "Respuesta vacía" };
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1200,
    system: `Eres un juez de evaluación riguroso y experto en derecho comercial y finanzas de bienes raíces. Te doy un "ancla de verdad" (los hechos, números y conclusiones legales correctas) y la respuesta del agente. Responde SOLO con JSON de una línea: {"pass": true|false, "reasoning": "..."}. "pass" es true ÚNICAMENTE si la respuesta analiza correctamente la causalidad/matemática/cláusulas clave del ancla.`,
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

  const modelsToCompare = [
    { id: "claude-opus-5", name: "Claude Opus 5", inputPrice: 15.0, outputPrice: 75.0 },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", inputPrice: 3.0, outputPrice: 15.0 }
  ];

  console.log("=========================================================================");
  console.log(" GRAN VÍA ADVANCED STRESS TEST (V2 with 8K max_tokens & thinking extraction)");
  console.log(" Testing complex legal causality, 3-way exclusivity, CAM math & escalation audit");
  console.log("=========================================================================\n");

  const results: Record<string, { passed: number; totalCost: number; avgLatency: number }> = {};
  for (const m of modelsToCompare) {
    results[m.id] = { passed: 0, totalCost: 0, avgLatency: 0 };
  }

  for (const c of COMPLEX_TEST_CASES) {
    console.log(`-------------------------------------------------------------------------`);
    console.log(`[STRESS CASE ${c.id}] ${c.focus}`);
    console.log(`Query: ${c.query.substring(0, 120)}...\n`);

    for (const m of modelsToCompare) {
      try {
        const res = await runModelQuery(client, m.id, c.query);
        const verdict = await judgeGrounding(client, c.golden_anchor, res.answer);
        const cost = (res.inputTokens / 1_000_000) * m.inputPrice + (res.outputTokens / 1_000_000) * m.outputPrice;

        results[m.id].totalCost += cost;
        results[m.id].avgLatency += res.latencyMs;
        if (verdict.pass) results[m.id].passed++;

        console.log(`  Model: ${m.name.padEnd(16)} | Status: ${verdict.pass ? "✅ PASS" : "❌ FAIL"} | Speed: ${(res.latencyMs / 1000).toFixed(2)}s | Tokens: In=${res.inputTokens}/Out=${res.outputTokens} | Cost: $${cost.toFixed(5)}`);
        console.log(`    Answer snippet: ${res.answer.substring(0, 180).replace(/\n/g, ' ')}...`);
        if (!verdict.pass) {
          console.log(`    ⚠️ Judge verdict reasoning: ${verdict.reasoning}`);
        }
      } catch (err: unknown) {
        console.error(`  Model: ${m.name} ERRORED:`, err instanceof Error ? err.message : String(err));
      }
    }
    console.log();
  }

  console.log("=========================================================================");
  console.log(" FINAL STRESS TEST SUMMARY RESULTS FOR GRAN VÍA");
  console.log("=========================================================================");
  for (const m of modelsToCompare) {
    const res = results[m.id];
    const avgLat = (res.avgLatency / COMPLEX_TEST_CASES.length / 1000).toFixed(2);
    console.log(`${m.name.padEnd(16)} | Score: ${res.passed}/${COMPLEX_TEST_CASES.length} passed | Avg Speed: ${avgLat}s | Total Cost (4 stress queries): $${res.totalCost.toFixed(5)}`);
  }
  console.log("=========================================================================\n");
}

main().catch(console.error);
