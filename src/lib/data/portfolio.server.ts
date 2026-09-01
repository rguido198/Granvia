import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import {
  findEscalationClause,
  isExpired,
  isRenewalSoon,
  type LeaseDetail,
  type LeaseRenewalSummary,
  type SpecialClause,
} from "./contract-status";

export { computeContractAggregates, contractStatusLabel } from "./contract-status";
export type { ContractAggregates, LeaseDetail, LeaseRenewalSummary } from "./contract-status";

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
  /** The tenant's trade/brand name when the digitized lease states one
   *  distinct from `name` (its legal name) — e.g. name "PETCO Animal
   *  Supplies de México, S.A. de C.V.", tradeName "PETCO". null for an
   *  undigitized lease or one that doesn't distinguish the two. Lets the
   *  Rent Roll and its search box use whichever name a landlord actually
   *  types, not just the legal one `name` already carries. */
  tradeName: string | null;
  /** documents.id of the digitized contract behind this lease, if any —
   *  same field LeaseDetail.sourceDocumentId already carries for the SSOT
   *  table, duplicated here so the Rent Roll's own collapsed row can show
   *  "there's a scan on file" without a landlord having to expand or
   *  cross-reference the other table to find out. */
  sourceDocumentId: string | null;
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

/** An approved-but-not-yet-onboarded Mariana screening — the picker
 *  addTenantAction's form offers so a landlord can thread a manual onboard
 *  back to the screening that approved it, via lease_applications
 *  .promoted_lease_id. Only ever `approved` and still unlinked; once linked
 *  it drops out of this list (the unique index on promoted_lease_id makes
 *  "already promoted" and "still open" mutually exclusive). */
export type ApprovedApplication = {
  id: string;
  applicationNumber: string;
  applicantEntity: string;
  targetUnitCode: string;
};

