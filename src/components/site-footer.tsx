import Link from "next/link";
import { NAV, HUB_NAV, SITE } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-dune-300">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-5 py-11 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-[22px] font-bold text-sand-100">
            {SITE.name}
          </p>
          <p className="mt-1 text-[13px]">
            {SITE.tagline} · {SITE.city}, {SITE.state}
          </p>
        </div>

        <nav aria-label="Pie de página">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            {[...NAV, HUB_NAV].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-dune-300 transition-colors hover:text-sand-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <span dangerouslySetInnerHTML={{ __html: "<!--email_off-->" }} />
              <a
                href={`mailto:${SITE.emails.support}`}
                className="text-dune-300 transition-colors hover:text-sand-100"
              >
                Soporte
              </a>
              <span dangerouslySetInnerHTML={{ __html: "<!--/email_off-->" }} />
            </li>
          </ul>
        </nav>

        <div className="text-left md:text-right">
          <p className="font-mono text-[11px] tracking-[0.06em] text-dune-500">
            REDISEÑO 2026 · CONCEPTO
          </p>
          <p className="mt-1 text-[12.5px] text-dune-300">
            Desarrollado por{" "}
            <a
              href="https://technologyconsultants.ventures"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gold transition-colors hover:text-sand-100 hover:underline"
            >
              Technology Consultants
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
