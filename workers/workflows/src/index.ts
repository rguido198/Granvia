import type { WorkflowsEnv } from "./env";

export { DiegoTriageWorkflow } from "./diego-triage-entrypoint";
export { LeaseDigitizationWorkflow } from "./lease-digitization";
export { LeaseRenewalWorkflow } from "./lease-renewal";
export { MarianaScreeningWorkflow } from "./mariana-screening";

/**
 * This Worker has no HTTP surface of its own — it only exists so wrangler
 * has somewhere to define the four WorkflowEntrypoint classes above (see
 * wrangler.jsonc's [[workflows]] entries). The main `la-gran-via` app worker
 * talks to them exclusively via its own [[workflows]] bindings
 * (cross-worker, via script_name) — nothing ever calls this fetch handler.
 */
export default {
  async fetch(): Promise<Response> {
    return new Response("la-gran-via-workflows: no public HTTP surface", {
      status: 404,
    });
  },
} satisfies ExportedHandler<WorkflowsEnv>;
