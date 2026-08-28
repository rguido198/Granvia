import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { askCopilotoStream } from "@/lib/copiloto/ask-copiloto";

/**
 * Wakes Copiloto. Auth + request-shape checks live here; the actual
 * retrieval/generation logic is askCopilotoStream() (src/lib/copiloto/ask-copiloto.ts),
 * factored out so scripts/golden-eval-runner.ts can grade the non-streaming
 * askCopiloto() variant directly without an HTTP session — that script isn't
 * testing this route's access control, it's testing whether Copiloto's
 * answers stay grounded in the real data.
 *
 * Streams plain text as Claude generates it, rather than buffering the full
 * ~2900+ token answer before responding — the landlord sees the first words
 * as soon as the model produces them instead of a blank drawer for the
 * entire generation.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { question } = body as { question?: string };
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const stream = await askCopilotoStream(question);
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
