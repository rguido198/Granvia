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
 */
export function TenantLogo({
  tenant,
  className,
}: {
  tenant: Tenant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xs p-3",
        tenant.logoOnDark ? "bg-ink" : "bg-sand-50",
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
