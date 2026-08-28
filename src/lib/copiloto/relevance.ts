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
  lease: { tenantEntity: string; unitCode: string },
): boolean {
  const q = normalize(question);
  const tenantNorm = normalize(lease.tenantEntity);
  const unitNorm = normalize(lease.unitCode);
  return (tenantNorm.length > 0 && q.includes(tenantNorm)) || (unitNorm.length > 0 && q.includes(unitNorm));
}
