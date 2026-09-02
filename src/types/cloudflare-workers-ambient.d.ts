// The main app's tsconfig excludes `workers/`, but next build's typecheck
// still walks workers/workflows/src/diego-triage.ts transitively — it's
// dynamically imported from src/app/api/ingest/route.ts (the local direct
// execution fallback when no DIEGO_TRIAGE_WORKFLOW binding is present). That
// file's `import type { WorkflowStep, WorkflowEvent } from "cloudflare:workers"`
// otherwise fails to resolve here, since only workers/workflows/tsconfig.json
// (a separate program, used for the real Workers build) declares
// @cloudflare/workers-types. This shim exists only to satisfy this program's
// typecheck of that type-only import — it is never used at runtime.
declare module "cloudflare:workers" {
  export type WorkflowStep = {
    do<T>(name: string, callback: () => Promise<T>): Promise<T>;
    waitForEvent<T>(
      name: string,
      options: { type: string; timeout?: string },
    ): Promise<{ payload: T }>;
  };
  export type WorkflowEvent<T = unknown> = {
    payload: T;
    timestamp: Date;
    instanceId: string;
    workflowName: string;
  };
}
