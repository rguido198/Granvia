import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { generateToken, hashToken } from "@/lib/tickets/contractor-token";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "ticket not found" }, { status: 404 });
  }

  if (ticket.status !== "dispatched") {
    return NextResponse.json(
      { error: `ticket is '${ticket.status}' — solo se pueden generar enlaces para tickets despachados` },
      { status: 409 },
    );
  }

  // Delete existing unused tokens for this ticket (one active link at a time)
  await supabase
    .from("contractor_access_tokens")
    .delete()
    .eq("ticket_id", id)
    .is("used_at", null);

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase.from("contractor_access_tokens").insert({
    ticket_id: id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_by: profile.fullName ?? profile.email,
  });

  if (insertError) {
    return NextResponse.json({ error: "no se pudo generar el enlace de contratista" }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  const linkUrl = `${origin}/contratista/${token}`;

  return NextResponse.json({ ok: true, url: linkUrl });
}
