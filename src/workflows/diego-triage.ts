import { createHook, FatalError, getWorkflowMetadata } from "workflow";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Diego (maintenance-dispatcher) as a durable state machine.
 * Source of truth for the mechanics below: .claude/skills/maintenance-dispatcher/SKILL.md
 * in the OS repo — this file implements it, it doesn't restate it in full.
 */

// ── Step 1: load everything the draft pass needs ───────────────────────────

type TicketContext = {
  documentId: string;
  documentKind: string;
  rawText: string | null;
  locale: { id: string; unit_number: string; tenant_entity: string | null };
  property: { id: string; jurisdiction_id: string };
  lease: {
    maintenance_clause: string | null;
    exclusive_use_clause: string | null;
  } | null;
  assets: {
    id: string;
    make: string | null;
    model: string | null;
    warranty_expiry: string | null;
    service_contract_provider: string | null;
    manual_url: string | null;
  }[];
};

// The uploader names the locale explicitly (Phase 1's /api/ingest form,
// or Phase 4's dashboard) until a future pass resolves it from free text —
// so the loader takes it as an argument rather than inferring it.
async function loadTicketContextForLocale(
  documentId: string,
  localeId: string,
): Promise<TicketContext> {
  "use step";
  const supabase = getSupabaseServiceClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, kind, raw_text, status")
    .eq("id", documentId)
    .single();
  if (documentError || !document) {
    throw new FatalError(`document ${documentId} not found: ${documentError?.message}`);
  }

  const { data: locale, error: localeError } = await supabase
    .from("locales")
    .select("id, unit_number, tenant_entity, property_id")
    .eq("id", localeId)
    .single();
  if (localeError || !locale) {
    throw new FatalError(`locale ${localeId} not found: ${localeError?.message}`);
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, jurisdiction_id")
    .eq("id", locale.property_id)
    .single();
  if (propertyError || !property) {
    throw new FatalError(`property for locale ${localeId} not found`);
  }

  const { data: lease } = await supabase
    .from("leases")
    .select("maintenance_clause, exclusive_use_clause")
    .eq("locale_id", localeId)
    .lte("start_date", new Date().toISOString())
    .gte("end_date", new Date().toISOString())
    .maybeSingle();

  const { data: assets } = await supabase
    .from("assets")
    .select("id, make, model, warranty_expiry, service_contract_provider, manual_url")
    .eq("locale_id", localeId);

  return {
    documentId,
    documentKind: document.kind,
    rawText: document.raw_text,
    locale: {
      id: locale.id,
      unit_number: locale.unit_number,
      tenant_entity: locale.tenant_entity,
    },
    property: { id: property.id, jurisdiction_id: property.jurisdiction_id },
    lease: lease ?? null,
    assets: assets ?? [],
  };
}

// ── Step 2: Diego's draft pass (Opus 5) ─────────────────────────────────────

const DiegoDraftSchema = z.object({
  priority: z.enum(["P1", "P2", "P3", "P4"]),
  priority_rationale: z.string(),
  diagnosis: z.string(),
  diagnosis_source: z.enum(["manual", "asset_register", "photo", "tenant_report"]),
  diagnostic_question_asked: z.string().nullable(),
  matched_asset_id: z.string().nullable(),
  cost_bucket: z.enum(["ARRENDADOR", "INQUILINO", "CAM", "PENDIENTE"]),
  lease_clause_citation: z.string().nullable(),
  jd05_applied: z.boolean(),
  unresolved_jd_keys: z.array(z.string()),
  estimated_cost_mxn: z.number().nullable(),
  recommended_trade: z.enum(["HVAC", "plomeria", "electrico", "seguridad", "refrigeracion"]),
});
type DiegoDraft = z.infer<typeof DiegoDraftSchema>;

const DIEGO_SYSTEM_PROMPT = `You are Diego, the maintenance-triage agent for a Mexican commercial plaza landlord.

SEVERITY (assign exactly one; three separate clocks, all start at report time):
P1 Emergencia — life-safety, security breach, flooding, gas, electrical fire risk, or local cannot legally/safely open. Acuse <=15min, en sitio <=2h, resolucion <=8h.
P2 Urgente — local open but trading materially impaired (HVAC/refrigeration/primary lighting failure). Acuse <=1h, en sitio same business day, resolucion <=24h. In desert/border plazas, HVAC failure May-Sept is P2 minimum, escalate to P1 if perishables or unsafe interior.
P3 Estandar — routine repair, no trading impact. Acuse <=4h, en sitio <=72h, resolucion <=5 business days.
P4 Programado — cosmetic/preventive/planned. Acuse <=1 business day.

DIAGNOSIS: ask only the one or two questions whose answer changes which trade gets dispatched. Resolve error codes against the asset's manual, cite the manual as the source. If two trades are plausible and nothing separates them, pick the trade that can diagnose the other.

COST ATTRIBUTION — cite the lease's maintenance clause verbatim if the fault is covered. If the clause is silent, you may apply JD-05 (the jurisdictional default for maintenance responsibility when the lease doesn't address it) — set jd05_applied true and still name the resulting bucket. If neither the clause nor JD-05 resolves it, set cost_bucket to PENDIENTE and list the unresolved key. Never guess a bucket without a cited source.
- ARRENDADOR: structure, roof, foundation, building envelope, base building systems.
- INQUILINO: interior finishes, tenant's own equipment, tenant-caused damage.
- CAM: shared systems — common HVAC, common lighting, parking, shared security.
- Capital replacement of an asset at end-of-life is landlord capital, not CAM-chargeable, even when that asset's routine repair would be.

WARRANTY: if you can match the reported fault to one of the assets provided, say so via matched_asset_id — the caller checks its warranty/service-contract status independently; you are not asked to judge dates yourself.

TRADE: recommended_trade must be exactly one of HVAC, plomeria, electrico, seguridad, refrigeracion — these are the contractor roster's own trade categories, used for an exact-match dispatch lookup. A descriptive phrase instead of one of these five values means no contractor gets found even when a valid one exists.

Respond only with the structured fields requested — no prose outside them.`;

async function draftDiegoTicket(context: TicketContext): Promise<DiegoDraft> {
  "use step";
  const client = new Anthropic();

  const userContent = [
    `Reporte del inquilino (${context.locale.tenant_entity ?? "desconocido"}, local ${context.locale.unit_number}):`,
    context.rawText ?? "(sin texto extraído — evidencia visual únicamente)",
    "",
    `Cláusula de mantenimiento del contrato: ${context.lease?.maintenance_clause ?? "(sin contrato activo cargado)"}`,
    "",
    "Activos registrados en este local:",
    context.assets.length
      ? context.assets
          .map((a) => `- id=${a.id} ${a.make ?? ""} ${a.model ?? ""}`.trim())
          .join("\n")
      : "(ninguno registrado)",
  ].join("\n");

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4000,
    system: [{ type: "text", text: DIEGO_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userContent }],
    output_config: { format: zodOutputFormat(DiegoDraftSchema) },
  });

  if (!response.parsed_output) {
    throw new FatalError("Diego draft pass returned no parsed output");
  }
  return response.parsed_output;
}

