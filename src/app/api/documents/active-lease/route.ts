import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { fetchActiveLeaseDocuments } from "@/lib/data/portfolio.server";

/**
 * Plain JSON polling endpoint for the Legal tab's digitization queue —
 * landlord-dashboard.tsx's client-side poll (useActiveLeaseDocumentsPoll)
 * fetches this directly instead of going through router.refresh(). Found
 * live: router.refresh() plus the 3s in-flight poll that used to call it
 * were confirmed correct against real data (a document genuinely
 * `extracting`, another `ready_for_triage`, both matched what the queue
 * should render) but the deployed page never picked either state up
 * without a manual reload — the RSC refresh mechanism itself wasn't
 * reliably updating this route in production, for a reason not fully
 * root-caused (removing a leftover `runtime = "edge"` was a reasonable,
 * confirmed-safe attempt and didn't fully resolve it). Rather than keep
 * chasing that, this route lets the queue poll for its own fresh data
 * directly, sidestepping RSC/router.refresh() entirely — same underlying
 * fetchActiveLeaseDocuments() query portfolio.server.ts's Server Component
 * path already uses, so there's one source of truth for what "active lease
 * documents" means, just two ways to deliver it to the client.
 */
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const documents = await fetchActiveLeaseDocuments();
  return NextResponse.json({ documents });
}
