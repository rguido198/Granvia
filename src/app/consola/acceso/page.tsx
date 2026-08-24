import { PageFade } from "@/components/ui";
import { LoginForm } from "@/app/consola/acceso/login-form";

export default function ConsoleLoginPage() {
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
              Acceso restringido
            </span>
          </p>

          <h1 className="mt-3 text-center font-display text-2xl font-bold leading-tight text-ink">
            Consola de Asset Management
          </h1>
          <p className="mt-2 text-center text-xs leading-relaxed text-ink-500">
            Rent roll consolidado, mantenimiento y CapEx vía Diego AI, expedientes de arrendamiento vía Mariana AI. Uso
            exclusivo del personal autorizado de La Gran Vía Mexicali.
          </p>

          <LoginForm />

          <p className="mt-5 border-t border-hairline pt-4 text-center font-mono text-[10px] leading-relaxed text-ink-500">
            La sesión caduca a las 8 horas. ¿Sin acceso? Escribe a{" "}
            <a className="underline hover:text-ink" href="mailto:contact@technologyconsultants.ventures">
              contact@technologyconsultants.ventures
            </a>
          </p>
        </div>
      </div>
    </PageFade>
  );
}
