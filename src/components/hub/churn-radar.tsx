import { CHURN_RADAR, type ChurnRow } from "@/content/hub";
import { cn } from "@/components/ui";

const RISK_STYLE: Record<ChurnRow["risk"], { badge: string; label: string; dot: string }> = {
  green: { badge: "bg-pine/15 text-pine", label: "Saludable", dot: "bg-pine" },
  yellow: { badge: "bg-gold/20 text-gold", label: "Atención", dot: "bg-gold" },
  red: { badge: "bg-terra/15 text-terra", label: "Riesgo alto", dot: "bg-terra" },
};

/** Proactive churn radar — flags renewal risk months before the lease expires. */
export function ChurnRadar() {
  return (
    <div className="rounded-lg border border-hairline bg-sand-50 p-4 sm:p-5">
      <h3 className="mb-0.5 font-display text-base font-bold text-ink sm:text-lg">
        Radar de Riesgo de Rotación (Churn)
      </h3>
      <p className="mb-3.5 text-xs text-ink-500">
        Cruce de vencimiento de contrato, actividad en portal y ventas — meses antes del riesgo.
      </p>

      {/* Mobile: stacked cards */}
      <div className="block space-y-2.5 sm:hidden">
        {CHURN_RADAR.map((row) => {
          const style = RISK_STYLE[row.risk];
          return (
            <div key={row.tenant} className="rounded-md border border-hairline bg-sand-100 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">{row.tenant}</span>
                <span className={cn("rounded px-2 py-0.5 font-mono text-[10px] font-bold", style.badge)}>
                  {style.label}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-ink-500">
                <span>Vence: {row.leaseEnds}</span>
                <span>Portal: {row.portalActivity}</span>
              </div>
              <p className="mt-1 text-ink-600">{row.note}</p>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-hairline font-mono text-[10.5px] uppercase text-ink-400">
              <th className="pb-2.5 font-normal">Inquilino</th>
              <th className="pb-2.5 font-normal">Vence contrato</th>
              <th className="pb-2.5 font-normal">Actividad en portal</th>
              <th className="pb-2.5 font-normal">Riesgo</th>
              <th className="pb-2.5 font-normal">Nota del Agente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline text-ink-700">
            {CHURN_RADAR.map((row) => {
              const style = RISK_STYLE[row.risk];
              return (
                <tr key={row.tenant}>
                  <td className="py-3 font-medium text-ink">{row.tenant}</td>
                  <td className="py-3">{row.leaseEnds}</td>
                  <td className="py-3">{row.portalActivity}</td>
                  <td className="py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] font-bold",
                        style.badge,
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                      {style.label}
                    </span>
                  </td>
                  <td className="py-3 text-ink-500">{row.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
