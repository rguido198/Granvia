import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/server";
import { fetchEquipmentAssets } from "@/lib/data/equipment-assets.server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "landlord") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const assets = await fetchEquipmentAssets();
    return NextResponse.json({ assets });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error in GET /api/assets:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
