import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { fetchPendingLeaseApplications } from "@/lib/data/approval-queue.server";

// Same fix, same reason as src/app/api/portfolio/route.ts and
// src/app/api/tickets/active/route.ts — feeds the approval inbox's
// "Actualizar" button for the one source (lease_applications) with no
// existing live-refresh path anywhere in the app.
export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const applications = await fetchPendingLeaseApplications();
  return NextResponse.json({ applications }, { headers: { "Cache-Control": "no-store" } });
}
