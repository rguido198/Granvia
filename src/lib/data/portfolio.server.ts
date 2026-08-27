import "server-only";
import { extractTenantNameFromDocumentText } from "@/lib/ingest/fuzzy-match-tenant";
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
  /** documents.id of the digitized contract this lease's terms came from —
   *  null for a lease never touched by the lease-digitization pipeline (a
   *  hand-entered row, or one predating source_document_id). Lets the SSOT
   *  table offer "Ver documento" from a lease's own expanded row instead of
   *  only from the Legal tab's digitization queue. */
  sourceDocumentId: string | null;
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
      "id, locale_id, tenant_entity, permitted_use, exclusive_use_clause, responsibility_matrix, notice_period_days, base_rent_monthly, start_date, end_date, source_document_id",
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
        sourceDocumentId: l.source_document_id,
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

/** One row of the Legal tab's document pipeline — a scanned active lease
 *  moving through leaseDigitizationWorkflow's two human gates. Distinct from
 *  `LeaseDetail` above, which is the *result* (the leases table row); this is
 *  the document that produced it, plus the gate state the UI acts on. */
export type LeaseDocumentRow = {
  id: string;
  originalFilename: string;
  status: string;
  /** The suggested locale rendered as its unit number, not its uuid — the
   *  Gate 1 form shows a human "A-01", and the uuid only ever travels back
   *  as `correctedLocaleId`, which comes from the unit picker instead. */
  suggestedLocaleUnit: string | null;
  /** The suggested locale's tenant of record. A unit code and a percentage
   *  are not enough to verify a match against a roster holding both
   *  "Derma Club" and "Derma Club 2" — the landlord has to see the name. */
  suggestedLocaleTenant: string | null;
  /** The tenant name the *document* states for itself, derived from the same
   *  helper the fuzzy matcher scored on. Shown next to the suggestion so
   *  Gate 1 is a comparison of two names, not a bare assertion. */
  documentTenantName: string | null;
  matchConfidence: number | null;
  /** Unit number / tenant of the locale Gate 1 already confirmed. Gate 2
   *  writes onto this locale's lease, so its form has to name it. */
  localeUnit: string | null;
  localeTenant: string | null;
  extractedFields: Record<string, unknown> | null;
  extractionVerifiedAt: string | null;
  /** Set by promoteExtraction when the confirmed locale has no `leases` row to
   *  promote onto — the document is fine, there is just nothing to write to. */
  errorMessage: string | null;
};

/**
 * Every `kind = 'active_lease'` document, newest first, for the Legal tab's
 * pipeline panel. Kept as its own fetch rather than folded into
 * fetchPortfolio() — the portfolio is the rent roll / lease ledger, and this
 * is intake state that a document can hold without ever producing a lease row.
 */
export async function fetchActiveLeaseDocuments(): Promise<LeaseDocumentRow[]> {
  const supabase = getSupabaseServiceClient();

  const { data: rows, error } = await supabase
    .from("documents")
    .select(
      "id, original_filename, status, suggested_locale_id, match_confidence, locale_id, extracted_fields, extraction_verified_at, error_message",
    )
    .eq("kind", "active_lease")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  // `raw_text` is a full 20-50 page contract per row. Only Gate 1's review
  // form needs anything out of it (the document's own tenant name), and only
  // `ready_for_triage` rows render that form — so fetch it for those rows
  // alone rather than dragging every digitized contract's full text through
  // the Legal tab on every render. In steady state that's the small pending
  // queue, not all 85.
  const triageIds = (rows ?? []).filter((r) => r.status === "ready_for_triage").map((r) => r.id);
  const tenantNameByDocumentId = new Map<string, string | null>();
  if (triageIds.length > 0) {
    const { data: texts } = await supabase
      .from("documents")
      .select("id, raw_text")
      .in("id", triageIds);
    for (const t of texts ?? []) {
      tenantNameByDocumentId.set(t.id, extractTenantNameFromDocumentText(t.raw_text));
    }
  }

  // Both the Gate 1 suggestion and the Gate 2 confirmed target need resolving,
  // so collect them together and do one lookup rather than two.
  const localeIds = [
    ...new Set(
      (rows ?? [])
        .flatMap((r) => [r.suggested_locale_id, r.locale_id])
        .filter((id): id is string => !!id),
    ),
  ];

  // `.in()` with an empty array is a needless round trip — skip it entirely
  // when no document carries a suggestion yet.
  const localeById = new Map<string, { unit: string; tenant: string | null }>();
  if (localeIds.length > 0) {
    const { data: locales } = await supabase
      .from("locales")
      .select("id, unit_number, tenant_entity")
      .in("id", localeIds);
    for (const l of locales ?? []) {
      localeById.set(l.id, { unit: l.unit_number, tenant: l.tenant_entity });
    }
  }

  return (rows ?? []).map((r) => {
    const suggested = r.suggested_locale_id ? localeById.get(r.suggested_locale_id) : undefined;
    const confirmed = r.locale_id ? localeById.get(r.locale_id) : undefined;
    return {
      id: r.id,
      originalFilename: r.original_filename,
      status: r.status,
      suggestedLocaleUnit: suggested?.unit ?? null,
      suggestedLocaleTenant: suggested?.tenant ?? null,
      // Derived server-side, deliberately: `raw_text` is a full 20-50 page
      // contract and has no business crossing to the client — only the one
      // line the match was scored on does. Null for any row past Gate 1,
      // which no longer needs it.
      documentTenantName: tenantNameByDocumentId.get(r.id) ?? null,
      matchConfidence: r.match_confidence === null ? null : Number(r.match_confidence),
      localeUnit: confirmed?.unit ?? null,
      localeTenant: confirmed?.tenant ?? null,
      extractedFields: r.extracted_fields as Record<string, unknown> | null,
      extractionVerifiedAt: r.extraction_verified_at,
      errorMessage: r.error_message,
    };
  });
}
