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
