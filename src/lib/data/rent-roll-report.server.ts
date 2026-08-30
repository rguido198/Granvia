import "server-only";
import type { LeaseDetail } from "@/lib/data/contract-status";
import { isSameTenant } from "@/lib/ingest/fuzzy-match-tenant";
import { TENANTS, PILLAR_LABELS, type Pillar } from "@/content/tenants";

export type ExpirationTierKey = "expired" | "d30" | "d60" | "d90" | "d180" | "plus180";

export type TierLeaseItem = {
  unitCode: string;
  tenantEntity: string;
  tradeName: string | null;
  endDate: string;
  daysRemaining: number;
  rentMonthly: number;
};

export type ExpirationTierGroup = {
  key: ExpirationTierKey;
  label: string;
  count: number;
  leases: TierLeaseItem[];
};

export type CategoryMixItem = {
  pillar: Pillar | "sin_categorizar";
  label: string;
  count: number;
  sqmTotal: number;
  sqmPercentOfLeased: number;
};

/**
 * Calculates calendar days remaining until endDate relative to current time.
 */
export function computeDaysRemaining(endDateStr: string, referenceDate: Date = new Date()): number {
  const end = new Date(endDateStr);
  if (Number.isNaN(end.getTime())) return 0;
  // Reset time components for clean calendar day difference
  const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const refMidnight = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const diffMs = endMidnight.getTime() - refMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Groups active and expired portfolio leases into expiration timeframe tiers.
 */
export function computeExpirationTiers(leases: LeaseDetail[], referenceDate: Date = new Date()): ExpirationTierGroup[] {
  const groups: Record<ExpirationTierKey, ExpirationTierGroup> = {
    expired: { key: "expired", label: "Vencidos", count: 0, leases: [] },
    d30: { key: "d30", label: "Próximos 30 días", count: 0, leases: [] },
    d60: { key: "d60", label: "31 a 60 días", count: 0, leases: [] },
    d90: { key: "d90", label: "61 a 90 días", count: 0, leases: [] },
    d180: { key: "d180", label: "91 a 180 días", count: 0, leases: [] },
    plus180: { key: "plus180", label: "Más de 180 días", count: 0, leases: [] },
  };

  for (const lease of leases) {
    const days = computeDaysRemaining(lease.endDate, referenceDate);
    const item: TierLeaseItem = {
      unitCode: lease.unitCode,
      tenantEntity: lease.tenantEntity,
      tradeName: lease.tradeName,
      endDate: lease.endDate,
      daysRemaining: days,
      rentMonthly: lease.rentMonthly,
    };

    let targetKey: ExpirationTierKey;
    if (days < 0) targetKey = "expired";
    else if (days <= 30) targetKey = "d30";
    else if (days <= 60) targetKey = "d60";
    else if (days <= 90) targetKey = "d90";
    else if (days <= 180) targetKey = "d180";
    else targetKey = "plus180";

    groups[targetKey].leases.push(item);
    groups[targetKey].count += 1;
  }

  // Sort leases within each tier by days remaining ascending
  for (const key of Object.keys(groups) as ExpirationTierKey[]) {
    groups[key].leases.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  return [groups.expired, groups.d30, groups.d60, groups.d90, groups.d180, groups.plus180];
}

/** Best TENANTS.pillar match for one lease's tenant/trade name, null when
 *  none clears isSameTenant's confidence threshold — the single-lease
 *  lookup computeCategoryMix uses internally, and what a per-row label
 *  (Rent Roll sheet) should call directly rather than re-running the
 *  whole aggregate on a one-item array to read its .label back out. */
export function matchTenantPillar(lease: Pick<LeaseDetail, "tenantEntity" | "tradeName">): Pillar | null {
  for (const t of TENANTS) {
    if (isSameTenant(lease.tenantEntity, t.name, lease.tradeName)) {
      return t.pillar;
    }
  }
  return null;
}

export function categoryLabel(pillar: Pillar | null): string {
  return pillar === null ? "Sin Categorizar" : `${PILLAR_LABELS[pillar].kicker} (${PILLAR_LABELS[pillar].title})`;
}

/**
 * Maps portfolio leases against TENANTS content roster to compute pillar mix.
 */
export function computeCategoryMix(leases: LeaseDetail[]): CategoryMixItem[] {
  const totalLeasedSqm = leases.reduce((sum, l) => sum + (l.sqm || 0), 0);

  const stats: Record<Pillar | "sin_categorizar", { count: number; sqmTotal: number }> = {
    prueba: { count: 0, sqmTotal: 0 },
    consiente: { count: 0, sqmTotal: 0 },
    visita: { count: 0, sqmTotal: 0 },
    servicios: { count: 0, sqmTotal: 0 },
    sin_categorizar: { count: 0, sqmTotal: 0 },
  };

  for (const lease of leases) {
    const key = matchTenantPillar(lease) ?? "sin_categorizar";
    stats[key].count += 1;
    stats[key].sqmTotal += lease.sqm || 0;
  }

  const pillarsOrder: (Pillar | "sin_categorizar")[] = ["prueba", "consiente", "visita", "servicios", "sin_categorizar"];

  return pillarsOrder.map((key) => {
    const label = categoryLabel(key === "sin_categorizar" ? null : key);
    const sqmTotal = stats[key].sqmTotal;
    const sqmPercentOfLeased = totalLeasedSqm > 0 ? (sqmTotal / totalLeasedSqm) * 100 : 0;

    return {
      pillar: key,
      label,
      count: stats[key].count,
      sqmTotal,
      sqmPercentOfLeased,
    };
  });
}
