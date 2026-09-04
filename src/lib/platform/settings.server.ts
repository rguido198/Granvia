import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type AutonomyState = {
  frozen: boolean;
  frozenBy: string | null;
  frozenAt: string | null;
};

// Single-property deployment (root CLAUDE.md §5) — the kill switch is
// plaza-wide, so there is exactly one properties row to read.
export async function fetchAutonomyState(): Promise<AutonomyState> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("properties")
    .select("autonomy_frozen, autonomy_frozen_by, autonomy_frozen_at")
    .single();

  if (error) throw new Error(error.message);

  return {
    frozen: data.autonomy_frozen,
    frozenBy: data.autonomy_frozen_by,
    frozenAt: data.autonomy_frozen_at,
  };
}

export type MaintenanceBudget = {
  quarterlyBudgetMxn: number | null;
};

export type ApprovalTiers = {
  /** AUTO's max_amount — at or below this, Diego dispatches automatically
   *  (diego-triage.ts: matchContractorAndTier + runDiegoTriageDirect). */
  autoCeilingMxn: number;
  /** GERENTE's max_amount — above autoCeilingMxn and at or below this,
   *  needs manager approval; above this, needs Dirección. DIRECCION's own
   *  max_amount is always null (no ceiling on the top tier). */
  gerenteCeilingMxn: number;
};

// Single-property deployment, same assumption as the other fetches in this
// file — reads the real thresholds the Cloudflare Worker (diego-triage.ts)
// actually gates dispatch on, not a number invented for display purposes.
export async function fetchApprovalTiers(): Promise<ApprovalTiers> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("approval_tiers").select("level, max_amount").order("min_amount");

  if (error) throw new Error(error.message);

  const auto = data?.find((t) => t.level === "AUTO");
  const gerente = data?.find((t) => t.level === "GERENTE");
  if (!auto || auto.max_amount === null || !gerente || gerente.max_amount === null) {
    throw new Error("approval_tiers no tiene las filas AUTO/GERENTE esperadas con max_amount definido");
  }

  return {
    autoCeilingMxn: Number(auto.max_amount),
    gerenteCeilingMxn: Number(gerente.max_amount),
  };
}

// Same single-property-deployment assumption as fetchAutonomyState above.
export async function fetchMaintenanceBudget(): Promise<MaintenanceBudget> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("properties").select("maintenance_quarterly_budget_mxn").single();

  if (error) throw new Error(error.message);

  return {
    quarterlyBudgetMxn: data.maintenance_quarterly_budget_mxn === null ? null : Number(data.maintenance_quarterly_budget_mxn),
  };
}
