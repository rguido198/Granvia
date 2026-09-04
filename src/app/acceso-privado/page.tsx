import type { Metadata } from "next";
import { PageFade } from "@/components/ui";
import { AccesoForm } from "./acceso-form";


export const metadata: Metadata = {
  title: "Acceso Privado al Proyecto | La Gran Vía Mexicali",
  description: "Vista previa confidencial de la plataforma La Gran Vía Mexicali.",
  robots: { index: false, follow: false },
};

export default function PrivateGatePage() {
  return (
    <PageFade>
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4 py-16">
        <div className="w-full rounded-xl border border-hairline-strong bg-sand-100 p-6 sm:p-8 shadow-xl">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/la-gran-via-logo-horizontal.png"
              alt="La Gran Vía"
              className="h-12 w-auto object-contain"
            />
          </div>

          <p className="mt-5 text-center">
            <span className="inline-block rounded-full border border-ink/20 bg-sand-200 px-3.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink">
              Sitio Privado · Vista Previa Cliente
            </span>
          </p>

          <h1 className="mt-3 text-center font-display text-2xl font-bold leading-tight text-ink">
            Plataforma La Gran Vía
          </h1>
          <p className="mt-2 text-center text-xs leading-relaxed text-ink-500">
            Esta URL contiene una vista previa confidencial del proyecto. Introduce la contraseña proporcionada para navegar el sitio y las consolas de IA.
          </p>

          <AccesoForm />

          <p className="mt-6 border-t border-hairline pt-4 text-center font-mono text-[10px] leading-relaxed text-ink-400">
            ¿Requieres acceso? Contacta a la administración de La Gran Vía o a{" "}
            <a className="underline hover:text-ink" href="mailto:contact@technologyconsultants.ai">
              Technology Consultants
            </a>
          </p>
        </div>
      </div>
    </PageFade>
  );
}
