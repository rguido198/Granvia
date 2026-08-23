import { PageFade } from "@/components/ui";
import { TenantLoginForm } from "@/app/inquilinos/acceso/login-form";

export default function TenantLoginPage() {
  return (
    <PageFade>
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
        <div className="w-full rounded-lg border border-hairline-strong bg-sand-100 p-6 sm:p-8 shadow-lg">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/la-gran-via-logo-horizontal.png"
              alt="La Gran Vía"
              className="h-11 w-auto object-contain"
            />
          </div>

          <p className="mt-5 text-center">
            <span className="inline-block rounded-full border border-pine/30 bg-pine/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-pine">
              Portal Arrendatario
            </span>
          </p>

          <h1 className="mt-3 text-center font-display text-2xl font-bold leading-tight text-ink">
            Tu operación, en orden.
          </h1>
          <p className="mt-2 text-center text-xs leading-relaxed text-ink-500">
            Reporta incidencias, revisa el estatus de tus solicitudes y tu ledger CAM en un solo lugar.
          </p>

          <TenantLoginForm />

          <p className="mt-5 border-t border-hairline pt-4 text-center font-mono text-[10px] leading-relaxed text-ink-500">
            ¿No tienes cuenta? Tu administrador de plaza te envía una invitación por correo.
          </p>
        </div>
      </div>
    </PageFade>
  );
}
