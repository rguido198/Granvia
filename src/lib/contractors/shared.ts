/**
 * Contractor types/constants shared between server-only data fetching
 * (src/lib/data/contractors.server.ts) and the client-side roster UI
 * (contractor-roster.tsx) — kept out of contractors.server.ts because that
 * file's `import "server-only"` would block it from ever reaching a client
 * bundle.
 */

/**
 * Exact vocabulary matchContractorAndTier() in diego-triage.ts queries
 * contractors.trade against (`.eq("trade", trade)`) — Diego's recommended_trade
 * enum uses these same five values. A contractor row with any other trade
 * string is invisible to auto-dispatch even if it's the obviously right vendor.
 */
export const CONTRACTOR_TRADES = ["HVAC", "plomeria", "electrico", "seguridad", "refrigeracion"] as const;
export type ContractorTrade = (typeof CONTRACTOR_TRADES)[number];

export const CONTRACTOR_TRADE_LABELS: Record<ContractorTrade, string> = {
  HVAC: "HVAC / Aire y Clima",
  plomeria: "Plomería",
  electrico: "Eléctrico",
  seguridad: "Seguridad y Accesos",
  refrigeracion: "Refrigeración",
};

export const CONTRACTOR_RATE_TYPES = ["FLAT", "PER_INCIDENT"] as const;
export type ContractorRateType = (typeof CONTRACTOR_RATE_TYPES)[number];

export const CONTRACTOR_RATE_TYPE_LABELS: Record<ContractorRateType, string> = {
  FLAT: "Tarifa Fija",
  PER_INCIDENT: "Por Incidente",
};

export type Contractor = {
  id: string;
  name: string;
  trade: string;
  coverageHours: string | null;
  responseTimeCommitment: string | null;
  rate: number | null;
  rateType: ContractorRateType | null;
  licenseExpiry: string | null;
  coiExpiry: string | null;
  active: boolean;
};
