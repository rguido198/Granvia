// Bridges wrangler's generated `Env` (worker-configuration.d.ts) into
// @opennextjs/cloudflare's global `CloudflareEnv` interface, with explicit
// Workflow bindings so TypeScript compilation succeeds in CI build runners.

declare global {
  interface CloudflareEnv extends Env {
    DIEGO_TRIAGE_WORKFLOW: Workflow;
    LEASE_DIGITIZATION_WORKFLOW: Workflow;
    LEASE_RENEWAL_WORKFLOW: Workflow;
    MARIANA_SCREENING_WORKFLOW: Workflow;
    GEMINI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
  }
}

export {};
