/**
 * Shape of everything the landlord console renders.
 *
 * Types only — no values. This module is safe to import from a client component
 * because `import type` is erased at compile time and nothing here survives into
 * a bundle. The data itself lives in console-data.server.ts, which is marked
 * server-only precisely so it cannot be imported the same way.
 */

export interface ApplicantCase {
  id: string;
  brand: string;
  category: string;
  menu: string;
  sqm: number;
  conflictingTenant: string;
  conflictingClause: string;
  status: "RECHAZADO" | "CONDICIONADO" | "APROBADO";
  reasoning: string;
  rentLossPrevented: string;
  /** Annual rent protected by a rejection, in MXN. Only set on RECHAZADO cases —
   *  it is what the "Renta Protegida Anual" metric sums, so the headline figure
   *  and the case cards can never disagree. */
  rentProtectedAnnualMxn?: number;
  contractPdfName: string;
  contractPdfPage: string;
  contractExactSnippet: string;
  overlapScore: string;
  legalFilter: string;
}

/** One critical asset in Diego's bitácora. */
export type CriticalEquipment = {
  asset: string;
  model: string;
  serial: string;
  warranty: string;
  status: string;
  doc: string;
};

/** One scheduled maintenance/warranty event on Diego's calendar. */
export type MaintenanceEvent = {
  id: string;
  date: string;
  title: string;
  vendor: string;
  category: string;
  costEstimate: number;
  responsible: string;
  responsibleEmail: string;
};

/** A canned agent answer, cited back to its source document. */
export type AgentReply = {
  chip: string;
  query: string;
  answer: string;
  docName: string;
  docRef: string;
};

/** The vacant unit the landlord absorbs until it is re-let. */
export type VacantUnit = {
  label: string;
  zone: string;
  tag: string;
  sqm: number;
  askingRent: number;
  sharePct: number;
};

/**
 * One leased unit. `sharePct` is the display percentage already apportioned by
 * largest remainder, so the client renders it rather than recomputing — that is
 * what keeps the column summing to exactly 100.00%.
 */
export type RentRollRow = {
  slug: string;
  unitCode: string;
  name: string;
  zone: string;
  tag: string;
  sqm: number;
  rent: number;
  sharePct: number;
  fiscalAlert: boolean;
};

/** One line of the CAM prorateo matrix, peso amounts already rounded. */
export type CamRow = {
  key: string;
  label: string;
  sqm: number;
  sharePct: number;
  base: number;
  admin: number;
  iva: number;
  total: number;
  vacant: boolean;
  fiscalAlert: boolean;
};

export type CamTotals = { base: number; admin: number; iva: number; total: number; sharePct: number };

/** One settlement line replayed from SAARI against the rent roll. */
export type SaariInboundLine = { local: string; label: string; amount: number; flagged: boolean };

/** Everything the console needs, computed on the server and passed down as props. */
export type ConsoleData = {
  rentRoll: RentRollRow[];
  vacantUnit: VacantUnit;
  camRows: CamRow[];
  camTotals: CamTotals;
  camMonthlyPool: number;

  leasedSqm: number;
  plazaTotalGla: number;
  contractedRent: number;
  potentialRent: number;
  occupancyRate: number;
  registeredUnits: number;
  tenantsAlDia: number;
  tenantsWithAlert: number;
  collectionRate: number;

  leasingApplicants: ApplicantCase[];
  criticalEquipment: CriticalEquipment[];
  maintenanceEvents: MaintenanceEvent[];
  rentProtectedAnnual: number;

  fiscalAlertRent: number;
  saariInbound: SaariInboundLine[];

  /** When this view was produced, formatted server-side to avoid a hydration mismatch. */
  generatedAt: string;
  /** The accounting period the figures describe — distinct from generatedAt. */
  periodLabel: string;

  marianaReplies: AgentReply[];
  diegoReplies: AgentReply[];
};
