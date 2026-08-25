import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type LocaleStatus = "OCCUPIED" | "VACANT" | "PENDING_LEASE";

export type PortfolioRow = {
  slug: string;
  /** leases.id of this locale's currently active lease — null when vacant
   *  (or when a lease somehow has no row at all). Needed to target
   *  vacateTenantAction at the exact row, since a locale can accumulate
   *  more than one historical lease row over time (see LeaseDetail below). */
  leaseId: string | null;
  unitCode: string;
  name: string;
  sqm: number;
  rent: number;
  sharePct: number;
  vacant: boolean;
  renewalSoon: boolean;
  /** Real locales.status enum value — kept alongside the derived `vacant`
   *  boolean so the Rent Roll's Estado filter can facet on all three real
   *  states (a PENDING_LEASE locale is neither occupied nor "Vacante" the
   *  way the console currently labels a unit) instead of just the binary
   *  the rest of this row's fields were built around. */
  status: LocaleStatus;
};

export type LeaseDetail = {
  id: string;
  unitCode: string;
  tenantEntity: string;
  sqm: number;
  rentMonthly: number;
  permittedUse: string | null;
  exclusiveUseClause: string | null;
  responsibilityMatrix: Record<string, string> | null;
  noticePeriodDays: number | null;
  startDate: string;
  endDate: string;
  renewalSoon: boolean;
};

/** A locale that once had a tenant and no longer does — vacateTenantAction
 *  never deletes the locale or lease row, it just flips locales.status to
 *  VACANT and stamps the lease's end_date. This is that history, read back
 *  out for the "Inquilinos Anteriores" table so a vacated tenant doesn't
 *  just vanish from the console. */
export type FormerTenant = {
  localeId: string;
  unitCode: string;
  tenantEntity: string;
  sqm: number;
  lastRentMonthly: number;
  leaseEndDate: string;
};

export type Portfolio = {
  rentRoll: PortfolioRow[];
  leases: LeaseDetail[];
  formerTenants: FormerTenant[];
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
 *
 * A locale can accumulate more than one `leases` row over its life —
 * vacateTenantAction ends a lease without deleting it, and re-adding a
 * tenant to a vacant unit (addTenantAction) inserts a fresh lease row rather
 * than reusing the old one, so the terminated lease survives as history.
 *
 * Which lease counts as "active" is read off `locales.status`, not off a
 * same-day date comparison. vacateTenantAction stamps end_date = today AND
 * flips status to VACANT in the same action — a date-only check like
 * `end_date >= today` would still count that lease as active for the rest of
 * today, so a landlord vacating a unit this morning would see it as both
 * "Vacante" (per status) and still listed as an active contract in Legal
 * Expedientes (per date) until midnight. Keying off status instead makes the
 * two views agree the instant the write lands. Within one locale, the
 * "current" lease is whichever row has the latest end_date; every other row
 * for that locale is history, surfaced as `formerTenants` only when the
 * locale itself is VACANT (an OCCUPIED locale's older, superseded lease rows
 * — e.g. after a renewal — aren't "former tenants", just past terms of the
 * same tenancy, so they're dropped rather than shown).
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
    .select(
      "id, locale_id, tenant_entity, permitted_use, exclusive_use_clause, responsibility_matrix, notice_period_days, base_rent_monthly, start_date, end_date",
    );
  if (leasesError) throw new Error(leasesError.message);

  const allLeases = leaseRows ?? [];

  // Latest (by end_date) lease row per locale — the "current" one regardless
  // of whether that locale is currently OCCUPIED or VACANT.
  const latestLeaseByLocale = new Map<string, (typeof allLeases)[number]>();
  for (const l of allLeases) {
    const current = latestLeaseByLocale.get(l.locale_id);
    if (!current || l.end_date > current.end_date) latestLeaseByLocale.set(l.locale_id, l);
  }

  const localesById = new Map((locales ?? []).map((l) => [l.id, l]));
  const activeLeaseByLocale = new Map(
    [...latestLeaseByLocale.entries()].filter(([localeId]) => localesById.get(localeId)?.status === "OCCUPIED"),
  );

  const plazaTotalGla = (locales ?? []).reduce((sum, l) => sum + Number(l.area_sqm), 0);

  const rentRoll: PortfolioRow[] = (locales ?? []).map((l) => {
    const lease = activeLeaseByLocale.get(l.id);
    const vacant = l.status === "VACANT";
    return {
      slug: l.id,
      leaseId: !vacant && lease ? lease.id : null,
      unitCode: l.unit_number,
      name: vacant ? "Vacante" : (l.tenant_entity ?? "—"),
      sqm: Number(l.area_sqm),
      rent: !vacant && lease ? Number(lease.base_rent_monthly ?? 0) : 0,
      sharePct: (Number(l.area_sqm) / plazaTotalGla) * 100,
      vacant,
      renewalSoon: !vacant && lease ? isRenewalSoon(lease.end_date) : false,
      status: l.status as LocaleStatus,
    };
  });

  const leasedSqm = rentRoll.filter((r) => !r.vacant).reduce((sum, r) => sum + r.sqm, 0);
  const contractedRent = rentRoll.reduce((sum, r) => sum + r.rent, 0);

  const leases: LeaseDetail[] = [...activeLeaseByLocale.values()]
    .map((l) => {
      const locale = localesById.get(l.locale_id);
      return {
        id: l.locale_id,
        unitCode: locale?.unit_number ?? "?",
        tenantEntity: l.tenant_entity,
        sqm: Number(locale?.area_sqm ?? 0),
        rentMonthly: Number(l.base_rent_monthly ?? 0),
        permittedUse: l.permitted_use,
        exclusiveUseClause: l.exclusive_use_clause,
        responsibilityMatrix: l.responsibility_matrix,
        noticePeriodDays: l.notice_period_days,
        startDate: l.start_date,
        endDate: l.end_date,
        renewalSoon: isRenewalSoon(l.end_date),
      };
    })
    .sort((a, b) => a.unitCode.localeCompare(b.unitCode));

  const formerTenants: FormerTenant[] = (locales ?? [])
    .filter((l) => l.status === "VACANT" && l.tenant_entity)
    .map((l) => {
      // Not gated on OCCUPIED like activeLeaseByLocale above — a vacant
      // locale's latest lease IS its history, by definition.
      const lastLease = latestLeaseByLocale.get(l.id);
      return {
        localeId: l.id,
        unitCode: l.unit_number,
        tenantEntity: l.tenant_entity as string,
        sqm: Number(l.area_sqm),
        lastRentMonthly: lastLease ? Number(lastLease.base_rent_monthly ?? 0) : 0,
        leaseEndDate: lastLease?.end_date ?? "—",
      };
    })
    .sort((a, b) => b.leaseEndDate.localeCompare(a.leaseEndDate));

  return { rentRoll, leases, formerTenants, leasedSqm, plazaTotalGla, contractedRent };
}
