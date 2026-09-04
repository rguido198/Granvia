import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/**
 * Anthropic has no rolling "-latest" alias — "claude-3-5-sonnet-latest" is
 * not a real model ID and returns a 404 on every call (confirmed live: this
 * broke Consulta IA's Claude path entirely). Anthropic model IDs are fixed
 * strings you update yourself when you want a newer model; there is no
 * auto-updating pointer to fall back on here.
 */
export const CANONICAL_CLAUDE_MODEL = "claude-sonnet-5";
export const CANONICAL_GEMINI_MODEL = "gemini-3.8-flash";

export function resolveModelName(modelName?: string): string {
  if (!modelName) return CANONICAL_CLAUDE_MODEL;
  const lower = modelName.toLowerCase();
  if (lower.startsWith("claude") || lower.includes("sonnet") || lower.includes("opus")) {
    return CANONICAL_CLAUDE_MODEL;
  }
  if (lower.startsWith("gemini") || lower.includes("flash")) {
    return CANONICAL_GEMINI_MODEL;
  }
  return modelName;
}

export const AGENT_MODELS = {
  copiloto: resolveModelName(process.env.MODEL_COPILOTO),
  extraction: resolveModelName(process.env.MODEL_EXTRACTION),
  exclusivity: resolveModelName(process.env.MODEL_EXCLUSIVITY),
  triage: resolveModelName(process.env.MODEL_TRIAGE || CANONICAL_GEMINI_MODEL),
} as const;

export type AgentRole = keyof typeof AGENT_MODELS;

async function callGeminiText(
  modelName: string,
  systemPrompt: string,
  userContent: string,
  maxTokens: number,
  geminiKey: string
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userContent}` }]
          }
        ],
        generationConfig: {
          maxOutputTokens: maxTokens
        }
      })
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API returned ${res.status}`);
  }
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API returned empty text");
  }
  return text;
}

async function callClaudeText(
  modelName: string,
  systemPrompt: string,
  userContent: string,
  maxTokens: number
): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: modelName,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }]
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  if (!text) {
    throw new Error("Claude API returned empty text");
  }
  return text;
}

export async function callLLMTextForAgent(
  role: AgentRole,
  systemPrompt: string,
  userContent: string,
  maxTokens: number = 4000
): Promise<string> {
  const modelName = resolveModelName(AGENT_MODELS[role]);
  const isGemini = modelName.startsWith("gemini");
  const geminiKey = process.env.GEMINI_API_KEY;

  if (isGemini) {
    if (geminiKey) {
      try {
        return await callGeminiText(modelName, systemPrompt, userContent, maxTokens, geminiKey);
      } catch (err) {
        console.warn(`Gemini call failed for ${role}, falling back to Claude Sonnet 5:`, err);
      }
    }
    return await callClaudeText(CANONICAL_CLAUDE_MODEL, systemPrompt, userContent, maxTokens);
  }

  // Claude-primary role: try Claude first, fall back to Gemini on failure (symmetric with the branch above).
  try {
    return await callClaudeText(modelName, systemPrompt, userContent, maxTokens);
  } catch (err) {
    if (!geminiKey) throw err;
    console.warn(`Claude call failed for ${role}, falling back to Gemini:`, err);
    try {
      return await callGeminiText(CANONICAL_GEMINI_MODEL, systemPrompt, userContent, maxTokens, geminiKey);
    } catch (fallbackErr) {
      console.warn(`Gemini fallback also failed for ${role}:`, fallbackErr);
      throw err; // surface the original Claude failure, not the fallback's
    }
  }
}

async function callGeminiStructured<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  maxTokens: number,
  geminiKey: string
): Promise<T> {
  const jsonPrompt = `${systemPrompt}\n\nIMPORTANT: Respond strictly with a JSON object satisfying this schema:\n${JSON.stringify((schema as unknown as { _def: unknown })._def)}\n\n${userContent}`;
  const text = await callGeminiText(CANONICAL_GEMINI_MODEL, jsonPrompt, "", maxTokens, geminiKey);
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return schema.parse(parsed);
}

async function callClaudeStructured<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  maxTokens: number,
  cacheSystemPrompt: boolean = false
): Promise<T> {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: CANONICAL_CLAUDE_MODEL,
    max_tokens: maxTokens,
    // Ephemeral prompt caching for call sites whose system prompt is
    // identical across every invocation (e.g. a per-ticket skeptic pass) —
    // avoids paying full input-token cost on every call after the first.
    system: cacheSystemPrompt
      ? [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }]
      : systemPrompt,
    messages: [{ role: "user", content: userContent }],
    output_config: { format: zodOutputFormat(schema) }
  });

  if (!response.parsed_output) {
    throw new Error("Structured output parsing failed");
  }

  return response.parsed_output;
}

/**
 * For call sites that don't go through the AgentRole/AGENT_MODELS system —
 * they always run Claude Sonnet 5 as primary, with Gemini as a same-shape
 * fallback on any Claude failure (empty output, API error, etc). Used by the
 * lease-extraction/exclusivity/warranty/triage/screening/renewal call sites
 * that previously called `new Anthropic()` directly with no fallback at all.
 */
export async function callStructuredWithFallback<T>(
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  maxTokens: number = 4000,
  cacheSystemPrompt: boolean = false
): Promise<T> {
  const geminiKey = process.env.GEMINI_API_KEY;
  try {
    return await callClaudeStructured(systemPrompt, userContent, schema, maxTokens, cacheSystemPrompt);
  } catch (err) {
    if (!geminiKey) {
      throw new Error(`Structured output parsing failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    console.warn("Claude structured call failed, falling back to Gemini:", err);
    try {
      return await callGeminiStructured(systemPrompt, userContent, schema, maxTokens, geminiKey);
    } catch (fallbackErr) {
      console.warn("Gemini structured fallback also failed:", fallbackErr);
      throw new Error(`Structured output parsing failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

export async function callLLMStructuredForAgent<T>(
  role: AgentRole,
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  maxTokens: number = 4000
): Promise<T> {
  const modelName = resolveModelName(AGENT_MODELS[role]);
  const isGemini = modelName.startsWith("gemini");
  const geminiKey = process.env.GEMINI_API_KEY;

  if (isGemini) {
    if (geminiKey) {
      try {
        return await callGeminiStructured(systemPrompt, userContent, schema, maxTokens, geminiKey);
      } catch (err) {
        console.warn(`Gemini structured call failed for ${role}, falling back to Claude:`, err);
      }
    }
    try {
      return await callClaudeStructured(systemPrompt, userContent, schema, maxTokens);
    } catch (err) {
      throw new Error(`Structured output parsing failed for agent ${role}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Claude-primary role: try Claude first, fall back to Gemini on failure (symmetric with the branch above).
  try {
    return await callClaudeStructured(systemPrompt, userContent, schema, maxTokens);
  } catch (err) {
    if (!geminiKey) {
      throw new Error(`Structured output parsing failed for agent ${role}: ${err instanceof Error ? err.message : String(err)}`);
    }
    console.warn(`Claude structured call failed for ${role}, falling back to Gemini:`, err);
    try {
      return await callGeminiStructured(systemPrompt, userContent, schema, maxTokens, geminiKey);
    } catch (fallbackErr) {
      console.warn(`Gemini structured fallback also failed for ${role}:`, fallbackErr);
      throw new Error(`Structured output parsing failed for agent ${role}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
