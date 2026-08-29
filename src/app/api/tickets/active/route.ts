import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { fetchDiegoTickets } from "@/lib/data/diego-tickets.server";

// Same fix, same reason as src/app/api/portfolio/route.ts and
// src/app/api/documents/active-lease/route.ts: diegoTickets is a plain
// consola/page.tsx prop with no live-refresh path today, and the approval
// inbox's "Actualizar" button needs one to pick up a status change made
// elsewhere without a full page reload.
export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { tickets, kpis } = await fetchDiegoTickets();
  return NextResponse.json({ tickets, kpis }, { headers: { "Cache-Control": "no-store" } });
}
