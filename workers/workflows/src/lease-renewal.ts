import {
  WorkflowEntrypoint,
  type WorkflowStep,
  type WorkflowEvent,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { CANONICAL_CLAUDE_MODEL } from "../../../src/lib/llm/provider";
import { getSupabaseServiceClient } from "../../../src/lib/supabase/server";
import { hydrateProcessEnv, type WorkflowsEnv } from "./env";

/**
 * Mariana's renewal-drafting as a durable state machine, on Cloudflare
 * Workflows. Ported from src/workflows/lease-renewal.ts (the Vercel
 * `workflow` SDK version) — business logic unchanged; only the durable-
 * execution primitives differ. Source of truth for the mechanics:
 * .claude/skills/lease-renewal-drafter/SKILL.md in the OS repo — this file
 * implements it, it doesn't restate it in full.
 *
 * Scope boundary (SKILL.md's own words): this drafts a Convenio
 * Modificatorio for a landlord to review. It never signs, sends, or writes
 * onto the real `leases` row.
 */

type Params = {
  leaseId: string;
  newEndDate: string;
  newBaseRentMonthly: number;
  escalationMethod: string;
  escalationPct: number | null;
};

const JURISDICTION_PACK_REF = "México · mx.md v1.0 (2026-08-04)";
const PACK_COUNSEL_VERIFIED = false;
const RENEWAL_UNRESOLVED_JD_KEYS = ["JD-01"];
const RENEWAL_CONSUMED_JD_KEYS = ["JD-01", "JD-04", "JD-07"];

type RenewalContext = {
  leaseId: string;
  localeId: string;
  unitNumber: string;
  areaSqm: number | null;
  tenantEntity: string;
  currentEndDate: string;
  currentBaseRentMonthly: number | null;
  responsibilityMatrix: Record<string, string> | null;
  noticePeriodDays: number | null;
  exclusiveUseClause: string | null;
  permittedUse: string | null;
  newStartDate: string;
  newEndDate: string;
  newBaseRentMonthly: number;
  escalationMethod: string;
  escalationPct: number | null;
  draftedOn: string;
  maintenanceTickets?: Array<{
    ticketNumber: string;
    costBucket: string | null;
    rawReport: string;
    diagnosis: string | null;
  }>;
};

async function loadRenewalContext(params: Params): Promise<RenewalContext> {
  const supabase = getSupabaseServiceClient();
  const {
    leaseId,
    newEndDate,
    newBaseRentMonthly,
    escalationMethod,
    escalationPct,
  } = params;

  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select(
      "id, locale_id, tenant_entity, end_date, base_rent_monthly, responsibility_matrix, notice_period_days, exclusive_use_clause, permitted_use",
    )
    .eq("id", leaseId)
    .single();
  if (leaseError || !lease) {
    throw new NonRetryableError(
      `lease ${leaseId} not found: ${leaseError?.message}`,
    );
  }

  const { data: locale, error: localeError } = await supabase
    .from("locales")
    .select("id, unit_number, area_sqm")
    .eq("id", lease.locale_id)
    .single();
  if (localeError || !locale) {
    throw new NonRetryableError(
      `locale for lease ${leaseId} not found: ${localeError?.message}`,
    );
  }

  // Fetch historical maintenance tickets for this locale to clarify any recurring disputes or system boundaries
  const { data: ticketsData } = await supabase
    .from("tickets")
    .select("ticket_number, cost_bucket, raw_report, diagnosis_answer")
    .eq("locale_id", lease.locale_id);

  const maintenanceTickets = (ticketsData ?? []).map((t) => ({
    ticketNumber: t.ticket_number as string,
    costBucket: t.cost_bucket as string | null,
    rawReport: t.raw_report as string,
    diagnosis: t.diagnosis_answer as string | null,
  }));

  const currentEnd = new Date(lease.end_date);
  const newStart = new Date(currentEnd);
  newStart.setDate(newStart.getDate() + 1);

  return {
    leaseId,
    localeId: locale.id as string,
    unitNumber: locale.unit_number as string,
    areaSqm: locale.area_sqm as number | null,
    tenantEntity: lease.tenant_entity as string,
    currentEndDate: lease.end_date as string,
    currentBaseRentMonthly: lease.base_rent_monthly as number | null,
    responsibilityMatrix: lease.responsibility_matrix as Record<
      string,
      string
    > | null,
    noticePeriodDays: lease.notice_period_days as number | null,
    exclusiveUseClause: lease.exclusive_use_clause as string | null,
    permittedUse: lease.permitted_use as string | null,
    newStartDate: newStart.toISOString().slice(0, 10),
    newEndDate,
    newBaseRentMonthly,
    escalationMethod,
    escalationPct,
    draftedOn: new Date().toISOString().slice(0, 10),
    maintenanceTickets,
  };
}

const RenewalDraftSchema = z.object({ draft_markdown: z.string() });
type RenewalDraft = z.infer<typeof RenewalDraftSchema>;

const RENEWAL_SYSTEM_PROMPT = `You are Mariana, the lease-renewal agent for a Mexican commercial plaza landlord. You draft a Convenio Modificatorio de Arrendamiento Comercial (lease extension addendum) for an expiring or expired lease, formatted specifically as a working draft for the landlord to present to their legal counsel.

TEMPLATE — follow this structure and section numbering exactly (this is the template from lease-renewal-drafter/SKILL.md §3, do not deviate from its shape):

[DRAFT — PENDING LANDLORD COUNSEL SIGN-OFF ON UNRESOLVED JURISDICTION KEYS: {unresolved_keys}]  ← prepend verbatim, with the real comma-separated key list, ONLY if unresolved keys were given below. Omit this line entirely if none were given.
### CONVENIO MODIFICATORIO DE ARRENDAMIENTO COMERCIAL (BORRADOR PARA REVISIÓN DE ABOGADO) — MARIANA
**Fecha:** {use the drafted_on date given below, verbatim}
**Plaza:** La Gran Vía
**Arrendatario:** {tenant_entity}
**Local:** Local {unit_number} ({area_sqm} m²)
**Aviso Legal:** Documento preliminar de trabajo para revisión del abogado / asesoría jurídica del arrendador. No constituye contrato definitivo ni oferta formal vinculante.

#### RESUMEN COMPARATIVO DE MODIFICACIONES (CONTRATO ANTERIOR VS. VERSIÓN ACTUALIZADA)
- **Vigencia:** Vigencia Anterior: {current_end_date} ➔ Nueva Vigencia: {new_start_date} a {new_end_date}
- **Renta Base Mensual:** Renta Anterior: {current_base_rent_monthly} ➔ Renta Nueva: {new_base_rent_monthly} (Incremento/Ajuste: {escalation_pct} / {escalation_method})
- **Cláusulas CAM y Mantenimiento:** Continuidad de matriz de responsabilidad de mantenimiento y días de aviso previa del contrato anterior, incorporando precisiones técnicas derivadas del historial de tickets.
- **Disposiciones Inalteradas:** Salvo por vigencia y renta reajustada, la exclusividad, uso permitido y demás cláusulas del contrato original subsisten sin modificación.

#### CLÁUSULAS DE PRÓRROGA
1. **PRÓRROGA DE VIGENCIA:** states the extension period, from {new_start_date} to {new_end_date}, explicitly comparing with the previous contract expiration date ({current_end_date}).
2. **RENTA REAJUSTADA:** states the new monthly rent, the escalation method and percentage given below (both are supplied to you — state them as given, do not invent a different method or omit the one you were given), and the percentage change from the current rent (compute and state the % change from current_base_rent_monthly to new_base_rent_monthly — if current_base_rent_monthly is null, say the prior rent wasn't on record instead of inventing one).
3. **MANTENIMIENTO Y CUOTA CAM:** this section title is fixed by the template — references the existing responsibility_matrix and notice_period_days given below, restated plainly. If historical maintenance tickets are provided in the context below, review them for friction points or generic responsibilities (e.g., plumbing under sinks, tenant-owned equipment vs building HVAC/roof). Add an explicit technical clarification sub-clause ("Aclaración Técnica de Mantenimiento:") to resolve those boundaries clearly between Landlord and Tenant to prevent future disputes.
4. **SUBSISTENCIA DE TÉRMINOS:** a clause stating all other terms of the original contract remain in force — this MUST be present verbatim in substance; the whole point of a Convenio Modificatorio is that it modifies only term and rent, not the rest of the contract. If exclusive_use_clause or permitted_use were given below, restate them here as terms that remain unchanged — do not silently drop them.

Close with a citation line naming the jurisdiction pack reference and, verbatim, the exact JD key list given to you below as "claves citables" — do not add, drop, or guess at keys — plus the standing disclaimer that this is a draft subject to landlord and counsel review.

Do not invent any clause, date, or figure not given to you. Where information is missing, say so in the relevant section rather than filling a plausible-sounding placeholder.`;

async function draftRenewal(context: RenewalContext): Promise<RenewalDraft> {
  const client = new Anthropic();

  const pctChange =
    context.currentBaseRentMonthly && context.currentBaseRentMonthly > 0
      ? (
          ((context.newBaseRentMonthly - context.currentBaseRentMonthly) /
            context.currentBaseRentMonthly) *
          100
        ).toFixed(1)
      : null;

  const ticketsText =
    context.maintenanceTickets && context.maintenanceTickets.length > 0
      ? context.maintenanceTickets
          .map(
            (t) =>
              `- Ticket ${t.ticketNumber} [Responsable: ${t.costBucket ?? "Pendiente"}]: ${t.rawReport}${t.diagnosis ? ` | Diagnóstico: ${t.diagnosis}` : ""}`,
          )
          .join("\n")
      : "(sin tickets de mantenimiento registrados)";

  const userContent = [
    `Fecha de elaboración (usar tal cual en el campo "Fecha"): ${context.draftedOn}.`,
    `Local: ${context.unitNumber}, ${context.areaSqm ?? "?"} m².`,
    `Arrendatario: ${context.tenantEntity}.`,
    `Vigencia actual: vence ${context.currentEndDate}.`,
    `Nueva vigencia: ${context.newStartDate} a ${context.newEndDate}.`,
    `Renta actual: ${context.currentBaseRentMonthly !== null ? `$${context.currentBaseRentMonthly} MXN/mes` : "(no está en registro)"}.`,
    `Renta nueva (dato del arrendador, no lo recalcules): $${context.newBaseRentMonthly} MXN/mes.`,
    `Método de escalación: ${context.escalationMethod}${context.escalationPct !== null ? ` (${context.escalationPct}%)` : ""}.`,
    pctChange !== null
      ? `Cambio calculated: ${pctChange}% respecto a la renta actual.`
      : "",
    "",
    "Matriz de responsabilidad de mantenimiento vigente:",
    context.responsibilityMatrix
      ? JSON.stringify(context.responsibilityMatrix)
      : "(no está en registro)",
    `Días de aviso de terminación vigentes: ${context.noticePeriodDays ?? "(no está en registro)"}.`,
    `Historial de tickets de mantenimiento de este local:\n${ticketsText}`,
    `Cláusula de exclusividad vigente: ${context.exclusiveUseClause ?? "(ninguna)"}.`,
    `Uso permitido vigente: ${context.permittedUse ?? "(no especificado)"}.`,
    "",
    `Jurisdicción: ${JURISDICTION_PACK_REF}.`,
    `Claves citables en la referencia final (exactamente estas, en este orden): ${RENEWAL_CONSUMED_JD_KEYS.join(", ")}.`,
    PACK_COUNSEL_VERIFIED
      ? "Paquete verificado por el abogado del arrendador — no se requiere watermark."
      : `Claves de jurisdicción sin resolver para este skill: ${RENEWAL_UNRESOLVED_JD_KEYS.join(", ")} — antepone el watermark de borrador exactamente como se especifica.`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.parse({
    model: CANONICAL_CLAUDE_MODEL,
    // draft_markdown holds the entire Convenio Modificatorio (comparison
    // table + 4 clauses + citation line, in Spanish legal register) as one
    // free-text field — much longer than the small structured SkepticVerdict
    // below, which itself needed 4000 after 2000 truncated it live in
    // mariana-screening.ts's skeptic pass (see that file's comment). 3000
    // was tighter than that already-too-tight budget for a much larger
    // output — bumped to match extractFromVision's 6000 (src/lib/ingest/
    // lease-extraction.ts), the other free-text-heavy generation in this
    // codebase.
    max_tokens: 6000,
    system: [
      {
        type: "text",
        text: RENEWAL_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
    output_config: { format: zodOutputFormat(RenewalDraftSchema) },
  });

  if (!response.parsed_output) {
    throw new NonRetryableError("renewal draft pass returned no parsed output");
  }
  return response.parsed_output;
}

const SkepticVerdictSchema = z.object({
  flagged: z.boolean(),
  concerns: z.array(z.string()),
});
type SkepticVerdict = z.infer<typeof SkepticVerdictSchema>;

const SKEPTIC_SYSTEM_PROMPT = `You audit a lease-renewal draft before it reaches a landlord. Check specifically:
- Is CLÁUSULA 4 (SUBSISTENCIA DE TÉRMINOS) actually present, and does it say the rest of the original contract remains in force?
- Is the RESUMEN COMPARATIVO DE MODIFICACIONES present, clearly contrasting previous contract terms vs updated terms?
- If an exclusive-use clause or permitted-use was given as context, does the draft restate it rather than silently dropping it?
- Does CLÁUSULA 3 restate the given responsibility matrix / notice period and incorporate any necessary maintenance clarification when ticket history was present? The "CUOTA CAM" heading is required by the template and is NOT an invented term on its own — only flag it if the draft states a specific CAM amount or formula that wasn't given to it.
- If unresolved jurisdiction keys were given, is the watermark banner present at the top, verbatim, with exactly those keys?
- Does the closing citation line list exactly the "claves citables" given below — no more, no fewer?
- Does the escalation method/percentage in CLÁUSULA 2 match what was given below? It is legitimate context, not an invention, as long as it matches.
- Does any OTHER figure, date, or clause appear in the draft that wasn't in the source context below (an invented number or term)?
Flag only real problems — do not invent uncertainty that isn't there. This is not a legal-soundness review (that's the landlord's counsel's job) — it's a fidelity check against the source lease and the given instructions.`;

async function runRenewalSkeptic(
  context: RenewalContext,
  draft: RenewalDraft,
): Promise<SkepticVerdict> {
  const client = new Anthropic();

  const response = await client.messages.parse({
    model: CANONICAL_CLAUDE_MODEL,
    max_tokens: 4000,
    system: SKEPTIC_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `Fecha de elaboración dada al redactor: ${context.draftedOn}.`,
          `Local: ${context.unitNumber}, ${context.areaSqm ?? "?"} m². Arrendatario: ${context.tenantEntity}.`,
          `Vigencia actual: vence ${context.currentEndDate}. Nueva vigencia: ${context.newStartDate} a ${context.newEndDate}.`,
          `Renta actual: ${context.currentBaseRentMonthly ?? "(no está en registro)"}. Renta nueva: ${context.newBaseRentMonthly}.`,
          `Método de escalación dado al redactor (legítimo, no inventado si coincide): ${context.escalationMethod}${context.escalationPct !== null ? ` (${context.escalationPct}%)` : ""}.`,
          `Matriz de responsabilidad vigente: ${context.responsibilityMatrix ? JSON.stringify(context.responsibilityMatrix) : "(no está en registro)"}.`,
          `Días de aviso vigentes: ${context.noticePeriodDays ?? "(no está en registro)"}.`,
          `Cláusula de exclusividad vigente: ${context.exclusiveUseClause ?? "(ninguna)"}.`,
          `Uso permitido vigente: ${context.permittedUse ?? "(no especificado)"}.`,
          `Claves citables esperadas en la referencia final (exactamente estas): ${RENEWAL_CONSUMED_JD_KEYS.join(", ")}.`,
          `Claves de jurisdicción sin resolver dadas al redactor: ${RENEWAL_UNRESOLVED_JD_KEYS.join(", ") || "(ninguna)"}.`,
          "",
          `Borrador de Mariana:\n${draft.draft_markdown}`,
        ].join("\n"),
      },
    ],
    output_config: { format: zodOutputFormat(SkepticVerdictSchema) },
  });

  if (!response.parsed_output) {
    throw new NonRetryableError(
      "renewal skeptic pass returned no parsed output",
    );
  }
  return response.parsed_output;
}

async function writeRenewal(params: {
  context: RenewalContext;
  draft: RenewalDraft;
  skeptic: SkepticVerdict;
  workflowRunId: string;
}): Promise<string> {
  const supabase = getSupabaseServiceClient();
  const { context, draft, skeptic, workflowRunId } = params;

  const { data: renewal, error } = await supabase
    .from("lease_renewals")
    .insert({
      source_lease_id: context.leaseId,
      locale_id: context.localeId,
      tenant_entity: context.tenantEntity,
      current_end_date: context.currentEndDate,
      new_start_date: context.newStartDate,
      new_end_date: context.newEndDate,
      current_base_rent_monthly: context.currentBaseRentMonthly,
      new_base_rent_monthly: context.newBaseRentMonthly,
      escalation_pct: context.escalationPct,
      escalation_method: context.escalationMethod,
      draft_markdown: draft.draft_markdown,
      skeptic_flagged: skeptic.flagged,
      skeptic_concerns: skeptic.concerns,
      jurisdiction_pack_ref: JURISDICTION_PACK_REF,
      unresolved_jd_keys: PACK_COUNSEL_VERIFIED
        ? []
        : RENEWAL_UNRESOLVED_JD_KEYS,
      status: "needs_landlord_review",
      workflow_run_id: workflowRunId,
    })
    .select("id")
    .single();

  if (error || !renewal) {
    throw new NonRetryableError(
      `failed to write lease_renewal: ${error?.message}`,
    );
  }
  return renewal.id as string;
}

async function markReviewed(
  renewalId: string,
  approved: boolean,
  reviewedById: string | undefined,
) {
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("lease_renewals")
    .update({
      status: approved ? "approved" : "rejected",
      reviewed_by: reviewedById ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", renewalId);
}

export class LeaseRenewalWorkflow extends WorkflowEntrypoint<
  WorkflowsEnv,
  Params
> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    hydrateProcessEnv(this.env);
    const params = event.payload;

    const context = await step.do("load renewal context", () =>
      loadRenewalContext(params),
    );
    const draft = await step.do("draft renewal", () => draftRenewal(context));
    const skeptic = await step.do("run renewal skeptic", () =>
      runRenewalSkeptic(context, draft),
    );

    const workflowRunId = event.instanceId;
    const renewalId = await step.do("write renewal", () =>
      writeRenewal({ context, draft, skeptic, workflowRunId }),
    );

    // Tier 3 human gate (root CLAUDE.md §1) — SKILL.md §"Landlord Guardrails":
    // renewal terms and addendums must be formally approved by the landlord
    // before being presented to the tenant. Woken by the review UI sending
    // an event of type `lease-renewal-review-${renewalId}`.
    try {
      const reviewEvent = await step.waitForEvent<{
        approved: boolean;
        reviewedById?: string;
      }>("await renewal review", {
        type: `lease-renewal-review-${renewalId}`,
        timeout: "30 days",
      });
      const decision = reviewEvent.payload;
      await step.do("mark reviewed", () =>
        markReviewed(renewalId, decision.approved, decision.reviewedById),
      );
      return {
        renewalId,
        status: decision.approved
          ? ("approved" as const)
          : ("rejected" as const),
      };
    } catch {
      return { renewalId, status: "needs_landlord_review" as const };
    }
  }
}