export type Portfolio = {
  rentRoll: PortfolioRow[];
  leases: LeaseDetail[];
  formerTenants: FormerTenant[];
  approvedApplications: ApprovedApplication[];
  leasedSqm: number;
  plazaTotalGla: number;
  contractedRent: number;
};

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
    .select("id, unit_number, area_sqm, status, tenant_entity, trade_name")
    .order("unit_number");
  if (localesError) throw new Error(localesError.message);

  const { data: leaseRows, error: leasesError } = await supabase
    .from("leases")
    .select(
      "id, locale_id, tenant_entity, trade_name, permitted_use, exclusive_use_clause, parking_clause, directory_advertising_clause, expansion_option_clause, extended_hours_clause, signage_clause, pets_clause, sublease_restriction_clause, remodeling_clause, responsibility_matrix, notice_period_days, base_rent_monthly, start_date, end_date, source_document_id",
    );
  if (leasesError) throw new Error(leasesError.message);

  const allLeases = leaseRows ?? [];

  // Both directions of the lease_applications <-> leases thread: which
  // application (if any) promoted into which lease, and — for the Add
  // Tenant picker — every approved application still waiting to be
  // promoted at all.
  const { data: applicationRows, error: applicationsError } = await supabase
    .from("lease_applications")
    .select("id, application_number, applicant_entity, target_locale_id, status, promoted_lease_id");
  if (applicationsError) throw new Error(applicationsError.message);

  const applicationNumberByLeaseId = new Map(
    (applicationRows ?? [])
      .filter((a) => a.promoted_lease_id)
      .map((a) => [a.promoted_lease_id as string, a.application_number as string]),
  );

  // Renewal drafts (lease-renewal.ts), grouped by the lease they're for.
  const { data: renewalRows, error: renewalsError } = await supabase
    .from("lease_renewals")
    .select(
      "id, renewal_number, source_lease_id, status, current_end_date, new_start_date, new_end_date, current_base_rent_monthly, new_base_rent_monthly, escalation_pct, escalation_method, draft_markdown, skeptic_flagged, skeptic_concerns, created_at",
    )
    .order("created_at", { ascending: false });
  if (renewalsError) throw new Error(renewalsError.message);

  const renewalsByLeaseId = new Map<string, LeaseRenewalSummary[]>();
  for (const r of renewalRows ?? []) {
    const list = renewalsByLeaseId.get(r.source_lease_id as string) ?? [];
    list.push({
      id: r.id as string,
      renewalNumber: r.renewal_number as string,
      status: r.status as LeaseRenewalSummary["status"],
      currentEndDate: r.current_end_date as string,
      newStartDate: r.new_start_date as string,
      newEndDate: r.new_end_date as string,
      currentBaseRentMonthly: r.current_base_rent_monthly === null ? null : Number(r.current_base_rent_monthly),
      newBaseRentMonthly: Number(r.new_base_rent_monthly),
      escalationPct: r.escalation_pct === null ? null : Number(r.escalation_pct),
      escalationMethod: r.escalation_method as string,
      draftMarkdown: r.draft_markdown as string,
      skepticFlagged: r.skeptic_flagged as boolean,
      skepticConcerns: (r.skeptic_concerns as string[] | null) ?? [],
      createdAt: r.created_at as string,
    });
    renewalsByLeaseId.set(r.source_lease_id as string, list);
  }

  // Escalation clause lookup — reads each lease's own source document's
  // special_clauses (extraction never persists them onto `leases` itself,
  // only `documents.extracted_fields`), so the renewal form can suggest a
  // starting percentage from the original contract's own words.
  const sourceDocumentIds = [...new Set(allLeases.map((l) => l.source_document_id).filter(Boolean))] as string[];
  const { data: sourceDocs } = sourceDocumentIds.length
    ? await supabase.from("documents").select("id, extracted_fields").in("id", sourceDocumentIds)
    : { data: [] };
  const specialClausesByDocumentId = new Map(
    (sourceDocs ?? []).map((d) => [
      d.id as string,
      ((d.extracted_fields as { special_clauses?: SpecialClause[] } | null)?.special_clauses ?? null) as
        | SpecialClause[]
        | null,
    ]),
  );

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
      tradeName: vacant ? null : l.trade_name,
      sourceDocumentId: !vacant && lease ? lease.source_document_id : null,
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

  // Auto-generate initial renewal proposal draft for any active lease that has
  // crossed into the renewal window (<=6 months remaining or expired) and doesn't
  // have a renewal draft on file yet.
  let maxRenSeq = (renewalRows ?? []).reduce((max, r) => {
    const m = (r.renewal_number as string).match(/REN-(\d+)/);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 9);

  for (const l of activeLeaseByLocale.values()) {
    const isSoon = isRenewalSoon(l.end_date) || isExpired(l.end_date);
    const existing = renewalsByLeaseId.get(l.id) ?? [];
    if (isSoon && existing.length === 0) {
      maxRenSeq++;
      const renewalNumber = `REN-${String(maxRenSeq).padStart(3, "0")}`;
      const locale = localesById.get(l.locale_id);
      const currentRent = l.base_rent_monthly ? Number(l.base_rent_monthly) : 0;
      const escalation = l.source_document_id
        ? findEscalationClause(specialClausesByDocumentId.get(l.source_document_id) ?? null)
        : null;
      const escPct = escalation?.pct ?? 0;
      const newRent = Number((currentRent * (1 + escPct / 100)).toFixed(2));

      const currentEnd = new Date(l.end_date);
      const newStart = new Date(currentEnd);
      newStart.setDate(newStart.getDate() + 1);
      const newStartDateStr = newStart.toISOString().slice(0, 10);
      const newEnd = new Date(currentEnd);
      newEnd.setFullYear(newEnd.getFullYear() + 3);
      const newEndDateStr = newEnd.toISOString().slice(0, 10);

      const unitStr = locale?.unit_number ? `Local ${locale.unit_number.replace(/^Local\s*/i, "")}` : "Local ?";
      const areaStr = locale?.area_sqm ? `${locale.area_sqm} m²` : "";

      const draftMarkdown = `[DRAFT — PENDING LANDLORD COUNSEL SIGN-OFF ON UNRESOLVED JURISDICTION KEYS: JD-01]
### CONVENIO MODIFICATORIO DE ARRENDAMIENTO COMERCIAL (PROYECTO) — MARIANA
**Fecha:** ${new Date().toISOString().slice(0, 10)}
**Plaza:** La Gran Vía
**Arrendatario:** ${l.tenant_entity}
**Local:** ${unitStr} (${areaStr})

#### CLÁUSULAS DE PRÓRROGA
1. **PRÓRROGA DE VIGENCIA:** Las partes convienen en prorrogar la vigencia del contrato de arrendamiento respecto del ${unitStr}, cuya vigencia actual concluye el ${l.end_date}, por un nuevo período que iniciará el ${newStartDateStr} y concluirá el ${newEndDateStr}.

2. **RENTA REAJUSTADA:** La renta mensual aplicable durante el período de prórroga será de $${newRent.toLocaleString("es-MX", {minimumFractionDigits: 2})} MXN mensuales, cantidad proporcionada por el ARRENDADOR. El método de escalación aplicable es del ${escPct}% (fixed_pct). Respecto de la renta actual de $${currentRent.toLocaleString("es-MX", {minimumFractionDigits: 2})} MXN mensuales, dicha cantidad representa un incremento del ${escPct}%.

3. **MANTENIMIENTO Y CUOTA CAM:** Subsiste sin modificación la matriz de responsabilidad de mantenimiento vigente y los días de aviso previstos en el contrato original.

4. **SUBSISTENCIA DE TÉRMINOS:** Todos los demás términos, condiciones, derechos y obligaciones del contrato de arrendamiento original permanecen en plena fuerza y vigor, sin modificación alguna, salvo exclusivamente lo relativo a vigencia y renta materia del presente convenio.

---
Referencia de jurisdicción: México · mx.md v1.0 (2026-08-04). Claves citables: JD-01, JD-04, JD-07. El presente documento constituye un proyecto sujeto a revisión y aprobación del arrendador y de su asesoría legal.`;

      const newRenewalObj: LeaseRenewalSummary = {
        id: crypto.randomUUID(),
        renewalNumber,
        status: "needs_landlord_review",
        currentEndDate: l.end_date,
        newStartDate: newStartDateStr,
        newEndDate: newEndDateStr,
        currentBaseRentMonthly: currentRent,
        newBaseRentMonthly: newRent,
        escalationPct: escPct,
        escalationMethod: "fixed_pct",
        draftMarkdown,
        skepticFlagged: false,
        skepticConcerns: [],
        createdAt: new Date().toISOString(),
      };

      // Persist asynchronously to DB so portfolio queries remain fast
      supabase
        .from("lease_renewals")
        .insert({
          id: newRenewalObj.id,
          renewal_number: renewalNumber,
          source_lease_id: l.id,
          locale_id: l.locale_id,
          tenant_entity: l.tenant_entity,
          current_end_date: l.end_date,
          new_start_date: newStartDateStr,
          new_end_date: newEndDateStr,
          current_base_rent_monthly: currentRent,
          new_base_rent_monthly: newRent,
          escalation_pct: escPct,
          escalation_method: "fixed_pct",
          draft_markdown: draftMarkdown,
          skeptic_flagged: false,
          skeptic_concerns: [],
          jurisdiction_pack_ref: "México · mx.md v1.0 (2026-08-04)",
          unresolved_jd_keys: ["JD-01"],
          status: "needs_landlord_review",
          workflow_run_id: `auto_renew_${renewalNumber.toLowerCase()}`,
        })
        .then(({ error }) => {
          if (error) console.error("Failed to auto-insert lease_renewal:", error);
        });

      renewalsByLeaseId.set(l.id, [newRenewalObj]);
    }
  }

  const leases: LeaseDetail[] = [...activeLeaseByLocale.values()]
    .map((l) => {
      const locale = localesById.get(l.locale_id);
      const escalation = l.source_document_id
        ? findEscalationClause(specialClausesByDocumentId.get(l.source_document_id) ?? null)
        : null;
      return {
        id: l.locale_id,
        unitCode: locale?.unit_number ?? "?",
        tenantEntity: l.tenant_entity,
        tradeName: l.trade_name,
        sqm: Number(locale?.area_sqm ?? 0),
        rentMonthly: Number(l.base_rent_monthly ?? 0),
        permittedUse: l.permitted_use,
        exclusiveUseClause: l.exclusive_use_clause,
        parkingClause: l.parking_clause,
        directoryAdvertisingClause: l.directory_advertising_clause,
        expansionOptionClause: l.expansion_option_clause,
        extendedHoursClause: l.extended_hours_clause,
        signageClause: l.signage_clause,
        petsClause: l.pets_clause,
        subleaseRestrictionClause: l.sublease_restriction_clause,
        remodelingClause: l.remodeling_clause,
        responsibilityMatrix: l.responsibility_matrix,
        noticePeriodDays: l.notice_period_days,
        startDate: l.start_date,
        endDate: l.end_date,
        renewalSoon: isRenewalSoon(l.end_date),
        isExpired: isExpired(l.end_date),
        sourceDocumentId: l.source_document_id,
        sourceApplicationNumber: applicationNumberByLeaseId.get(l.id) ?? null,
        leaseRowId: l.id,
        renewals: renewalsByLeaseId.get(l.id) ?? [],
        suggestedEscalationPct: escalation?.pct ?? null,
        suggestedEscalationClauseText: escalation?.clauseText ?? null,
      };
    })
    .sort((a, b) => a.unitCode.localeCompare(b.unitCode));

  const approvedApplications: ApprovedApplication[] = (applicationRows ?? [])
    .filter((a) => a.status === "approved" && !a.promoted_lease_id)
    .map((a) => ({
      id: a.id as string,
      applicationNumber: a.application_number as string,
      applicantEntity: a.applicant_entity as string,
      targetUnitCode: localesById.get(a.target_locale_id as string)?.unit_number ?? "?",
    }))
    .sort((a, b) => a.applicationNumber.localeCompare(b.applicationNumber));

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

  return { rentRoll, leases, formerTenants, approvedApplications, leasedSqm, plazaTotalGla, contractedRent };
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
  /** The tenant name the LLM extraction already read off the contract
   *  (`extracted_fields.tenant_entity`) — the same string suggestMatch
   *  scored the fuzzy match against, so this is a comparison, not a bare
   *  assertion. */
  documentTenantName: string | null;
  /** The trade/brand name the LLM extraction read off the contract
   *  (`extracted_fields.trade_name`) when it names one distinct from
   *  documentTenantName — e.g. "Cabanna" for a legal name of "Restaurantes
   *  del Noroeste, S.A. de C.V." null when the contract doesn't distinguish
   *  one, or hasn't been through extraction yet. */
  documentTradeName: string | null;
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
  createdAt: string;
};

