import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { fetchPortfolio } from "@/lib/data/portfolio.server";

// See src/app/api/documents/active-lease/route.ts's doc comment for the
// full story: router.refresh() re-running consola/page.tsx's Server
// Component was confirmed unreliable on this deployment for
// activeLeaseDocuments, and portfolio is fetched by that exact same
// Server Component the exact same way, so it's exposed to the same risk.
// landlord-dashboard.tsx's refreshPortfolio() hits this directly instead
// of depending on router.refresh() to deliver a fresh portfolio prop.
export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const portfolio = await fetchPortfolio();
  return NextResponse.json({ portfolio }, { headers: { "Cache-Control": "no-store" } });
}
