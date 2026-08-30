import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Starts leaseRenewalWorkflow for an existing lease — the "Redactar
 * Renovación" action on an expiring/expired contract in the Legal
 * Expedientes table. Landlord-only: unlike the lease-application intake
 * (open, tenant-facing), a renewal always starts from the landlord's own
 * console, on a lease that's already on file.
 *
 * The new rent is landlord-supplied, never computed here or by the model —
 * same discipline as addTenantAction/NewLeaseForm. Exactly one of
 * escalationPct or newBaseRentMonthly is required; when a percentage is
 * given, the new rent is derived from the lease's current
 * base_rent_monthly, which must exist to do that math.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { leaseId, newEndDate, escalationPct, newBaseRentMonthly } = body as {
    leaseId?: string;
    newEndDate?: string;
    escalationPct?: number;
    newBaseRentMonthly?: number;
  };

  if (typeof leaseId !== "string" || !leaseId) {
    return NextResponse.json(
      { error: "leaseId es requerido" },
      { status: 400 },
    );
  }
  if (
    typeof newEndDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(newEndDate)
  ) {
    return NextResponse.json(
      { error: "newEndDate debe ser una fecha ISO (YYYY-MM-DD)" },
      { status: 400 },
    );
  }
  const hasPct =
    typeof escalationPct === "number" && Number.isFinite(escalationPct);
  const hasFlatRent =
    typeof newBaseRentMonthly === "number" &&
    Number.isFinite(newBaseRentMonthly) &&
    newBaseRentMonthly > 0;
  if (hasPct === hasFlatRent) {
    return NextResponse.json(
      {
        error: "Especifica exactamente uno: escalationPct o newBaseRentMonthly",
      },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();
  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select("id, base_rent_monthly, end_date")
    .eq("id", leaseId)
    .single();
  if (leaseError || !lease) {
    return NextResponse.json(
      { error: "contrato no encontrado" },
      { status: 404 },
    );
  }
  if (new Date(newEndDate) <= new Date(lease.end_date)) {
    return NextResponse.json(
      {
        error:
          "La nueva fecha de vencimiento debe ser posterior a la vigencia actual del contrato",
      },
      { status: 400 },
    );
  }

  let resolvedRent: number;
  let escalationMethod: string;
  let resolvedPct: number | null;
  if (hasFlatRent) {
    resolvedRent = newBaseRentMonthly!;
    escalationMethod = "landlord_specified";
    resolvedPct = null;
  } else {
    if (!lease.base_rent_monthly) {
      return NextResponse.json(
        {
          error:
            "Este contrato no tiene renta base en registro — especifica newBaseRentMonthly en vez de un porcentaje.",
        },
        { status: 400 },
      );
    }
    resolvedRent = Number(
      (lease.base_rent_monthly * (1 + escalationPct! / 100)).toFixed(2),
    );
    escalationMethod = "fixed_pct";
    resolvedPct = escalationPct!;
  }

  const { env } = getCloudflareContext();
  const instance = await env.LEASE_RENEWAL_WORKFLOW.create({
    params: {
      leaseId,
      newEndDate,
      newBaseRentMonthly: resolvedRent,
      escalationMethod,
      escalationPct: resolvedPct,
    },
  });

  return NextResponse.json({ ok: true, runId: instance.id, resolvedRent });
}
