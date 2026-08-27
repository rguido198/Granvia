import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { askCopiloto } from "@/lib/copiloto/ask-copiloto";

/**
 * Wakes Copiloto. Auth + request-shape checks live here; the actual
 * retrieval/generation logic is askCopiloto() (src/lib/copiloto/ask-copiloto.ts),
 * factored out so scripts/golden-eval-runner.ts can call it directly without
 * an HTTP session — that script isn't testing this route's access control,
 * it's testing whether Copiloto's answers stay grounded in the real data.
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

  const result = await askCopiloto(question);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ answer: result.answer });
}
