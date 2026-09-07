import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type CostBucketTotal = {
  bucket: "ARRENDADOR" | "INQUILINO" | "CAM" | "PENDIENTE";
  amount: number;
  count: number;
};

export type ActivityDigest = {
  diego: {
    ticketsTotal: number;
    ticketsActive: number;
    /** sum(final_cost ?? estimated_cost) across every ticket that has
     *  either — final_cost is the real settled figure once work closes,
     *  often meaningfully different from the pre-dispatch estimate (found
     *  live: one ticket estimated at $1,800 settled at $11,500), so it
     *  takes precedence whenever it's on record. */
    costManagedTotal: number;
    /** Real, sourced by cost_bucket — excludes warranty-covered tickets,
     *  whose estimated_cost is stored as the post-override $0 (see
     *  warrantyCoveredCount's own comment), not what the repair would have
     *  cost, so summing them here would silently undercount ARRENDADOR's
     *  real total. */
    costByBucket: CostBucketTotal[];
    /** Count only — diego-triage.ts overwrites estimated_cost to 0 the
     *  moment warranty coverage is confirmed (checkWarranty), so the
     *  pre-override estimate is never persisted anywhere. A dollar
     *  "avoided cost" figure would have to be invented; the count of real
     *  cases isn't. */
    warrantyCoveredCount: number;
  };
  renewals: {
    draftedTotal: number;
    approvedTotal: number;
    rejectedTotal: number;
    pendingTotal: number;
    /** sum((new − current) × 12) for approved renewals only — realized
     *  value, not potential. */
    annualRentCapturedApproved: number;
    /** Same sum, but for drafts still awaiting a landlord decision — kept
     *  separate so a reader never mistakes "on the table" for "closed." */
    annualRentPendingDrafts: number;
    skepticFlaggedTotal: number;
  };
  screening: {
    evaluatedTotal: number;
    approvedTotal: number;
    rejectedTotal: number;
    /** risk_level = 'ALTO' — a real exclusivity conflict Mariana's audit
     *  caught before it reached a signed lease, regardless of how the
     *  landlord ultimately ruled on it. */
    altoRiskCaught: number;
  };
  documents: {
    /** kind = 'active_lease' and both Gate 1 and Gate 2 cleared. */
    digitizedTotal: number;
  };
};

export async function fetchActivityDigest(): Promise<ActivityDigest> {
  const supabase = getSupabaseServiceClient();

  const [ticketsRes, renewalsRes, applicationsRes, documentsRes] = await Promise.all([
    supabase.from("tickets").select("status, estimated_cost, final_cost, cost_bucket, warranty_covered"),
    supabase.from("lease_renewals").select("status, current_base_rent_monthly, new_base_rent_monthly, skeptic_flagged"),
    supabase.from("lease_applications").select("status, risk_level"),
    supabase.from("documents").select("status, extraction_verified_at").eq("kind", "active_lease"),
  ]);

  if (ticketsRes.error) throw new Error(ticketsRes.error.message);
  if (renewalsRes.error) throw new Error(renewalsRes.error.message);
  if (applicationsRes.error) throw new Error(applicationsRes.error.message);
  if (documentsRes.error) throw new Error(documentsRes.error.message);

  const tickets = ticketsRes.data ?? [];
  const renewals = renewalsRes.data ?? [];
  const applications = applicationsRes.data ?? [];
  const documents = documentsRes.data ?? [];

  const costByBucketMap = new Map<CostBucketTotal["bucket"], CostBucketTotal>();
  let costManagedTotal = 0;
  let warrantyCoveredCount = 0;
  for (const t of tickets) {
    if (t.warranty_covered) {
      warrantyCoveredCount++;
      continue;
    }
    const cost = t.final_cost !== null ? Number(t.final_cost) : t.estimated_cost !== null ? Number(t.estimated_cost) : null;
    if (cost === null) continue;
    costManagedTotal += cost;
    if (t.cost_bucket) {
      const existing = costByBucketMap.get(t.cost_bucket as CostBucketTotal["bucket"]) ?? {
        bucket: t.cost_bucket as CostBucketTotal["bucket"],
        amount: 0,
        count: 0,
      };
      existing.amount += cost;
      existing.count += 1;
      costByBucketMap.set(existing.bucket, existing);
    }
  }

  let annualRentCapturedApproved = 0;
  let annualRentPendingDrafts = 0;
  let approvedTotal = 0;
  let rejectedTotal = 0;
  let pendingTotal = 0;
  let skepticFlaggedTotal = 0;
  for (const r of renewals) {
    const current = r.current_base_rent_monthly !== null ? Number(r.current_base_rent_monthly) : null;
    const next = Number(r.new_base_rent_monthly);
    const annualDelta = current !== null ? (next - current) * 12 : 0;
    if (r.status === "approved") {
      approvedTotal++;
      annualRentCapturedApproved += annualDelta;
    } else if (r.status === "rejected") {
      rejectedTotal++;
    } else {
      pendingTotal++;
      annualRentPendingDrafts += annualDelta;
    }
    if (r.skeptic_flagged) skepticFlaggedTotal++;
  }

  const screeningApproved = applications.filter((a) => a.status === "approved").length;
  const screeningRejected = applications.filter((a) => a.status === "rejected").length;
  const altoRiskCaught = applications.filter((a) => a.risk_level === "ALTO").length;

  const digitizedTotal = documents.filter((d) => d.status === "attached" && d.extraction_verified_at).length;

  return {
    diego: {
      ticketsTotal: tickets.length,
      ticketsActive: tickets.filter((t) => t.status !== "closed" && t.status !== "closed_administrative").length,
      costManagedTotal,
      costByBucket: [...costByBucketMap.values()].sort((a, b) => b.amount - a.amount),
      warrantyCoveredCount,
    },
    renewals: {
      draftedTotal: renewals.length,
      approvedTotal,
      rejectedTotal,
      pendingTotal,
      annualRentCapturedApproved,
      annualRentPendingDrafts,
      skepticFlaggedTotal,
    },
    screening: {
      evaluatedTotal: applications.length,
      approvedTotal: screeningApproved,
      rejectedTotal: screeningRejected,
      altoRiskCaught,
    },
    documents: {
      digitizedTotal,
    },
  };
}
