import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Full transition history for one ticket — every row ticket_status_history
 * already gets on approve/dispatch/mark-resolved/confirm/reopen/close (see
 * those routes and the RPCs in supabase/migrations/20260829000008_ticket_transition_rpcs.sql).
 * Landlord-only: a tenant's own view of a ticket doesn't need the full
 * transition log, just its current state.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("ticket_status_history")
    .select("from_status, to_status, changed_at, note")
    .eq("ticket_id", id)
    .order("changed_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "no se pudo cargar el historial" }, { status: 500 });
  }

  return NextResponse.json({ history: data ?? [] });
}
