export type WorkflowsEnv = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ANTHROPIC_API_KEY: string;
  GEMINI_API_KEY: string;
  INTERNAL_WORKER_SECRET: string;
  // Service binding to the main `la-gran-via` app worker — used only to ask
  // it to invalidate its own in-process Next.js data cache (revalidateTag
  // lives in next/cache, which does not exist outside a Next.js runtime, so
  // that call has to happen over there, not in this plain Worker).
  APP_WORKER: Fetcher;
};

/**
 * getSupabaseServiceClient()/new Anthropic() (both reused as-is from
 * src/lib/...) read process.env directly — that's correct inside the Next.js
 * app worker (OpenNext shims process.env from its own bindings), but this is
 * a hand-written plain Worker: nodejs_compat gives us a real, mutable
 * process.env object, it just isn't pre-populated from wrangler bindings.
 * Call this once at the top of every WorkflowEntrypoint.run() so the shared
 * helper files work completely unmodified.
 */
export function hydrateProcessEnv(env: WorkflowsEnv): void {
  process.env.SUPABASE_URL = env.SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
}

/**
 * Cross-worker equivalent of src/lib/copiloto/cache.ts's
 * invalidateCopilotoCache() — that one calls next/cache's revalidateTag,
 * which only exists inside the Next.js app's own runtime. This asks the app
 * worker to do it via a private, secret-gated internal route, over a service
 * binding (worker-to-worker, never touches the public network).
 */
export async function notifyCopilotoCacheStale(
  env: WorkflowsEnv,
): Promise<void> {
  try {
    const response = await env.APP_WORKER.fetch(
      "https://internal/api/internal/revalidate-copiloto",
      {
        method: "POST",
        headers: { "x-internal-secret": env.INTERNAL_WORKER_SECRET },
      },
    );
    if (!response.ok) {
      console.error(
        `notifyCopilotoCacheStale: app worker returned ${response.status}`,
      );
    }
  } catch (error) {
    // Cache staleness self-heals within Copiloto's own 30s safety-net window
    // (see the caller's comment) — never let this fail the workflow step.
    console.error("notifyCopilotoCacheStale: request failed", error);
  }
}
