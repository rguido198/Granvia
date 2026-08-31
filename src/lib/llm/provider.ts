import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/**
 * Per-Agent Model Configuration
 * High-Risk / Disputed Endpoints (Copiloto, Lease Extraction, Exclusivity) use Claude Sonnet 5
 * Low-Risk / High-Volume Triage & Template Generation use Gemini 3.6 Flash
 */
export const AGENT_MODELS = {
  copiloto: process.env.MODEL_COPILOTO || "claude-sonnet-5",
  extraction: process.env.MODEL_EXTRACTION || "claude-sonnet-5",
  exclusivity: process.env.MODEL_EXCLUSIVITY || "claude-sonnet-5",
  triage: process.env.MODEL_TRIAGE || "gemini-3.6-flash",
} as const;

export type AgentRole = keyof typeof AGENT_MODELS;

export async function callLLMTextForAgent(
  role: AgentRole,
  systemPrompt: string,
  userContent: string,
  maxTokens: number = 4000
): Promise<string> {
  const modelName = AGENT_MODELS[role];
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
      console.warn(`Gemini API returned empty/non-OK (${res.status}), falling back to Claude Sonnet 5...`);
    } catch (err) {
      console.warn("Gemini call failed, falling back to Claude Sonnet 5:", err);
    }
  }

  // Primary for High-Risk roles or Fallback for Gemini: Claude Sonnet 5
  const client = new Anthropic();
  const response = await client.messages.create({
    model: isGemini ? "claude-sonnet-5" : modelName,
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
    model: isGemini ? "claude-sonnet-5" : modelName,
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
