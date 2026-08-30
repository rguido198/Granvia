import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { applicantEntity, category, targetLocaleId, contactChannel, source, notes } = body as {
    applicantEntity?: string;
    category?: string;
    targetLocaleId?: string | null;
    contactChannel?: string | null;
    source?: string | null;
    notes?: string | null;
  };

  if (typeof applicantEntity !== "string" || !applicantEntity.trim()) {
    return NextResponse.json({ error: "El nombre o razón social del prospecto es requerido." }, { status: 400 });
  }
  if (typeof category !== "string" || !category.trim()) {
    return NextResponse.json({ error: "La categoría del giro comercial es requerida." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const actor = profile.fullName ?? profile.email;

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      applicant_entity: applicantEntity.trim(),
      category: category.trim(),
      target_locale_id: targetLocaleId?.trim() || null,
      contact_channel: contactChannel?.trim() || null,
      source: source?.trim() || null,
      notes: notes?.trim() || null,
      stage: "contacted",
      created_by: actor,
    })
    .select("id")
    .single();

  if (insertError || !lead) {
    return NextResponse.json({ error: insertError?.message ?? "No se pudo registrar el prospecto" }, { status: 500 });
  }

  await supabase.from("lead_stage_history").insert({
    lead_id: lead.id,
    from_stage: null,
    to_stage: "contacted",
    note: "Prospecto registrado en el pipeline",
    actor,
  });

  return NextResponse.json({ ok: true, id: lead.id });
}
