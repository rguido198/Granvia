import { fetchPortfolio } from "@/lib/data/portfolio.server";
import type { LeaseDetail, LeaseRenewalSummary } from "@/lib/data/contract-status";

/** One lease_renewals row, in the context of every other draft ever written
 *  for the same lease — `version`/`isLatest` are computed here (oldest
 *  created_at first = v1), not stored, since fetchPortfolio() already
 *  returns every renewal for a lease and nothing here needs them to survive
 *  interleaved drafts across different leases. */
export type RenewalVersion = LeaseRenewalSummary & {
  version: number;
  isLatest: boolean;
};

export type RenewalDetail = {
  lease: LeaseDetail;
  /** Oldest first (v1 → vN) — the diff view's version selector renders this
   *  order directly rather than re-sorting. */
  versions: RenewalVersion[];
};

/**
 * Backs /consola/renovaciones/[id] — the standalone renewal diff page
 * (root claude.md's frontend-priority #1: a renewal needs a stable, linkable
 * address, not just a modal or a chat bubble). Deliberately reuses
 * fetchPortfolio() rather than a second bespoke query: the lease-side fields
 * this page diffs against (clauses, responsibilityMatrix, escalation-in-
 * force, security deposit) are exactly what the SSOT table already computes,
 * and a second query path would risk drifting from it.
 */
export async function fetchRenewalDetail(renewalId: string): Promise<RenewalDetail | null> {
  const portfolio = await fetchPortfolio();
  const lease = portfolio.leases.find((l) => l.renewals.some((r) => r.id === renewalId));
  if (!lease) return null;

  const sorted = [...lease.renewals].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const versions: RenewalVersion[] = sorted.map((r, i) => ({
    ...r,
    version: i + 1,
    isLatest: i === sorted.length - 1,
  }));

  return { lease, versions };
}
