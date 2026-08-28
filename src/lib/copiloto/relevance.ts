import { normalize } from "@/lib/ingest/fuzzy-match-tenant";

/**
 * Does this question name the tenant or unit a digitized lease belongs to?
 * Substring containment on normalized (accent/punctuation/case-insensitive,
 * corporate-suffix-stripped) tenant name and unit code — not fuzzy
 * edit-distance like fuzzy-match-tenant.ts's matchTenant, which compares two
 * short names against each other, not a name against an arbitrary sentence.
 *
 * Deterministic on purpose, same principle as everywhere else in this
 * codebase that avoids trusting the model on something checkable in code
 * (see diego-triage.ts's warranty check) — a landlord's question almost
 * always names the tenant or unit directly ("MINT Boutique", "Local 66"),
 * so a cheap containment check covers the real cases without an extra LLM
 * call or its added latency.
 */
export function isLeaseRelevantToQuestion(
  question: string,
  // tradeName: the operating brand/DBA name when it's distinct from
  // tenantEntity (the registered legal name) — e.g. tenantEntity
  // "Restaurantes del Noroeste, S.A. de C.V.", tradeName "Cabanna". A
  // landlord asking about "Cabanna" would never match on tenantEntity
  // alone; the two names can share zero characters.
  lease: { tenantEntity: string; unitCode: string; tradeName?: string | null },
): boolean {
  const q = normalize(question);
  const names = [lease.tenantEntity, lease.tradeName]
    .filter((n): n is string => !!n && n.trim().length > 0)
    .map(normalize);
  const unitNorm = normalize(lease.unitCode);
  return names.some((n) => n.length > 0 && q.includes(n)) || (unitNorm.length > 0 && q.includes(unitNorm));
}
