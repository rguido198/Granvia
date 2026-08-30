import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { lostReason } = body as { lostReason?: string };

  if (typeof lostReason !== "string" || !lostReason.trim()) {
    return NextResponse.json({ error: "Indica el motivo por el cual se descartó la oportunidad." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id, stage")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !lead) {
    return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 });
  }

  const fromStage = lead.stage;
  const actor = profile.fullName ?? profile.email;
  const reasonText = lostReason.trim();

  const { error: updateError } = await supabase
    .from("leads")
    .update({ stage: "lost", lost_reason: reasonText })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "No se pudo marcar el prospecto como perdido" }, { status: 500 });
  }

  await supabase.from("lead_stage_history").insert({
    lead_id: id,
    from_stage: fromStage,
    to_stage: "lost",
    note: `Descartado: ${reasonText}`,
    actor,
  });

  return NextResponse.json({ ok: true });
}
