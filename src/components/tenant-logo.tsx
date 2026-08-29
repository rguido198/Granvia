import Image from "next/image";
import type { Tenant } from "@/content/tenants";
import { cn } from "@/components/ui";

/**
 * Placa de logotipo con proporción fija.
 *
 * Los logos del directorio oficial vienen en proporciones muy distintas
 * (wordmarks anchos, isotipos cuadrados), así que se contienen dentro de una
 * caja constante para que la retícula no se descuadre. `logoOnDark` levanta
 * una placa oscura para los logotipos que no contrastan contra la arena.
 *
 * `padding`/`rounded`/`background` exist because `cn()` (components/ui.tsx)
 * is a plain string-join, not a Tailwind-conflict-aware merge — a caller
 * passing `p-1`/`rounded-lg` in `className` to override this component's own
 * `p-3`/`rounded-xs` produces two same-property utility classes in one
 * class list, and which one actually wins depends on Tailwind's build-time
 * declaration order, not on the caller's intent. Found live: the console's
 * Rent Roll table passed `p-1` hoping to shrink the padding for its dense
 * 36px avatar slot, but the base `p-3` was winning — most of the box was
 * padding, not logo, which is why the tiny plaque read as "hardly legible"
 * even though the source images were fine. These three props are the actual
 * override path; pass them instead of fighting the base classes through
 * `className` a second time.
 */
export function TenantLogo({
  tenant,
  className,
  padding = "p-3",
  rounded = "rounded-xs",
  background,
}: {
  tenant: Tenant;
  className?: string;
  padding?: string;
  rounded?: string;
  background?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        rounded,
        padding,
        background ?? (tenant.logoOnDark ? "bg-ink" : "bg-sand-50"),
        className,
      )}
    >
      <Image
        src={tenant.logo}
        alt={`Logotipo de ${tenant.name}`}
        width={160}
        height={80}
        className="h-full w-full object-contain"
        // Logos pequeños y numerosos: se sirven tal cual, sin optimizar.
        unoptimized
      />
    </span>
  );
}
