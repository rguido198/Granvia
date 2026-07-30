import { CAM_ALLOCATION } from "@/content/hub";
import { MonoNote } from "@/components/ui";

const currency = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const BAR_COLORS = ["bg-terra", "bg-pine", "bg-gold", "bg-ink-700", "bg-ink-400"];

/** Shows the AI ingesting one utility invoice and dividing it proportionally by tenant m². */
export function CamAllocation() {
  const { invoiceLabel, invoiceTotal, rows } = CAM_ALLOCATION;

  return (
    <div className="rounded-lg border border-hairline bg-sand-50 p-4 sm:p-5">
      <h3 className="mb-0.5 font-display text-base font-bold text-ink sm:text-lg">
        Prorrateo Automático de CAM
      </h3>
      <p className="mb-1 text-xs text-ink-500">{invoiceLabel}</p>
      <p className="mb-3.5 font-mono text-lg font-semibold text-ink">
        {currency(invoiceTotal)}
      </p>

      <div className="mb-3.5 h-3 w-full overflow-hidden rounded-full bg-sand-200">
        <div className="flex h-full w-full">
          {rows.map((row, i) => (
            <div
              key={row.tenant}
              className={BAR_COLORS[i % BAR_COLORS.length]}
              style={{ width: `${row.share * 100}%` }}
              title={`${row.tenant} · ${(row.share * 100).toFixed(1)}%`}
            />
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li key={row.tenant} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-[2px] ${BAR_COLORS[i % BAR_COLORS.length]}`} />
              <span className="truncate text-ink-700">{row.tenant}</span>
              <span className="shrink-0 font-mono text-[10.5px] text-ink-400">{row.sqm} m²</span>
            </span>
            <span className="shrink-0 font-mono font-semibold text-ink">
              {currency(row.amount)}
            </span>
          </li>
        ))}
      </ul>

      <MonoNote className="mt-3.5">
        El Agente ingiere la factura y divide el monto proporcionalmente a los m² rentados
        de cada local — sin cálculo manual en Excel.
      </MonoNote>
    </div>
  );
}
