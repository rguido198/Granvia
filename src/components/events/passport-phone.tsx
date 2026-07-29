import { PASSPORT, PASSPORT_OFFERS, RACE } from "@/content/events";
import { SITE } from "@/content/site";
import { cn } from "@/components/ui";

/**
 * Phone mockup holding the digital passport wallet.
 * Decorative chrome is hidden from assistive tech; the offer list is real
 * content and stays readable.
 */
export function PassportPhone() {
  return (
    <div className="flex justify-center">
      <div className="w-70 rounded-[34px] bg-ink p-3 shadow-[0_30px_60px_-30px_rgba(33,31,28,0.7)]">
        <div className="overflow-hidden rounded-3xl bg-sand-100">
          {/* Wallet header */}
          <div className="bg-terra px-5 pt-5 pb-4 text-center text-sand-100">
            <p className="font-mono text-[9px] tracking-[0.24em] opacity-80">
              PASAPORTE · {RACE.year}
            </p>
            <p className="mt-1 font-display text-2xl font-bold">{SITE.name}</p>
            <p className="mt-0.5 text-xs opacity-85">
              Corredor {PASSPORT.holder.id} · {PASSPORT.holder.name}
            </p>
          </div>

          <div className="px-4.5 pt-4.5 pb-5">
            {/* Stand-in QR block */}
            <div
              aria-hidden="true"
              className="mx-auto mb-4 h-30 w-30 rounded-md border-[5px] border-ink"
              style={{
                background:
                  "conic-gradient(#211F1C 90deg, transparent 0 180deg, #211F1C 0 270deg, transparent 0)",
                backgroundSize: "15px 15px",
              }}
            />
            <p className="mb-3.5 text-center font-mono text-[10px] tracking-[0.1em] text-ink-400">
              ESCANEA EN CAJA PARA CANJEAR
            </p>

            <ul className="grid gap-2">
              {PASSPORT_OFFERS.map((offer) => (
                <li
                  key={offer.tenant}
                  className="flex items-center justify-between gap-2 rounded-sm border border-hairline bg-sand-50 px-3 py-2.25"
                >
                  <span>
                    <span className="block text-[13px] font-semibold">
                      {offer.tenant}
                    </span>
                    <span className="block text-[11px] text-ink-400">
                      {offer.offer}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[10px]",
                      offer.status === "ACTIVO" ? "text-pine" : "text-ink-400",
                    )}
                  >
                    {offer.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
