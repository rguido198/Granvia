import Link from "next/link";
import { HUB_NAV, SITE } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 font-sans border-t border-slate-800">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-8 space-y-10">
        {/* TOP SECTION: 4 STRUCTURED COLUMNS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800/80">
          
          {/* COLUMN 1: BRAND IDENTITY */}
          <div className="space-y-3">
            <Link href="/" className="inline-block bg-white px-3.5 py-2 rounded-xl border border-slate-700/80 shadow-sm hover:opacity-95 transition-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/la-gran-via-logo-horizontal.png"
                alt="La Gran Vía Mexicali"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-slate-400 font-semibold pt-1">Plaza Lifestyle · Mexicali, B.C.</p>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              El centro comercial y corporativo líder en Mexicali. Plataforma de administración y experiencia impulsada por Agentes IA.
            </p>
          </div>

          {/* COLUMN 2: PLAZA NAVIGATION */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Navegación Plaza</h3>
            <ul className="space-y-2.5 text-sm font-medium">
              <li>
                <Link href="/" className="hover:text-white transition-colors text-slate-300">
                  Vive Un Gran Día
                </Link>
              </li>
              <li>
                <Link href="/directorio" className="hover:text-white transition-colors text-slate-300">
                  Directorio de Locales
                </Link>
              </li>
              <li>
                <Link href="/propuesta" className="hover:text-white transition-colors text-slate-300">
                  Crece Tu Negocio (Leasing)
                </Link>
              </li>
              <li>
                <Link href="/eventos" className="hover:text-white transition-colors text-slate-300">
                  Eventos
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMN 3: PLATFORM & SUPPORT */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Plataforma & Soporte</h3>
            <ul className="space-y-2.5 text-sm font-medium">
              <li>
                <Link href={HUB_NAV.href} className="hover:text-white transition-colors text-slate-300 flex items-center gap-2">
                  <span>{HUB_NAV.label}</span>
                  <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700">Admin</span>
                </Link>
              </li>
              <li>
                <Link href="/inquilinos" className="hover:text-white transition-colors text-slate-300">
                  Portal Arrendatario (Vista Inquilino)
                </Link>
              </li>
              <li>
                <a href={`mailto:${SITE.emails.support}`} className="hover:text-white transition-colors text-slate-300">
                  Soporte Operativo & Facturación
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMN 4: CONCEPT CREDITS & TECH */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">REDISEÑO 2026 · CONCEPTO</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Transformación digital integral de Asset Management y agentes de IA autónomos desarrollados por:
            </p>
            <a
              href="https://technologyconsultants.ventures"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-3.5 py-2 rounded-xl text-xs transition-colors border border-slate-700 shadow-2xs group"
            >
              <span>Technology Consultants</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </a>
          </div>

        </div>

        {/* BOTTOM BAR: COPYRIGHT & LEGAL */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
          <p>© 2026 La Gran Vía Mexicali. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6 text-slate-400">
            <span className="hover:text-slate-200 cursor-pointer">Privacidad & Datos</span>
            <span className="hover:text-slate-200 cursor-pointer">Términos de Servicio</span>
            <span className="hover:text-slate-200 cursor-pointer">Cumplimiento SAT CFDI 4.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
