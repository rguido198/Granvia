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
export const CANONICAL_CLAUDE_MODEL = "claude-3-7-sonnet-20250219";
export const CANONICAL_GEMINI_MODEL = "gemini-2.5-flash";

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

export async function callLLMTextForAgent(
  role: AgentRole,
  systemPrompt: string,
  userContent: string,
  maxTokens: number = 4000
): Promise<string> {
  const modelName = resolveModelName(AGENT_MODELS[role]);
  const isGemini = modelName.startsWith("gemini");
  const geminiKey = process.env.GEMINI_API_KEY;

  if (isGemini && geminiKey) {
    try {
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

      if (res.ok) {
        const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
      console.warn(`Gemini API returned empty/non-OK (${res.status}), falling back to Claude 3.7 Sonnet...`);
    } catch (err) {
      console.warn("Gemini call failed, falling back to Claude 3.7 Sonnet:", err);
    }
  }

  // Primary for High-Risk roles or Fallback for Gemini: Claude 3.7 Sonnet
  const client = new Anthropic();
  const response = await client.messages.create({
    model: isGemini ? resolveModelName("claude-3-7-sonnet-20250219") : modelName,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }]
  });

  return response.content.find((b) => b.type === "text")?.text ?? "";
}

export async function callLLMStructuredForAgent<T>(
  role: AgentRole,
  systemPrompt: string,
  userContent: string,
  schema: z.ZodType<T>,
  maxTokens: number = 4000
): Promise<T> {
  const modelName = AGENT_MODELS[role];
  const isGemini = modelName.startsWith("gemini");
  const geminiKey = process.env.GEMINI_API_KEY;

  if (isGemini && geminiKey) {
    try {
      const jsonPrompt = `${systemPrompt}\n\nIMPORTANT: Respond strictly with a JSON object satisfying this schema:\n${JSON.stringify((schema as unknown as { _def: unknown })._def)}\n\n${userContent}`;
      const text = await callLLMTextForAgent(role, jsonPrompt, "", maxTokens);
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return schema.parse(parsed);
    } catch {
      // Fallback to Anthropic zodOutputFormat
    }
  }

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: isGemini ? resolveModelName("claude-3-7-sonnet-20250219") : modelName,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
    output_config: { format: zodOutputFormat(schema) }
  });

  if (!response.parsed_output) {
    throw new Error(`Structured output parsing failed for agent ${role}`);
  }

  return response.parsed_output;
}
