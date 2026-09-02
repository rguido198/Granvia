import {
  WorkflowEntrypoint,
  type WorkflowStep,
  type WorkflowEvent,
} from "cloudflare:workers";

import { hydrateProcessEnv, type WorkflowsEnv } from "./env";
import {
  type Params,
  loadTicketContextForLocale,
  draftDiegoTicket,
  checkWarranty,
  runSkeptic,
  matchContractorAndTier,
  writeTicket,
  markApprovalResolved,
  markDispatched,
} from "./diego-triage";

/**
 * The real Workflows-platform entrypoint for Diego triage — split out from
 * diego-triage.ts so that file can stay free of value imports from
 * "cloudflare:workers"/"cloudflare:workflows". diego-triage.ts is also
 * dynamically imported from src/app/api/ingest/route.ts (the local
 * direct-execution fallback, via runDiegoTriageDirect) and pulled into the
 * main Next.js app's webpack bundle — Next's webpack build doesn't know how
 * to resolve the "cloudflare:" scheme, and even once worked around at that
 * layer, OpenNext's own esbuild server-function bundling has no external
 * hook for it either. Keeping the real cloudflare:workers import confined to
 * this file (only ever built by wrangler's own toolchain, never by Next's)
 * avoids both, while still giving the *deployed* DiegoTriageWorkflow class a
 * real WorkflowEntrypoint base — required for Cloudflare's deploy validation
 * (error code 10021 otherwise: "Workflow ... must be exported").
 */
export class DiegoTriageWorkflow extends WorkflowEntrypoint<
  WorkflowsEnv,
  Params
> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    hydrateProcessEnv(this.env);
    const { documentId, localeId } = event.payload;

    const context = await step.do("load ticket context", () =>
      loadTicketContextForLocale(documentId, localeId),
    );
    const draft = await step.do("draft diego ticket", () =>
      draftDiegoTicket(context),
    );
    const warranty = await step.do("check warranty", () =>
      checkWarranty(context, draft),
    );
    const skeptic = await step.do("run skeptic", () =>
      runSkeptic(context, draft),
    );

    const { contractorId, approvalLevel } = await step.do(
      "match contractor and tier",
      () =>
        matchContractorAndTier(
          context.property.id,
          draft.recommended_trade,
          warranty.covered ? 0 : draft.estimated_cost_mxn,
        ),
    );

    const workflowRunId = event.instanceId;
    // The RBAC tab's emergency kill-switch (properties.autonomy_frozen) overrides
    // every auto-dispatch path, warranty claims included — while it's active, every
    // ticket lands in needs_approval regardless of tier or warranty coverage.
    const status: "dispatched" | "needs_approval" = context.property
      .autonomy_frozen
      ? "needs_approval"
      : warranty.covered || approvalLevel === "AUTO"
        ? "dispatched"
        : "needs_approval";

    const ticketId = await step.do("write ticket", () =>
      writeTicket(this.env, {
        context,
        draft,
        warranty,
        skeptic,
        contractorId,
        approvalLevel,
        status,
        workflowRunId,
      }),
    );

    if (status === "needs_approval") {
      // Tier 3 human gate (root CLAUDE.md §1) — suspends here until the
      // approve route calls (await env.DIEGO_TRIAGE_WORKFLOW.get(instanceId))
      // .sendEvent({ type: `ticket-approval-${ticketId}`, payload: {...} }).
      // 30-day timeout: generous enough that a slow landlord never loses the
      // decision outright, unlike Vercel createHook's unbounded wait.
      try {
        const approvalEvent = await step.waitForEvent<{ approved: boolean }>(
          "await ticket approval",
          {
            type: `ticket-approval-${ticketId}`,
            timeout: "30 days",
          },
        );
        const decision = approvalEvent.payload;
        await step.do("mark approval resolved", () =>
          markApprovalResolved(this.env, ticketId, decision.approved),
        );
        return {
          ticketId,
          status: decision.approved ? "dispatched" : "closed_administrative",
        };
      } catch {
        // Timed out waiting for a landlord decision — leave the ticket at
        // needs_approval; a human can still resolve it manually, this just
        // stops the workflow instance from staying alive forever.
        return { ticketId, status: "needs_approval" as const };
      }
    }

    await step.do("mark dispatched", () => markDispatched(this.env, ticketId));
    return { ticketId, status: "dispatched" as const };
  }
}
