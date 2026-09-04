import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { Contractor } from "@/lib/contractors/shared";

// Type-only re-export — erased at compile time, so it doesn't drag this
// server-only module into a client bundle the way a value re-export would.
export type { Contractor } from "@/lib/contractors/shared";

export async function fetchContractors(): Promise<Contractor[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("contractors")
    .select("id, name, trade, coverage_hours, response_time_commitment, rate, rate_type, license_expiry, coi_expiry, active")
    .order("trade");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    trade: row.trade,
    coverageHours: row.coverage_hours,
    responseTimeCommitment: row.response_time_commitment,
    rate: row.rate,
    rateType: row.rate_type,
    licenseExpiry: row.license_expiry,
    coiExpiry: row.coi_expiry,
    active: row.active,
  }));
}
