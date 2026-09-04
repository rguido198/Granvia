import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { askValeria } from "@/lib/copiloto/ask-copiloto";

/**
 * Valeria's edit-capable turn — separate from /api/copiloto/ask (which stays
 * exactly as it was: streaming, read-only, no tools, still what
 * scripts/golden-eval-runner.ts grades against). This route is what the
 * chat panel calls now; it's a superset of the old capability (same
 * grounded data, plus a possible proposed edit), just non-streaming — see
 * askValeria's own doc comment for why streaming wasn't worth building for
 * a short structured response.
 */
export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "landlord") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { question, history, masterGla } = body as {
      question?: string;
      history?: { role: "user" | "assistant"; content: string }[];
      masterGla?: number;
    };
    if (typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const turn = await askValeria(
      Array.isArray(history) ? history : [],
      question,
      typeof masterGla === "number" ? masterGla : undefined,
    );
    return NextResponse.json(turn);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error in /api/copiloto/valeria:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