/** `extracted_fields` is a bare jsonb column with no shape guarantee, and an
 *  in-flight or failed document leaves it at its `{}` column default — so
 *  this reads only the one field the Legal tab's Gate 1 card needs, rather
 *  than validating the whole LeaseExtractedFields shape just to show a name. */
function tenantNameFromExtractedFields(extractedFields: unknown): string | null {
  if (!extractedFields || typeof extractedFields !== "object") return null;
  const value = (extractedFields as Record<string, unknown>).tenant_entity;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Same pattern as tenantNameFromExtractedFields, for trade_name — Gate 1's
 *  form needs both to show "documento indica razón social X, operando como
 *  Y" instead of just the legal name a landlord may not recognize at all. */
function tradeNameFromExtractedFields(extractedFields: unknown): string | null {
  if (!extractedFields || typeof extractedFields !== "object") return null;
  const value = (extractedFields as Record<string, unknown>).trade_name;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

// A document that has cleared both gates (or died trying) has no further
// claim on a landlord's attention — its real, durable record is the `leases`
// row it produced (source_document_id), browsable from the rent roll's SSOT
// view, not this pipeline queue. Capped so the Legal tab's history accordion
// stays a "what happened recently" convenience instead of an ever-growing
// fetch of every document this plaza has ever digitized — uncapped, this
// query's cost (extracted_fields included, a real per-row JSON blob) grows
// forever with plaza age, on every single page load, regardless of whether
// anyone ever opens the accordion.
const RESOLVED_DOCUMENT_HISTORY_LIMIT = 20;

const LEASE_DOCUMENT_COLUMNS =
  "id, original_filename, status, suggested_locale_id, match_confidence, locale_id, extracted_fields, extraction_verified_at, error_message, created_at";

/**
 * Every `kind = 'active_lease'` document that still needs a landlord's
 * attention, plus the most recently resolved ones, for the Legal tab's
 * pipeline panel. Kept as its own fetch rather than folded into
 * fetchPortfolio() — the portfolio is the rent roll / lease ledger, and this
 * is intake state that a document can hold without ever producing a lease row.
 */
export async function fetchActiveLeaseDocuments(): Promise<LeaseDocumentRow[]> {
  const supabase = getSupabaseServiceClient();

  // Mirrors isActionable() in legal-documents-panel.tsx: the queue itself
  // (ready_for_triage / needs_new_lease / attached-but-unverified) is never
  // capped — that's real pending work, and however small it should always
  // render in full. Only what's already resolved (attached-and-verified,
  // rejected, failed) gets bounded, and by *resolution* recency
  // (updated_at), not upload recency — "what happened lately" is what a
  // history view is for.
  const [{ data: activeRows, error: activeError }, { data: resolvedRows, error: resolvedError }] =
    await Promise.all([
      supabase
        .from("documents")
        .select(LEASE_DOCUMENT_COLUMNS)
        .eq("kind", "active_lease")
        .or("status.eq.ready_for_triage,status.eq.needs_new_lease,and(status.eq.attached,extraction_verified_at.is.null)")
        .order("created_at", { ascending: false }),
      supabase
        .from("documents")
        .select(LEASE_DOCUMENT_COLUMNS)
        .eq("kind", "active_lease")
        .or("status.eq.rejected,status.eq.failed,and(status.eq.attached,extraction_verified_at.not.is.null)")
        .order("updated_at", { ascending: false })
        .limit(RESOLVED_DOCUMENT_HISTORY_LIMIT),
    ]);
  if (activeError) throw new Error(activeError.message);
  if (resolvedError) throw new Error(resolvedError.message);
  const rows = [...(activeRows ?? []), ...(resolvedRows ?? [])];

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
      documentTenantName: tenantNameFromExtractedFields(r.extracted_fields),
      documentTradeName: tradeNameFromExtractedFields(r.extracted_fields),
      matchConfidence: r.match_confidence === null ? null : Number(r.match_confidence),
      localeUnit: confirmed?.unit ?? null,
      localeTenant: confirmed?.tenant ?? null,
      extractedFields: r.extracted_fields as Record<string, unknown> | null,
      extractionVerifiedAt: r.extraction_verified_at,
      errorMessage: r.error_message,
      createdAt: r.created_at,
    };
  });
}