// ── Step 3: warranty check (pure DB — never trust the model on dates) ──────

async function checkWarranty(
  context: TicketContext,
  draft: DiegoDraft,
): Promise<{ covered: boolean; provider: string | null }> {
  "use step";
  if (!draft.matched_asset_id) return { covered: false, provider: null };

  const asset = context.assets.find((a) => a.id === draft.matched_asset_id);
  if (!asset) return { covered: false, provider: null };

  const underWarranty = asset.warranty_expiry
    ? new Date(asset.warranty_expiry) > new Date()
    : false;

  if (underWarranty || asset.service_contract_provider) {
    return { covered: true, provider: asset.service_contract_provider ?? "warranty" };
  }
  return { covered: false, provider: null };
}

// ── Step 4: skeptic pass (Opus 5) — re-audits the draft, not the raw report ─

const SkepticVerdictSchema = z.object({
  flagged: z.boolean(),
  concerns: z.array(z.string()),
  revised_cost_bucket: z.enum(["ARRENDADOR", "INQUILINO", "CAM", "PENDIENTE"]).nullable(),
});
type SkepticVerdict = z.infer<typeof SkepticVerdictSchema>;

const SKEPTIC_SYSTEM_PROMPT = `You audit a maintenance-triage draft before it reaches a landlord. Find the weakest claim in the cost attribution: an uncited clause, a capital-vs-repair mixup, a bucket assigned without JD-05 support when the clause is silent, or a priority that doesn't match the severity table. Flag only real problems — do not invent uncertainty that isn't there.`;

async function runSkeptic(
  context: TicketContext,
  draft: DiegoDraft,
): Promise<SkepticVerdict> {
  "use step";
  const client = new Anthropic();

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 2000,
    system: SKEPTIC_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `Cláusula de mantenimiento: ${context.lease?.maintenance_clause ?? "(ninguna)"}`,
          `Borrador de Diego: ${JSON.stringify(draft)}`,
        ].join("\n\n"),
      },
    ],
    output_config: { format: zodOutputFormat(SkepticVerdictSchema) },
  });

  if (!response.parsed_output) {
    throw new FatalError("skeptic pass returned no parsed output");
  }
  return response.parsed_output;
}

// ── Step 5: contractor + approval-tier matching (pure DB) ──────────────────

async function matchContractorAndTier(
  propertyId: string,
  trade: string,
  estimatedCost: number | null,
): Promise<{
  contractorId: string | null;
  approvalLevel: "AUTO" | "GERENTE" | "DIRECCION";
}> {
  "use step";
  const supabase = getSupabaseServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("trade", trade)
    .eq("active", true)
    .gte("license_expiry", today)
    .gte("coi_expiry", today)
    .limit(1)
    .maybeSingle();

  let approvalLevel: "AUTO" | "GERENTE" | "DIRECCION" = "DIRECCION";
  if (estimatedCost !== null) {
    const { data: tier } = await supabase
      .from("approval_tiers")
      .select("level")
      .eq("property_id", propertyId)
      .lte("min_amount", estimatedCost)
      .or(`max_amount.is.null,max_amount.gte.${estimatedCost}`)
      .limit(1)
      .maybeSingle();
    if (tier) approvalLevel = tier.level as typeof approvalLevel;
  }

  return { contractorId: contractor?.id ?? null, approvalLevel };
}

