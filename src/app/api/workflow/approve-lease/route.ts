import { resumeHook } from "workflow/api";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Wakes Mariana's suspended workflow run for a lease application sitting at
 * needs_landlord_review — the Tier 3 human gate created by createHook() in
 * src/workflows/mariana-screening.ts. Mirrors /api/workflow/approve
 * (Diego's ticket equivalent) — separate route rather than one branching on
 * a `kind` param, since the two tables/status enums don't overlap.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { applicationId, approved } = body as { applicationId?: string; approved?: boolean };
  if (typeof applicationId !== "string" || typeof approved !== "boolean") {
    return NextResponse.json(
      { error: "applicationId (string) and approved (boolean) are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();
  const { data: application, error: fetchError } = await supabase
    .from("lease_applications")
    .select("id, status")
    .eq("id", applicationId)
    .single();

  if (fetchError || !application) {
    return NextResponse.json({ error: "lease application not found" }, { status: 404 });
  }
  if (application.status !== "needs_landlord_review") {
    return NextResponse.json(
      { error: `application is '${application.status}', not 'needs_landlord_review' — already resolved` },
      { status: 409 },
    );
  }

  await supabase
    .from("lease_applications")
    .update({ reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  try {
    const result = await resumeHook(`lease-application-review:${applicationId}`, { approved });
    return NextResponse.json({ runId: result.runId });
  } catch (error) {
    return NextResponse.json(
      { error: `workflow hook not found or already resolved: ${error instanceof Error ? error.message : error}` },
      { status: 404 },
    );
  }
}
