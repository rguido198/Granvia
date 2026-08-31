import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { fetchTenantPortalData } from "@/lib/data/tenant-portal.server";

// Tenant-side counterpart to /api/tickets/active: the tenant portal's
// `tickets` prop has the same RSC-refresh-lands-too-early problem (Diego's
// workflow writes the ticket row after /api/ingest's 202 response), so it
// needs a plain JSON endpoint to poll too.
export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "tenant") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { tickets } = await fetchTenantPortalData(profile.localeId ?? undefined);
  return NextResponse.json({ tickets }, { headers: { "Cache-Control": "no-store" } });
}
