// The main app's tsconfig excludes `workers/`, but next build's typecheck
// still walks workers/workflows/src/diego-triage.ts transitively — it's
// dynamically imported from src/app/api/ingest/route.ts (the local direct
// execution fallback when no DIEGO_TRIAGE_WORKFLOW binding is present).
// diego-triage.ts itself has no cloudflare:workers/cloudflare:workflows
// imports (the real WorkflowEntrypoint-based class was split out to
// diego-triage-entrypoint.ts, which this program never reaches), but it
// still imports ./env, whose WorkflowsEnv.APP_WORKER is typed as `Fetcher` —
// a Workers-runtime-only global that only workers/workflows/tsconfig.json's
// own program (a separate program, used for the real Workers build)
// declares via @cloudflare/workers-types.
//
// No top-level import/export in this file, so it's already a global script
// context — a `declare global` wrapper isn't needed (and isn't valid) here.
interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}
