import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * The one genuinely new query the approval inbox needs. Every other source
 * it aggregates (tickets, lease_renewals, documents) is already fetched by
 * consola/page.tsx for its own tab — fetchPortfolio() reads
 * lease_applications too, but only `promoted_lease_id` for already-approved
 * rows (the Add Tenant picker), never the pending ones. legal/prospectos is
 * a live screening tool, not a pending-queue panel, so nothing in the app
 * reaches these rows today — confirmed by tracing every caller of
 * /api/workflow/approve-lease and finding none in src/.
 */
export type PendingLeaseApplication = {
  id: string;
  applicationNumber: string;
  applicantEntity: string;
  unitNumber: string | null;
  riskLevel: "ALTO" | "MEDIO" | "BAJO" | null;
  skepticFlagged: boolean;
  createdAt: string;
};

export async function fetchPendingLeaseApplications(): Promise<PendingLeaseApplication[]> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("lease_applications")
    .select(
      `
      id, application_number, applicant_entity, risk_level, skeptic_flagged, created_at,
      locales!lease_applications_target_locale_id_fkey ( unit_number )
    `,
    )
    .eq("status", "needs_landlord_review")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    application_number: string;
    applicant_entity: string;
    risk_level: "ALTO" | "MEDIO" | "BAJO" | null;
    skeptic_flagged: boolean;
    created_at: string;
    locales: { unit_number: string } | { unit_number: string }[] | null;
  };

  return ((data ?? []) as Row[]).map((r) => {
    const locale = Array.isArray(r.locales) ? r.locales[0] : r.locales;
    return {
      id: r.id,
      applicationNumber: r.application_number,
      applicantEntity: r.applicant_entity,
      unitNumber: locale?.unit_number ?? null,
      riskLevel: r.risk_level,
      skepticFlagged: r.skeptic_flagged,
      createdAt: r.created_at,
    };
  });
}
