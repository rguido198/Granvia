import { z } from "zod";

const ResponsibilitySchema = z.enum(["landlord", "tenant", "shared"]);

export const LeaseExtractedFieldsSchema = z
  .object({
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
