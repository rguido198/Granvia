import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { RENEWAL_OUTREACH_STAGES, type RenewalOutreachStage } from "@/lib/data/renewal-workspace.server";

/**
 * Logs one renewal-outreach event for a lease — a plain insert, not an RPC:
 * unlike the ticket-transition state machine, outreach stages aren't
 * gated (a landlord can jump straight to "proposal_sent"), so a single-row
 * insert is already atomic and there's no prior-state check to enforce.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { stage?: string; note?: string } | null;
  const stage = body?.stage as string | undefined;
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null;

  if (!stage || !RENEWAL_OUTREACH_STAGES.includes(stage as RenewalOutreachStage)) {
    return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const actor = profile.fullName ?? profile.email;
  const { data, error } = await supabase
    .from("renewal_outreach_events")
    .insert({ lease_id: id, stage, note, actor })
    .select("lease_id, stage, note, actor, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "no se pudo registrar el contacto" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    status: {
      stage: data.stage,
      note: data.note,
      actor: data.actor,
      createdAt: data.created_at,
    },
  });
}
