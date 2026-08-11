"use client";

import { CAM_LEDGER, PORTAL_TENANT } from "@/content/hub";
import { downloadBlob, generateMockPdf } from "@/lib/mock-pdf";

/** Plaza GLA the CAM prorateo divides by — the same basis as the landlord console. */
const PLAZA_GLA = 12745;

const currency = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

function downloadInvoice(concept: string, provider: string, plazaMonthly: number, tenantShare: number) {
  const blob = generateMockPdf(
    "Factura de Gasto Operativo (CAM)",
    [
      { body: ["La Gran Vía Mexicali — Administración de Plaza", "Agosto 2026"] },
      {
        heading: "Detalle",
        body: [
          `Concepto: ${concept}`,
          `Proveedor: ${provider}`,
          `Costo total plaza: ${currency(plazaMonthly)} MXN`,
          `Participación ${PORTAL_TENANT.unit} (${PORTAL_TENANT.sqm} m² / ${PLAZA_GLA.toLocaleString("es-MX")} m²): ${currency(tenantShare)} MXN`,
          "Prorrateo: proporcional a m² rentados por local.",
        ],
      },
    ],
    "Documento generado automáticamente para fines de demostración — La Gran Vía Mexicali.",
  );
  downloadBlob(blob, `Factura_CAM_${concept.replace(/[^a-zA-Z0-9]+/g, "_")}.pdf`);
}

/** Itemized NNN / CAM operating-expense ledger, shown in the tenant view. */
export function CamLedger() {
  const total = CAM_LEDGER.reduce((sum, item) => sum + item.tenantShare, 0);
  const plazaTotal = CAM_LEDGER.reduce((sum, item) => sum + item.plazaMonthly, 0);

  return (
    <div className="rounded-xl border border-slate-300 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-slate-900">
          Ledger CAM — Gastos Operativos Comunes (NNN)
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mt-0.5">
          Prorrateo transparente de los gastos comunes de la plaza, mes de Agosto 2026. Cada
          concepto muestra el costo total de la plaza y la participación de su local.
        </p>
      </div>

      {/* Mobile: stacked cards */}
      <div className="block space-y-3 sm:hidden">
        {CAM_LEDGER.map((item) => (
          <div key={item.concept} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{item.concept}</span>
              <span className="font-mono font-bold text-slate-900">{currency(item.tenantShare)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>{item.provider}</span>
              <span className="font-mono font-semibold">
                plaza {currency(item.plazaMonthly)}
              </span>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() =>
                  downloadInvoice(item.concept, item.provider, item.plazaMonthly, item.tenantShare)
                }
                className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1 rounded-lg text-xs transition-colors"
              >
                Ver Factura PDF →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm font-sans">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-50">
              <th className="py-3 px-3">Concepto</th>
              <th className="py-3 px-3">Proveedor</th>
              <th className="py-3 px-3">Costo total plaza</th>
              <th className="py-3 px-3">Su participación</th>
              <th className="py-3 px-3 text-right">Factura</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-900 font-medium">
            {CAM_LEDGER.map((item) => (
              <tr key={item.concept} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-3 font-bold text-slate-900">{item.concept}</td>
                <td className="py-3.5 px-3 text-slate-700 font-semibold">{item.provider}</td>
                <td className="py-3.5 px-3 font-mono font-semibold text-slate-700">{currency(item.plazaMonthly)}</td>
                <td className="py-3.5 px-3 font-mono font-bold text-slate-900">{currency(item.tenantShare)}</td>
                <td className="py-3.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      downloadInvoice(item.concept, item.provider, item.plazaMonthly, item.tenantShare)
                    }
                    className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors inline-block"
                  >
                    Ver Factura →
                  </button>
                </td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <td className="py-3.5 px-3" colSpan={2}>
                Total CAM · {PORTAL_TENANT.name} — {PORTAL_TENANT.unit} ({PORTAL_TENANT.sqm} m² / {PLAZA_GLA.toLocaleString("es-MX")} m²)
              </td>
              <td className="py-3.5 px-3 font-mono">{currency(plazaTotal)}</td>
              <td className="py-3.5 px-3 font-mono text-base">{currency(total)}</td>
              <td className="py-3.5 px-3"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
