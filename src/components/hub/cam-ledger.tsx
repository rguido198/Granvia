"use client";

import { CAM_LEDGER } from "@/content/hub";
import { downloadBlob, generateMockPdf } from "@/lib/mock-pdf";

const currency = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

function downloadInvoice(concept: string, provider: string, plazaMonthly: number, tenantShare: number) {
  const blob = generateMockPdf(
    "Factura de Gasto Operativo (CAM)",
    [
      { body: ["La Gran Vía Mexicali — Administración de Plaza", "Julio 2026"] },
      {
        heading: "Detalle",
        body: [
          `Concepto: ${concept}`,
          `Proveedor: ${provider}`,
          `Costo total plaza: ${currency(plazaMonthly)} MXN`,
          `Participación Local A-04 (145 m² / 7,550 m²): ${currency(tenantShare)} MXN`,
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
    <div className="rounded-lg border border-hairline bg-sand-50 p-4 sm:p-5">
      <h3 className="mb-0.5 font-display text-base font-bold text-ink sm:text-lg">
        Ledger CAM — Gastos Operativos Comunes (NNN)
      </h3>
      <p className="mb-3.5 text-xs text-ink-500">
        Prorrateo transparente de los gastos comunes de la plaza, mes de Julio 2026. Cada
        concepto muestra el costo total de la plaza y la participación de su local.
      </p>

      {/* Mobile: stacked cards */}
      <div className="block space-y-2 sm:hidden">
        {CAM_LEDGER.map((item) => (
          <div key={item.concept} className="rounded-md border border-hairline bg-sand-100 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">{item.concept}</span>
              <span className="font-mono font-semibold text-ink">{currency(item.tenantShare)}</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between">
              <span className="text-ink-400">{item.provider}</span>
              <span className="font-mono text-[10px] text-ink-400">
                plaza {currency(item.plazaMonthly)}
              </span>
            </div>
            <div className="mt-0.5 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  downloadInvoice(item.concept, item.provider, item.plazaMonthly, item.tenantShare)
                }
                className="cursor-pointer text-terra hover:underline"
              >
                Ver Factura →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-hairline font-mono text-[10.5px] uppercase text-ink-400">
              <th className="pb-2.5 font-normal">Concepto</th>
              <th className="pb-2.5 font-normal">Proveedor</th>
              <th className="pb-2.5 font-normal">Costo total plaza</th>
              <th className="pb-2.5 font-normal">Su participación</th>
              <th className="pb-2.5 font-normal">Factura</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline text-ink-700">
            {CAM_LEDGER.map((item) => (
              <tr key={item.concept}>
                <td className="py-3 font-medium text-ink">{item.concept}</td>
                <td className="py-3">{item.provider}</td>
                <td className="py-3 font-mono text-ink-400">{currency(item.plazaMonthly)}</td>
                <td className="py-3 font-mono">{currency(item.tenantShare)}</td>
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() =>
                      downloadInvoice(item.concept, item.provider, item.plazaMonthly, item.tenantShare)
                    }
                    className="cursor-pointer font-semibold text-terra hover:underline"
                  >
                    Ver Factura →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-hairline-strong">
              <td className="pt-3 font-semibold text-ink" colSpan={2}>
                Total CAM · MINT Boutique — Local A-04 (145 m² / 7,550 m²)
              </td>
              <td className="pt-3 font-mono text-ink-400">{currency(plazaTotal)}</td>
              <td className="pt-3 font-mono font-semibold text-ink">{currency(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
