import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type PortfolioRow = {
  slug: string;
  unitCode: string;
  name: string;
  sqm: number;
  rent: number;
  sharePct: number;
  vacant: boolean;
  renewalSoon: boolean;
};

export type LeaseDetail = {
  id: string;
  unitCode: string;
  tenantEntity: string;
  sqm: number;
  rentMonthly: number;
  permittedUse: string | null;
  exclusiveUseClause: string | null;
  startDate: string;
  endDate: string;
  renewalSoon: boolean;
};

export type Portfolio = {
  rentRoll: PortfolioRow[];
  leases: LeaseDetail[];
  leasedSqm: number;
  plazaTotalGla: number;
  contractedRent: number;
};

function monthsUntil(dateStr: string): number {
  const end = new Date(dateStr);
  const now = new Date();
  return (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
}

function isRenewalSoon(endDate: string): boolean {
  const months = monthsUntil(endDate);
  return months >= 0 && months <= 6;
}

/**
 * Real locales + leases (src/lib/platform/... sibling — same pattern as
 * fetchAuditLog/fetchAutonomyState). Replaces the TENANTS-derived mock rent
 * roll and the hardcoded 10-contract array previously inlined in
 * landlord-dashboard.tsx's Legal Expedientes table.
 *
 * `leases` has no deposit/garantía column, no document-storage integration,
 * and only one clause field (exclusive_use_clause) — the mock's "Garantía",
 * "Contrato PDF"/"Póliza RC" buttons, SHA-256 hash and vector-chunk count per
 * contract had nothing real behind them and aren't recreated here.
 */
export async function fetchPortfolio(): Promise<Portfolio> {
  const supabase = getSupabaseServiceClient();

  const { data: locales, error: localesError } = await supabase
    .from("locales")
    .select("id, unit_number, area_sqm, status, tenant_entity")
    .order("unit_number");
  if (localesError) throw new Error(localesError.message);

  const { data: leaseRows, error: leasesError } = await supabase
    .from("leases")
    .select("locale_id, tenant_entity, permitted_use, exclusive_use_clause, base_rent_monthly, start_date, end_date");
  if (leasesError) throw new Error(leasesError.message);

  const leaseByLocale = new Map((leaseRows ?? []).map((l) => [l.locale_id, l]));
  const plazaTotalGla = (locales ?? []).reduce((sum, l) => sum + Number(l.area_sqm), 0);

  const rentRoll: PortfolioRow[] = (locales ?? []).map((l) => {
    const lease = leaseByLocale.get(l.id);
    const vacant = l.status === "VACANT";
    return {
      slug: l.id,
      unitCode: l.unit_number,
      name: vacant ? "Vacante" : (l.tenant_entity ?? "—"),
      sqm: Number(l.area_sqm),
      rent: lease ? Number(lease.base_rent_monthly ?? 0) : 0,
      sharePct: (Number(l.area_sqm) / plazaTotalGla) * 100,
      vacant,
      renewalSoon: lease ? isRenewalSoon(lease.end_date) : false,
    };
  });

  const leasedSqm = rentRoll.filter((r) => !r.vacant).reduce((sum, r) => sum + r.sqm, 0);
  const contractedRent = rentRoll.reduce((sum, r) => sum + r.rent, 0);

  const localeById = new Map((locales ?? []).map((l) => [l.id, l]));
  const leases: LeaseDetail[] = (leaseRows ?? [])
    .map((l) => {
      const locale = localeById.get(l.locale_id);
      return {
        id: l.locale_id,
        unitCode: locale?.unit_number ?? "?",
        tenantEntity: l.tenant_entity,
        sqm: Number(locale?.area_sqm ?? 0),
        rentMonthly: Number(l.base_rent_monthly ?? 0),
        permittedUse: l.permitted_use,
        exclusiveUseClause: l.exclusive_use_clause,
        startDate: l.start_date,
        endDate: l.end_date,
        renewalSoon: isRenewalSoon(l.end_date),
      };
    })
    .sort((a, b) => a.unitCode.localeCompare(b.unitCode));

  return { rentRoll, leases, leasedSqm, plazaTotalGla, contractedRent };
}
