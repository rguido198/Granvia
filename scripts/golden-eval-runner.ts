/**
 * Runs tests/fixtures/golden-eval-set.json against the real Copiloto logic
 * (src/lib/copiloto/ask-copiloto.ts) and the real live Supabase data — not a
 * vitest test, deliberately: it makes real, paid Anthropic API calls and
 * depends on live DB state (specifically, MINT Boutique's digitized lease),
 * so it must never run as part of `npm test`. Invoke it explicitly:
 *
 *   npm run eval:copiloto
 *
 * Two checks per case, in order, cheapest first:
 *
 *  1. Structural grounding — does target_source_field actually hold a
 *     non-null value on MINT Boutique's lease? If the underlying data isn't
 *     there, there's no way Copiloto's answer is genuinely grounded no
 *     matter how plausible it sounds, so this is checked with zero LLM
 *     calls before spending anything on the case.
 *  2. Semantic grounding — a second, independent Claude call (a
 *     narrowly-scoped judge, not a general eval framework) checks whether
 *     Copiloto's actual answer substantively contains
 *     golden_reasoning_anchor. Exact-string matching against
 *     golden_prose_answer would be too brittle for LLM prose; a judge call
 *     is the same tradeoff the rest of this codebase already made in
 *     lease-extraction.ts and mariana-screening.ts's skeptic pass.
 *
 * Requires ANTHROPIC_API_KEY and the Supabase service-role env vars (same
 * as the running app) to be set when invoked. `server-only` (imported
 * transitively by askCopiloto -> portfolio.server.ts) resolves to a no-op
 * only under Node's "react-server" condition — see package.json's
 * eval:copiloto script for the required --conditions flag. Running this
 * file directly with plain `tsx` will throw at import time.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

import { askCopiloto } from "../src/lib/copiloto/ask-copiloto";
import { fetchPortfolio, type LeaseDetail } from "../src/lib/data/portfolio.server";

type GoldenCase = {
  id: string;
  agent_focus: string;
  query: string;
  target_source_field: string;
  golden_reasoning_anchor: string;
  golden_prose_answer: string;
};

// Every case in the current golden set targets MINT Boutique specifically —
// this map is scoped to that fixture's fields, not meant as a general
// key->getter registry for every possible Copiloto payload field.
const FIELD_GETTERS: Partial<Record<string, (l: LeaseDetail) => unknown>> = {
  clausula_exclusividad: (l) => l.exclusiveUseClause,
  matriz_responsabilidad: (l) => l.responsibilityMatrix,
  dias_aviso_terminacion: (l) => l.noticePeriodDays,
};

type JudgeVerdict = { pass: boolean; reasoning: string };

async function judgeGrounding(anchor: string, answer: string): Promise<JudgeVerdict> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-5",
    // 500 was enough for the original 3 single-fact-lookup cases' short
    // verdicts, but a judgment/conflict-detection case (eval_004) needs the
    // judge to reason over a much longer real answer — it hit the cap
    // mid-string, producing an unterminated JSON object that read as a false
    // FAIL rather than the true PASS it was mid-way through writing.
    max_tokens: 1500,
    system: `Eres un juez de evaluación estricto para un agente de bienes raíces. Te doy un "ancla de verdad" (el hecho correcto que debe aparecer) y la respuesta real de un agente. Responde SOLO con JSON de una línea: {"pass": true|false, "reasoning": "..."}. "pass" es true únicamente si la respuesta real contiene, de forma sustantiva, el hecho del ancla — sonar plausible o relacionado no basta. Mantén "reasoning" breve (una o dos oraciones) — no agregues texto fuera del JSON.`,
    messages: [
      { role: "user", content: `Ancla de verdad:\n${anchor}\n\nRespuesta real del agente:\n${answer}` },
    ],
  });
  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  try {
    const parsed = JSON.parse(text);
    return { pass: parsed.pass === true, reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "" };
  } catch {
    return { pass: false, reasoning: `El juez no devolvió JSON válido: ${text}` };
  }
}

async function main() {
  const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../tests/fixtures/golden-eval-set.json");
  const cases: GoldenCase[] = JSON.parse(readFileSync(fixturePath, "utf-8"));

  const { leases } = await fetchPortfolio();
  const mint = leases.find((l) => l.tenantEntity.includes("MINT Boutique"));

  let passed = 0;
  const failures: string[] = [];

  for (const c of cases) {
    process.stdout.write(`\n[${c.id}] ${c.agent_focus}\n  Q: ${c.query}\n`);

    if (!mint) {
      console.error(`  ❌ FAIL — no lease found for MINT Boutique; nothing to ground this case against.`);
      failures.push(c.id);
      continue;
    }

    const getter = FIELD_GETTERS[c.target_source_field];
    const fieldValue = getter ? getter(mint) : undefined;
    if (getter && (fieldValue === null || fieldValue === undefined)) {
      console.error(
        `  ❌ FAIL — target_source_field "${c.target_source_field}" is null on MINT Boutique's lease. Skipped the model call: no amount of prose can be grounded in a field that isn't populated.`,
      );
      failures.push(c.id);
      continue;
    }

    const result = await askCopiloto(c.query);
    if ("error" in result) {
      console.error(`  ❌ FAIL — Copiloto endpoint error: ${result.error}`);
      failures.push(c.id);
      continue;
    }

    const verdict = await judgeGrounding(c.golden_reasoning_anchor, result.answer);
    if (verdict.pass) {
      console.log(`  ✅ PASS`);
      passed++;
    } else {
      console.error(`  ❌ FAIL — ${verdict.reasoning}`);
      console.error(`     Respuesta real: ${result.answer}`);
      failures.push(c.id);
    }
  }

  console.log(`\n${passed}/${cases.length} passed.`);
  if (failures.length > 0) {
    console.log(`Failed: ${failures.join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
