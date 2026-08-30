// Bridges wrangler's generated `Env` (worker-configuration.d.ts, regenerate
// with `npx wrangler types` after any wrangler.jsonc change) into
// @opennextjs/cloudflare's own `CloudflareEnv` global interface — the type
// getCloudflareContext() returns `env` as. The two are declared separately
// upstream; this file is the merge point, not duplicated binding lists.
declare global {
  interface CloudflareEnv extends Env {}
}

export {};
