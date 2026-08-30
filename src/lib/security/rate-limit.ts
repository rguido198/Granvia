import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase/server";

type RateLimitResult = { allowed: boolean };

/**
 * Fixed-window rate limit via the consume_rate_limit() RPC (see
 * 20260829000005_rate_limit_counters.sql). One atomic
 * INSERT ... ON CONFLICT DO UPDATE ... RETURNING inside that function —
 * not a count-then-insert from application code — so concurrent callers
 * for the same bucket serialize on Postgres's row lock instead of all
 * observing capacity before any of them commits.
 *
 * Defaults to failing OPEN on an infra error — a Supabase outage should not
 * also take down /api/ingest, whose primary defenses (size cap, magic-byte
 * check) don't depend on this at all. Pass `failClosed: true` for a caller
 * where this check IS the primary defense — /api/site-auth's brute-force
 * throttle has no other layer behind it, so an RPC permission/config fault
 * there should block the password endpoint rather than silently drop its
 * only protection.
 */
export async function checkRateLimit(
  bucketKey: string,
  opts: { max: number; windowMs: number; failClosed?: boolean },
): Promise<RateLimitResult> {
  const supabase = getSupabaseServiceClient();

  const { data: allowed, error } = await supabase.rpc("consume_rate_limit", {
    p_bucket_key: bucketKey,
    p_max: opts.max,
    p_window_seconds: Math.max(1, Math.floor(opts.windowMs / 1000)),
  });

  if (error) {
    console.error(`rate limit check failed for ${bucketKey}`, error);
    return { allowed: !opts.failClosed };
  }

  return { allowed: allowed === true };
}

/**
 * Cloudflare's own header, not a hand-rolled `x-forwarded-for` split, which
 * trusts whatever value a client sent first in a comma-separated list a
 * client fully controls unless the platform in front of the function is
 * known to overwrite/append it. `cf-connecting-ip` is set by Cloudflare's
 * edge for the request's actual TCP peer and cannot be spoofed by the
 * client, so a caller can't just set their own `x-forwarded-for` to
 * someone else's IP to dodge or frame another bucket.
 *
 * Returns "unknown" outside Cloudflare (local dev has no untrusted edge in
 * front of it, so a single shared bucket there is fine).
 */
export function getClientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}
