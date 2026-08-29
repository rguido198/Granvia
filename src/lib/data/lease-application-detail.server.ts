import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/** The full evidence record behind one Mariana screening — fetched
 *  on-demand only when a landlord expands a row in Pendientes, not folded
 *  into the lightweight queue-list fetch (fetchPendingLeaseApplications,
 *  approval-queue.server.ts), which stays cheap for the common case of
 *  nobody opening a given row. */
export type LeaseApplicationDetail = {
  id: string;
  applicationNumber: string;
  status: "needs_landlord_review" | "approved" | "rejected";
  applicantEntity: string;
  category: string;
  subcategory: string;
  products: string[];
  requestedSqm: number | null;
  desiredTermYears: number | null;
  targetUnitNumber: string | null;
  riskLevel: "ALTO" | "MEDIO" | "BAJO";
  matchedUnitNumber: string | null;
  matchedTenantEntity: string | null;
  matchedClauseText: string | null;
  matchedProductPairs: { applicant_product: string; protected_term: string }[];
  categoryFitScore: number | null;
  yieldScore: number | null;
  termStabilityScore: number | null;
  matchScore: number | null;
  skepticFlagged: boolean;
  skepticConcerns: string[];
  draftMarkdown: string | null;
  unresolvedJdKeys: string[];
  showWatermark: boolean;
};

export async function fetchLeaseApplicationDetail(id: string): Promise<LeaseApplicationDetail | null> {
  const supabase = getSupabaseServiceClient();

  // Two FKs from lease_applications to locales (target_locale_id,
  // matched_locale_id) — both joins need an explicit constraint-name alias
  // or Postgrest throws the same ambiguous-embed error already hit once
  // this session for the queue-list fetch.
  const { data, error } = await supabase
    .from("lease_applications")
    .select(
      `
      id, application_number, status, applicant_entity, category, subcategory, products,
      requested_sqm, desired_term_years, risk_level, matched_clause_text, matched_product_pairs,
      category_fit_score, yield_score, term_stability_score, match_score,
      skeptic_flagged, skeptic_concerns, draft_markdown, unresolved_jd_keys,
      target_locale:locales!lease_applications_target_locale_id_fkey ( unit_number ),
      matched_locale:locales!lease_applications_matched_locale_id_fkey ( unit_number, tenant_entity )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const targetLocale = Array.isArray(data.target_locale) ? data.target_locale[0] : data.target_locale;
  const matchedLocale = Array.isArray(data.matched_locale) ? data.matched_locale[0] : data.matched_locale;
  const unresolvedJdKeys = (data.unresolved_jd_keys as string[] | null) ?? [];

  return {
    id: data.id,
    applicationNumber: data.application_number,
    status: data.status,
    applicantEntity: data.applicant_entity,
    category: data.category,
    subcategory: data.subcategory,
    products: (data.products as string[] | null) ?? [],
    requestedSqm: data.requested_sqm === null ? null : Number(data.requested_sqm),
    desiredTermYears: data.desired_term_years === null ? null : Number(data.desired_term_years),
    targetUnitNumber: targetLocale?.unit_number ?? null,
    riskLevel: data.risk_level,
    matchedUnitNumber: matchedLocale?.unit_number ?? null,
    matchedTenantEntity: matchedLocale?.tenant_entity ?? null,
    matchedClauseText: data.matched_clause_text,
    matchedProductPairs:
      (data.matched_product_pairs as { applicant_product: string; protected_term: string }[] | null) ?? [],
    categoryFitScore: data.category_fit_score === null ? null : Number(data.category_fit_score),
    yieldScore: data.yield_score === null ? null : Number(data.yield_score),
    termStabilityScore: data.term_stability_score === null ? null : Number(data.term_stability_score),
    matchScore: data.match_score === null ? null : Number(data.match_score),
    skepticFlagged: data.skeptic_flagged,
    skepticConcerns: (data.skeptic_concerns as string[] | null) ?? [],
    draftMarkdown: data.draft_markdown,
    unresolvedJdKeys,
    showWatermark: unresolvedJdKeys.length > 0,
  };
}