// ── Step 6: persist ─────────────────────────────────────────────────────────

async function writeTicket(params: {
  context: TicketContext;
  draft: DiegoDraft;
  warranty: { covered: boolean; provider: string | null };
  skeptic: SkepticVerdict;
  contractorId: string | null;
  approvalLevel: "AUTO" | "GERENTE" | "DIRECCION";
  status: "dispatched" | "needs_approval";
  workflowRunId: string;
}): Promise<string> {
  "use step";
  const supabase = getSupabaseServiceClient();
  const { context, draft, warranty, skeptic, contractorId, approvalLevel, status, workflowRunId } = params;

  // A flagged skeptic pass with no replacement bucket means real doubt, not
  // resolved doubt — escalating to PENDIENTE rather than silently keeping the
  // draft's now-disputed bucket. "Ambiguity is escalated, never guessed" per
  // maintenance-dispatcher/SKILL.md §2C — that principle applies to the
  // skeptic's own uncertainty, not just the draft's.
  const finalCostBucket = skeptic.revised_cost_bucket ?? (skeptic.flagged ? "PENDIENTE" : draft.cost_bucket);

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      locale_id: context.locale.id,
      tenant_entity: context.locale.tenant_entity ?? "desconocido",
      channel: context.documentKind,
      raw_report: context.rawText ?? "(evidencia visual, sin texto)",
      priority: draft.priority,
      status,
      diagnosis_question: draft.diagnostic_question_asked,
      diagnosis_source: draft.diagnosis_source,
      diagnosis_answer: draft.diagnosis,
      asset_id: draft.matched_asset_id,
      warranty_covered: warranty.covered,
      cost_bucket: warranty.covered ? "ARRENDADOR" : finalCostBucket,
      lease_clause_citation: draft.lease_clause_citation,
      estimated_cost: warranty.covered ? 0 : draft.estimated_cost_mxn,
      approval_level: approvalLevel,
      contractor_id: contractorId,
      unresolved_jd_keys: draft.unresolved_jd_keys,
      skeptic_flagged: skeptic.flagged,
      skeptic_concerns: skeptic.concerns,
      workflow_run_id: workflowRunId,
    })
    .select("id")
    .single();

  if (error || !ticket) {
    throw new FatalError(`failed to write ticket: ${error?.message}`);
  }

  await supabase.from("agent_decisions").insert({
    skill: "maintenance-dispatcher",
    ticket_id: ticket.id,
    raw_input: context.rawText ?? "",
    ai_draft: { draft, skeptic },
  });

  await supabase
    .from("documents")
    .update({ status: "attached", ticket_id: ticket.id, workflow_run_id: workflowRunId })
    .eq("id", context.documentId);

  return ticket.id as string;
}

async function markDispatched(ticketId: string) {
  "use step";
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("tickets")
    .update({ status: "dispatched", dispatched_at: new Date().toISOString() })
    .eq("id", ticketId);
}

async function markApprovalResolved(ticketId: string, approved: boolean) {
  "use step";
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("tickets")
    .update({
      status: approved ? "dispatched" : "closed_administrative",
      dispatched_at: approved ? new Date().toISOString() : null,
    })
    .eq("id", ticketId);
}

// ── The workflow ─────────────────────────────────────────────────────────

export async function diegoTriageWorkflow(documentId: string, localeId: string) {
  "use workflow";

  const context = await loadTicketContextForLocale(documentId, localeId);
  const draft = await draftDiegoTicket(context);
  const warranty = await checkWarranty(context, draft);
  const skeptic = await runSkeptic(context, draft);

  const { contractorId, approvalLevel } = await matchContractorAndTier(
    context.property.id,
    draft.recommended_trade,
    warranty.covered ? 0 : draft.estimated_cost_mxn,
  );

  const { workflowRunId } = getWorkflowMetadata();
  const status = warranty.covered || approvalLevel === "AUTO" ? "dispatched" : "needs_approval";

  const ticketId = await writeTicket({
    context,
    draft,
    warranty,
    skeptic,
    contractorId,
    approvalLevel,
    status,
    workflowRunId,
  });

  if (status === "needs_approval") {
    // Tier 3 human gate (root CLAUDE.md §1) — suspends here at zero cost
    // until Phase 4's approval UI calls resumeHook(`ticket-approval:${ticketId}`, ...).
    const hook = createHook<{ approved: boolean }>({
      token: `ticket-approval:${ticketId}`,
    });
    const decision = await hook;
    await markApprovalResolved(ticketId, decision.approved);
    return { ticketId, status: decision.approved ? "dispatched" : "closed_administrative" };
  }

  await markDispatched(ticketId);
  return { ticketId, status: "dispatched" };
}
