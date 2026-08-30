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
    // The registered legal entity's declarative section names it as the
    // signing ARRENDATARIO, but a lease frequently also states it's
    // "operando bajo el nombre comercial de X" — a brand/trade name that
    // can share zero characters with the legal name (e.g. "Cabanna" vs.
    // "Restaurantes del Noroeste, S.A. de C.V.") and is usually what a
    // landlord's own roster and vocabulary actually use. null when the
    // contract doesn't distinguish one from the razon social.
    //
    // .optional() in addition to .nullable(): every document extracted
    // before this field existed has extracted_fields JSON with no
    // trade_name key at all, not trade_name: null — a .strict() schema
    // otherwise rejects the whole object on a missing required key, same
    // failure mode the special_clauses sub-schema parse in
    // ask-copiloto.ts already works around for a different added field
    // (area_sqm). Found live: PETCO's and Cabanna's documents were both
    // still sitting at Gate 1 when this field was added, extracted under
    // the pre-trade_name prompt — without .optional() here, confirming
    // either into Gate 2 would have strict-parse-failed on their own
    // already-good extraction and dead-ended into the reject-only fallback.
    trade_name: z.string().nullable().optional(),
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
    // Promoted out of the special_clauses free-text bucket into their own
    // named fields — these eight recur often enough across the portfolio
    // (per the 82-lease synthetic eval set: estacionamiento reservado 15,
    // publicidad en directorio 14, ampliación futura 13, horario extendido
    // 10, señalización exterior 9, mascotas 9, subarrendamiento restringido
    // 7, remodelación 5) that a landlord asking "how many tenants have X"
    // needs a column to COUNT WHERE against, not free text a model would
    // have to re-read every contract to find. Same nullable-text shape as
    // exclusive_use_clause: null when the contract doesn't grant/mention it.
    // .optional() alongside .nullable(), same reason as trade_name above —
    // a document already sitting at Gate 1/2 under the pre-this-change
    // schema has extracted_fields JSON with none of these keys at all, and
    // .strict() rejects a whole object over one missing required key.
    parking_clause: z.string().nullable().optional(),
    directory_advertising_clause: z.string().nullable().optional(),
    expansion_option_clause: z.string().nullable().optional(),
    extended_hours_clause: z.string().nullable().optional(),
    signage_clause: z.string().nullable().optional(),
    pets_clause: z.string().nullable().optional(),
    sublease_restriction_clause: z.string().nullable().optional(),
    remodeling_clause: z.string().nullable().optional(),
    // Catch-all for anything that doesn't fit one of the eight named clause
    // fields above — a truly novel clause type, not one of the recurring
    // ones already promoted to its own column.
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
