// Aliases the `server-only` package for this Worker's bundle (see
// wrangler.jsonc's `alias` config). The shared src/lib/... files this worker
// reuses (getSupabaseServiceClient, lease-extraction, exclusivity-check)
// import "server-only" to stop them bundling into a browser bundle inside
// the Next.js app — a guard that throws unless a bundler sets Next's
// "react-server" resolve condition. This Worker isn't Next.js and has no
// browser bundle to guard against in the first place, so the guard is
// simply irrelevant here, not something to satisfy.
export {};
