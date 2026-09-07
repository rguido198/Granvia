import "server-only";

import type { ConsoleData, MaintenanceEvent } from "@/lib/console-data";

/**
 * Every figure the landlord console shows, computed on the server.
 *
 * `import "server-only"` is the load-bearing line: none of this may end up in
 * a JavaScript chunk, because chunks are served from /_next/static/ and
 * middleware only gates /consola. Importing this from a "use client" module is
 * now a build error rather than a silent leak. The results reach the browser
 * as props on the RSC payload, which is produced per request behind the
 * session check.
 */

/**
 * Diego's forward-looking maintenance calendar — one entry per scheduled
 * inspection, calibration, or preventive service on the plaza's equipment.
 * Illustrative vendor names, independent of the real contractors table
 * (src/lib/data/contractors.server.ts) that matchContractorAndTier() actually
 * dispatches against.
 */
const MAINTENANCE_EVENTS = [
  { id: "EVT-01", date: "18 Ago 2026", title: "Calibración Cámaras LPR", vendor: "Hikvision & FAAC México", category: "Seguridad & Acceso", costEstimate: 8500, responsible: "Jefe de Seguridad", responsibleEmail: "seguridad@lagranvia.com.mx" },
  { id: "EVT-02", date: "25 Ago 2026", title: "Prueba Trimestral de Aspersores", vendor: "Johnson Controls Fire Protection", category: "Protección Incendio", costEstimate: 12000, responsible: "Gerente de Mantenimiento", responsibleEmail: "mantenimiento@lagranvia.com.mx" },
  { id: "EVT-03", date: "05 Sep 2026", title: "Revisión Preventiva Anual Chiller Trane", vendor: "Climas de Mexicali S.A. de C.V.", category: "HVAC & Climas", costEstimate: 34200, responsible: "Gerente de Mantenimiento", responsibleEmail: "mantenimiento@lagranvia.com.mx" },
  { id: "EVT-04", date: "20 Sep 2026", title: "Inspección Técnica Semestral Elevador", vendor: "TK Elevator México", category: "Elevadores", costEstimate: 18900, responsible: "Gerente de Mantenimiento", responsibleEmail: "mantenimiento@lagranvia.com.mx" },
  { id: "EVT-05", date: "10 Oct 2026", title: "Mantenimiento Bianual Subestación Eléctrica", vendor: "Schneider Electric México", category: "Eléctrico & Subestación", costEstimate: 62000, responsible: "Dirección General", responsibleEmail: "direccion@lagranvia.com.mx" },
  { id: "EVT-06", date: "05 Nov 2026", title: "Servicio de Membranas PTAR", vendor: "Grundfos México", category: "Hidráulico & PTAR", costEstimate: 27800, responsible: "Gerente de Mantenimiento", responsibleEmail: "mantenimiento@lagranvia.com.mx" },
];

/**
 * Assembles the console payload. Called from the server component that renders
 * /consola, once per request.
 */
export function buildConsoleData(): ConsoleData {
  return {
    maintenanceEvents: MAINTENANCE_EVENTS satisfies MaintenanceEvent[],
    periodLabel: "Agosto 2026",
  };
}
