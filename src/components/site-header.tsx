"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV, HUB_NAV, SITE } from "@/content/site";
import { cn } from "@/components/ui";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hubActive = isActive(pathname, HUB_NAV.href);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-sand-100/88 backdrop-blur-[10px]">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3 shrink-0" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/la-gran-via-logo-horizontal.png"
            alt={`${SITE.name} ${SITE.city}`}
            className="h-13 sm:h-16 lg:h-[68px] w-auto object-contain transition-opacity hover:opacity-90"
          />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Principal" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-b-2 py-1.5 text-sm transition-colors",
                  active
                    ? "border-terra font-semibold text-ink"
                    : "border-transparent font-medium text-ink-400 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href={HUB_NAV.href}
            aria-current={hubActive ? "page" : undefined}
            className={cn(
              "rounded-xs border border-pine px-4.5 py-2.5 text-[13.5px] font-semibold transition-colors",
              hubActive
                ? "bg-pine text-sand-100"
                : "text-pine hover:bg-pine hover:text-sand-100",
            )}
          >
            {HUB_NAV.label}
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-movil"
          className="flex h-10 w-10 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-xs border border-hairline lg:hidden"
        >
          <span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
          <span
            className={cn(
              "block h-px w-4.5 bg-ink transition-transform duration-200",
              open && "translate-y-[3px] rotate-45",
            )}
          />
          <span
            className={cn(
              "block h-px w-4.5 bg-ink transition-transform duration-200",
              open && "-translate-y-[3px] -rotate-45",
            )}
          />
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav
          id="menu-movil"
          aria-label="Principal"
          className="border-t border-hairline bg-sand-100 px-5 py-4 lg:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block border-l-2 py-2.5 pl-3 text-[15px]",
                      active
                        ? "border-terra font-semibold text-ink"
                        : "border-transparent font-medium text-ink-500",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li className="pt-2">
              <Link
                href={HUB_NAV.href}
                onClick={() => setOpen(false)}
                aria-current={hubActive ? "page" : undefined}
                className={cn(
                  "block rounded-xs border border-pine px-4 py-2.5 text-center text-sm font-semibold",
                  hubActive ? "bg-pine text-sand-100" : "text-pine",
                )}
              >
                {HUB_NAV.label}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
