import "server-only";
import { z } from "zod";

import { callStructuredWithFallback } from "@/lib/llm/provider";

/**
 * Exclusivity-overlap audit for a lease's own permitted_use against the
 * rest of the portfolio's active exclusivity clauses — the reverse
 * direction of mariana-screening.ts's §2B check. Mariana's own audit only
 * ever runs on the incoming side: a NEW application's proposed products
 * against every existing lease's exclusive_use_clause, before the tenant
 * ever signs. It has never run against the other direction — an
 * ALREADY-SIGNED lease's own permitted_use against everyone else's
 * exclusivity — because until the lease-digitization pipeline existed,
 * there was no backlog of already-signed leases being read into the
 * system for the first time. Confirming Best Optical (no exclusivity of
 * its own) at Gate 2 has no way to know whether its own giro
 * ("óptica, optometría y venta de armazones oftálmicos y solares")
 * happens to collide with some other tenant's existing exclusive-use
 * clause — nothing has ever checked that.
 *
 * Same matching rules as mariana-screening.ts's MARIANA_SYSTEM_PROMPT
 * (head-noun matching, quality-adjective stripping, stop-listed generic
 * nouns, whole-token matching) — deliberately not the scoring half
 * (category_fit/yield/term_stability), which only makes sense for
 * evaluating a prospective applicant, not an already-signed tenant.
 *
 * Tier 1 (root CLAUDE.md §1): read-only, informational. Never blocks a
 * Gate 2 confirm — a landlord reviews the flag, the lease still promotes.
 */

const ConflictSchema = z.object({
  conflicts: z.array(
    z.object({
      unit_code: z.string(),
      tenant_entity: z.string(),
      severity: z.enum(["ALTO", "MEDIO"]),
      matched_clause_text: z.string(),
      this_lease_term: z.string(),
      protected_term: z.string(),
    }),
  ),
});

export type ExclusivityConflict = z.infer<typeof ConflictSchema>["conflicts"][number];

const SYSTEM_PROMPT = `Audits whether a commercial lease's own permitted-use (giro) collides with any OTHER active tenant's exclusive-use clause in the same plaza.

EXCLUSIVE-USE OVERLAP AUDIT — compare the lease's own permitted_use against every OTHER active lease's exclusive_use_clause:
- Direct overlap: the lease's product/giro keywords vs. protected terms in someone else's exclusivity clause.
- Synonym & sub-category mapping: catch indirect breaches (e.g. "panini" vs an exclusive on "pan/sandwiches").
- Match the head noun, never the modifier. Quality adjectives (artesanal, premium, gourmet, natural, fresco, casero, orgánico) carry no product meaning — strip them, then compare nouns. "donas artesanales" vs "cerveza artesanal" is NOT a conflict.
- Stop-list generic head nouns (comida, servicios, productos, venta, artículos, alimentos) — these are category scaffolding, not product classes. Do not match on them alone.
- Match whole tokens, never substrings — "ensaladas" containing "sala" must never flag against a furniture exclusive on "muebles de sala".
- State the matched pair explicitly for every conflict reported — a flag with no cited word-pair is not reviewable.

SEVERITY (exactly one per conflict):
ALTO — direct breach of an active exclusive-use clause.
MEDIO — partial/ambiguous overlap, or the existing clause is vaguely worded. Do not resolve the ambiguity yourself.

Report only real conflicts — an empty conflicts array is the correct, common answer when nothing overlaps. Do not invent a conflict to have something to report.`;

/**
 * @param lease The lease being confirmed at Gate 2 — its own unit/tenant
 *   (excluded from the comparison set) and permitted_use.
 * @param otherActiveLeases Every other active lease with an exclusivity
 *   clause on file. Leases with no exclusive_use_clause contribute nothing
 *   to check against and should already be filtered out by the caller.
 */
export async function checkExclusivityConflicts(
  lease: { unitCode: string; tenantEntity: string; permittedUse: string | null },
  otherActiveLeases: { unitCode: string; tenantEntity: string; exclusiveUseClause: string }[],
): Promise<ExclusivityConflict[]> {
  if (!lease.permittedUse || otherActiveLeases.length === 0) return [];

  const userContent = [
    `Contrato bajo revisión: ${lease.tenantEntity}, Local ${lease.unitCode}.`,
    `Giro permitido de este contrato: ${lease.permittedUse}`,
    "",
    "Cláusulas de exclusividad de otros contratos activos en la misma plaza:",
    otherActiveLeases
      .map((l) => `- ${l.unitCode} (${l.tenantEntity}): "${l.exclusiveUseClause}"`)
      .join("\n"),
  ].join("\n");

  const result = await callStructuredWithFallback(SYSTEM_PROMPT, userContent, ConflictSchema, 2000);
  return result.conflicts;
}
