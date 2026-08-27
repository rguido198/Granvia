import { resumeHook } from "workflow/api";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Wakes leaseRenewalWorkflow's Tier 3 gate for a renewal draft sitting at
 * needs_landlord_review — mirrors /api/workflow/approve-lease exactly
 * (Mariana's lease-application equivalent), separate route since the two
 * tables/status enums don't overlap.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { renewalId, approved } = body as { renewalId?: string; approved?: boolean };
  if (typeof renewalId !== "string" || typeof approved !== "boolean") {
    return NextResponse.json({ error: "renewalId (string) and approved (boolean) are required" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data: renewal, error: fetchError } = await supabase
    .from("lease_renewals")
    .select("id, status")
    .eq("id", renewalId)
    .single();

  if (fetchError || !renewal) {
    return NextResponse.json({ error: "renewal draft not found" }, { status: 404 });
  }
  if (renewal.status !== "needs_landlord_review") {
    return NextResponse.json(
      { error: `renewal is '${renewal.status}', not 'needs_landlord_review' — already resolved` },
      { status: 409 },
    );
  }

  try {
    const result = await resumeHook(`lease-renewal-review:${renewalId}`, { approved, reviewedById: profile.id });
    return NextResponse.json({ runId: result.runId });
  } catch (error) {
    return NextResponse.json(
      { error: `workflow hook not found or already resolved: ${error instanceof Error ? error.message : error}` },
      { status: 404 },
    );
  }
}
