import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { fetchLeaseApplicationDetail } from "@/lib/data/lease-application-detail.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const application = await fetchLeaseApplicationDetail(id);
  if (!application) {
    return NextResponse.json({ error: "lease application not found" }, { status: 404 });
  }

  return NextResponse.json({ application }, { headers: { "Cache-Control": "no-store" } });
}
