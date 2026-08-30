import { NextResponse, type NextRequest } from "next/server";

import { invalidateCopilotoCache } from "@/lib/copiloto/cache";

/**
 * Private, worker-to-worker only route: the la-gran-via-workflows Worker
 * calls this over a Cloudflare service binding (never the public internet)
 * whenever one of the four durable workflows writes data Copiloto's cached
 * answers are grounded in. next/cache's revalidateTag only exists inside
 * this Next.js app's own runtime, so a plain Worker can't call it directly —
 * this route is the bridge. See workers/workflows/src/env.ts's
 * notifyCopilotoCacheStale().
 *
 * This path is also reachable over the public internet like any other route
 * handler (Cloudflare service bindings don't remove that), so it's still
 * gated by a shared secret rather than left open.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_WORKER_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  invalidateCopilotoCache();
  return NextResponse.json({ ok: true });
}
