import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { LEAD_STAGES, type LeadStage } from "@/lib/data/lead-types";

type ManualStage = Exclude<LeadStage, "converted" | "lost">;
const MANUAL_STAGES = LEAD_STAGES.filter(
  (s): s is ManualStage => s !== "converted" && s !== "lost",
);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { targetStage, note } = body as { targetStage?: string; note?: string | null };

  if (typeof targetStage !== "string" || !(MANUAL_STAGES as readonly string[]).includes(targetStage)) {
    return NextResponse.json(
      { error: `Etapa no válida. Debe ser una de: ${MANUAL_STAGES.join(", ")}` },
      { status: 400 },
    );
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

  const { error: updateError } = await supabase
    .from("leads")
    .update({ stage: targetStage })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "No se pudo actualizar la etapa" }, { status: 500 });
  }

  await supabase.from("lead_stage_history").insert({
    lead_id: id,
    from_stage: fromStage,
    to_stage: targetStage,
    note: note?.trim() || null,
    actor,
  });

  return NextResponse.json({ ok: true });
}
