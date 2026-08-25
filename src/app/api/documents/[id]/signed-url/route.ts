import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes — long enough to open and view, short-lived per spec

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (documentError || !document) {
    return NextResponse.json({ error: "document not found" }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("intake")
    .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed) {
    return NextResponse.json({ error: signError?.message ?? "failed to sign URL" }, { status: 502 });
  }

  return NextResponse.json({ url: signed.signedUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS });
}
