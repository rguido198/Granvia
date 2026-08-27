import { z } from "zod";

const ResponsibilitySchema = z.enum(["landlord", "tenant", "shared"]);

export const LeaseExtractedFieldsSchema = z
  .object({
    // Needed to create a brand-new `leases` row when Gate 1's confirmed
    // locale has none (a vacant unit being newly occupied) — see
    // lease-digitization.ts's promoteExtraction. Extracted unconditionally
    // rather than only on request: cheap for the same Opus call to also
    // read these near-universal, prominent contract fields, and an
    // existing-lease update just ignores them.
    tenant_entity: z.string(),
    start_date: z.string(), // ISO "YYYY-MM-DD"
    end_date: z.string(), // ISO "YYYY-MM-DD"
    base_rent_monthly: z.number().positive().nullable(),
    // Written onto `locales.area_sqm` by promoteExtraction — the contract's
    // stated GLA is the authoritative source, and until this field existed
    // there was no path for a digitized lease to ever correct a locale's
    // seeded square footage (rent roll and Mariana's fit scoring both read
    // that column directly). Nullable: not every contract states a GLA in a
    // form clean enough to extract.
    area_sqm: z.number().positive().nullable(),
    // These map straight onto `leases.exclusive_use_clause` / `.permitted_use`
    // — the fields lease-screener/Mariana actually screens new applicants
    // against (SKILL.md §2B). Previously absent from this schema entirely:
    // the exclusivity grant and the tenant's permitted use ended up folded
    // into special_clauses as free text, which is fine for a human reading
    // the review form but never reached the structured columns anything
    // downstream (or the SSOT contracts table) reads from — every digitized
    // lease silently carried zero exclusivity protection on record.
    exclusive_use_clause: z.string().nullable(),
    permitted_use: z.string().nullable(),
    responsibility_matrix: z
      .object({
        hvac: ResponsibilitySchema,
        roof: ResponsibilitySchema,
        plumbing: ResponsibilitySchema,
        electrical: ResponsibilitySchema,
        storefront_glass: ResponsibilitySchema,
      })
      .strict(),
    notice_period_days: z.number().int().positive(),
    special_clauses: z.array(
      z.object({ label: z.string(), text: z.string() }).strict(),
    ),
  })
  .strict();

export type LeaseExtractedFields = z.infer<typeof LeaseExtractedFieldsSchema>;

/** Answers the `needs_new_lease` follow-up form (promoteExtraction found no
 *  active lease for the matched locale) — shared between the confirm route,
 *  which validates a payload against it, and the workflow, which types its
 *  hook decision from it, the same way LeaseExtractedFieldsSchema is shared
 *  for correctedFields. */
export const NewLeaseDetailsSchema = z
  .object({
    tenant_entity: z.string().min(1),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    base_rent_monthly: z.number().positive().nullable(),
  })
  .strict();

export type NewLeaseDetails = z.infer<typeof NewLeaseDetailsSchema>;
