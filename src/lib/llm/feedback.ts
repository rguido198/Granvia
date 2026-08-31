import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type LLMFeedbackEntry = {
  agentRole: string;
  userPrompt: string;
  originalAiOutput: string;
  landlordCorrectedOutput: string;
  overrideReason?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Logs a landlord edit or override to an AI-generated draft/response into the audit_logs table.
 * Used to expand the real-world evaluation dataset continuously over time.
 */
export async function logLandlordOverride(entry: LLMFeedbackEntry): Promise<{ success: boolean; id?: string }> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.from("audit_logs").insert({
      action: "LLM_LANDLORD_OVERRIDE",
      details: {
        agent_role: entry.agentRole,
        user_prompt: entry.userPrompt,
        original_ai_output: entry.originalAiOutput,
        landlord_corrected_output: entry.landlordCorrectedOutput,
        override_reason: entry.overrideReason ?? "Manual landlord edit before sending/saving",
        timestamp: new Date().toISOString(),
        metadata: entry.metadata ?? {}
      }
    }).select("id").single();

    if (error) {
      console.warn("Failed to log landlord override to audit_logs:", error.message);
      return { success: false };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.warn("Error logging landlord override:", err);
    return { success: false };
  }
}
