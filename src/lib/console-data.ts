/**
 * Shape of everything the landlord console renders.
 *
 * Types only — no values. This module is safe to import from a client component
 * because `import type` is erased at compile time and nothing here survives into
 * a bundle. The data itself lives in console-data.server.ts, which is marked
 * server-only precisely so it cannot be imported the same way.
 */

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

/** Everything the console needs, computed on the server and passed down as props. */
export type ConsoleData = {
  maintenanceEvents: MaintenanceEvent[];

  /** The accounting period the figures describe. */
  periodLabel: string;
};
