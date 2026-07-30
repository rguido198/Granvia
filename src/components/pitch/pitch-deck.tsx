"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AI_TEAM } from "@/content/team";
import {
  PITCH_CLOSE,
  PITCH_COST,
  PITCH_COVER,
  PITCH_DEMO,
  PITCH_THESIS,
  PITCH_TOGETHER,
} from "@/content/pitch";
import { cn, accentBg, accentText } from "@/components/ui";

const SLIDE_COUNT = 9;

/** team.ts writes "Antes: …" / "Ahora: …" for pages with no separate label chip; this slide has its own chip. */
function stripLeadPrefix(text: string) {
  return text.replace(/^(Antes|Ahora):\s*/i, "");
}

/** Dotted paper texture, matching the tight-radius / warm-neutral system elsewhere on the site. */
const DOTTED_BG = {
  backgroundImage: "radial-gradient(circle at 1px 1px, rgb(33 31 28 / 0.06) 1px, transparent 0)",
  backgroundSize: "22px 22px",
} as const;

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Full-bleed click-through slide deck on desktop (arrow keys, click zones,
 * dot nav — built for a presenter driving a laptop). On mobile it drops the
 * slide mechanics entirely and renders as one long scroll — a client
 * opening this link on their phone, alone, shouldn't have to tap tiny
 * arrows to read a pitch.
 */
export function PitchDeck() {
  const [current, setCurrent] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const go = (i: number) => setCurrent(Math.max(0, Math.min(SLIDE_COUNT - 1, i)));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        setCurrent((c) => Math.min(SLIDE_COUNT - 1, c + 1));
        e.preventDefault();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setCurrent((c) => Math.max(0, c - 1));
        e.preventDefault();
      } else if (e.key === "Home") {
        setCurrent(0);
      } else if (e.key === "End") {
        setCurrent(SLIDE_COUNT - 1);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative bg-sand-100 sm:h-[calc(100vh-74px)] sm:overflow-hidden"
      style={DOTTED_BG}
    >
      <Slide index={0} current={current}>
        <CoverSlide />
      </Slide>
      <Slide index={1} current={current}>
        <ThesisSlide />
      </Slide>
      <Slide index={2} current={current}>
        <CostSlide />
      </Slide>
      {AI_TEAM.map((employee, i) => (
        <Slide key={employee.key} index={3 + i} current={current}>
          <AgentSlide employee={employee} />
        </Slide>
      ))}
      <Slide index={6} current={current}>
        <TogetherSlide />
      </Slide>
      <Slide index={7} current={current}>
        <DemoSlide />
      </Slide>
      <Slide index={8} current={current}>
        <CloseSlide />
      </Slide>

      {/* Nav chrome — desktop only */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 hidden items-center justify-between px-6 py-4 sm:flex lg:px-12">
        <div className="pointer-events-auto font-mono text-xs tracking-[0.08em] text-ink-400 tabular-nums">
          {pad(current + 1)} / {pad(SLIDE_COUNT)}
        </div>
        <div className="pointer-events-auto flex gap-1.5">
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ir a la diapositiva ${i + 1}`}
              className={cn(
                "h-1.75 w-1.75 cursor-pointer rounded-full border-0 p-0 transition-transform duration-200",
                i === current ? "scale-[1.3] bg-terra" : "bg-hairline-strong hover:scale-125",
              )}
            />
          ))}
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={() => go(current - 1)}
            disabled={current === 0}
            aria-label="Diapositiva anterior"
            className="flex h-9.5 w-9.5 cursor-pointer items-center justify-center rounded-full border border-hairline-strong bg-sand-50 text-ink transition-colors hover:bg-sand-200 disabled:cursor-default disabled:opacity-35"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            disabled={current === SLIDE_COUNT - 1}
            aria-label="Siguiente diapositiva"
            className="flex h-9.5 w-9.5 cursor-pointer items-center justify-center rounded-full border border-hairline-strong bg-sand-50 text-ink transition-colors hover:bg-sand-200 disabled:cursor-default disabled:opacity-35"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

/** Shell shared by every slide: stacked block on mobile, absolute click-through pane on desktop. */
function Slide({
  index,
  current,
  children,
}: {
  index: number;
  current: number;
  children: React.ReactNode;
}) {
  const active = index === current;
  return (
    <section
      className={cn(
        "border-b border-hairline px-6 py-20 sm:border-0 sm:px-[8vw] sm:py-0",
        "sm:absolute sm:inset-0 sm:flex sm:flex-col sm:justify-center sm:transition-all sm:duration-500 sm:ease-out",
        active
          ? "sm:pointer-events-auto sm:translate-y-0 sm:opacity-100"
          : "sm:pointer-events-none sm:translate-y-3 sm:opacity-0",
      )}
    >
      <div className={cn("mx-auto w-full max-w-[1180px]", active && "animate-fadeIn")}>{children}</div>
    </section>
  );
}

function Eyebrow({ children, accent = "terra" }: { children: React.ReactNode; accent?: "terra" | "pine" | "gold" }) {
  return (
    <p className={cn("mb-4.5 font-mono text-xs tracking-[0.22em] uppercase", accentText(accent))}>{children}</p>
  );
}

function CoverSlide() {
  return (
    <div className="flex min-h-[calc(100vh-74px-160px)] flex-col sm:min-h-0 sm:h-full sm:py-14">
      <Image
        src="/brand/la-gran-via-logo-horizontal.png"
        alt="La Gran Vía"
        width={180}
        height={63}
        className="h-11 w-auto self-start"
      />
      <div className="my-auto py-10">
        <Eyebrow>{PITCH_COVER.eyebrow}</Eyebrow>
        <h1 className="font-display text-[clamp(2.6rem,6.4vw,5rem)] leading-[1.02] font-bold text-ink text-balance">
          {PITCH_COVER.title}
        </h1>
        <p className="mt-5 max-w-[34em] text-[clamp(1.05rem,1.5vw,1.3rem)] leading-relaxed text-ink-500">
          {PITCH_COVER.lead}
        </p>
      </div>
      <div className="flex items-end justify-between border-t border-hairline pt-4.5 font-mono text-[12px] text-ink-400">
        <span>LA GRAN VÍA · MEXICALI, B.C.</span>
        <span className="hidden sm:inline">01 / 09 →</span>
      </div>
    </div>
  );
}

function BrowserMockup({ label, url, badge }: { label: string; url: string; badge?: string }) {
  return (
    <div className="relative pt-3.5">
      <span className="absolute top-0 left-3.5 rounded-xs border border-hairline-strong bg-sand-100 px-2 py-0.5 font-mono text-[10.5px] tracking-[0.1em] text-ink-500 uppercase">
        {label}
      </span>
      <div className="relative overflow-hidden rounded-md border border-hairline-strong bg-sand-200 shadow-[0_20px_40px_-28px_rgba(33,31,28,0.45)]">
        <div className="flex items-center gap-2 border-b border-hairline bg-sand-300/60 px-2.5 py-2.25">
          <span className="h-1.75 w-1.75 rounded-full bg-hairline-strong" />
          <span className="h-1.75 w-1.75 rounded-full bg-hairline-strong" />
          <span className="h-1.75 w-1.75 rounded-full bg-hairline-strong" />
          <span className="min-w-0 flex-1 truncate rounded-xs border border-hairline bg-sand-100 px-2 py-0.75 font-mono text-[10.5px] text-ink-500">
            {url}
          </span>
        </div>
        <div className="grid gap-2 p-3.5">
          <div className="h-11.5 rounded-xs bg-gradient-to-tr from-ink to-terra-dark" />
          <div className="h-2 w-3/5 rounded-xs bg-hairline-strong" />
          <div className="flex gap-2">
            <span className="h-6.5 flex-1 rounded-xs border border-hairline bg-sand-100" />
            <span className="h-6.5 flex-1 rounded-xs border border-hairline bg-sand-100" />
            <span className="h-6.5 flex-1 rounded-xs border border-hairline bg-sand-100" />
          </div>
        </div>
        {badge && (
          <span className="animate-pulse-glow absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-xs bg-pine px-2.25 py-1.25 font-mono text-[10px] tracking-[0.06em] text-sand-100 uppercase">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#bfe3d3]" />
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function ThesisSlide() {
  return (
    <div className="grid items-center gap-10 sm:grid-cols-[0.95fr_1.05fr] sm:gap-14">
      <div>
        <Eyebrow>{PITCH_THESIS.eyebrow}</Eyebrow>
        <h2 className="font-display text-[clamp(2.1rem,4.6vw,3.6rem)] leading-[1.02] font-bold text-ink text-balance">
          Esto <em className="text-terra italic">no</em> es un rediseño.
        </h2>
        <p className="mt-5 max-w-[34em] text-[clamp(1.05rem,1.5vw,1.3rem)] leading-relaxed text-ink-500">
          {PITCH_THESIS.lead}
        </p>
      </div>
      <div>
        <div className="grid gap-4 sm:grid-cols-2">
          <BrowserMockup label={PITCH_THESIS.labelBefore} url={PITCH_THESIS.urlBefore} />
          <BrowserMockup label={PITCH_THESIS.labelAfter} url={PITCH_THESIS.urlAfter} badge={PITCH_THESIS.badge} />
        </div>
        <p className="mt-4.5 text-center font-mono text-[12.5px] text-ink-400">{PITCH_THESIS.caption}</p>
      </div>
    </div>
  );
}

function CostSlide() {
  return (
    <div>
      <Eyebrow>{PITCH_COST.eyebrow}</Eyebrow>
      <h2 className="font-display text-[clamp(2.1rem,4.6vw,3.6rem)] leading-[1.02] font-bold text-ink text-balance">
        {PITCH_COST.title}
      </h2>
      <div className="mt-8 max-w-[46em] border-t border-hairline-strong">
        {PITCH_COST.items.map((item) => (
          <div key={item.tag} className="grid grid-cols-[76px_1fr] items-baseline gap-4.5 border-b border-hairline py-4">
            <span className="font-mono text-[11px] tracking-[0.06em] text-terra uppercase">{item.tag}</span>
            <p className="m-0 text-[17px] text-ink">{item.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-7 font-display text-[clamp(1.1rem,2vw,1.4rem)] text-ink-500 italic">{PITCH_COST.close}</p>
    </div>
  );
}

function AgentSlide({ employee }: { employee: (typeof AI_TEAM)[number] }) {
  return (
    <div className="grid items-center gap-10 sm:grid-cols-[0.6fr_1fr] sm:gap-16">
      <div>
        <span
          className={cn(
            "flex h-27 w-27 items-center justify-center rounded-full font-display text-4xl font-bold text-sand-100",
            accentBg(employee.accent),
          )}
        >
          {employee.avatarInitial}
        </span>
        <p className={cn("mt-5.5 mb-1.5 font-mono text-xs tracking-[0.18em] uppercase", accentText(employee.accent))}>
          {employee.role}
        </p>
        <h2 className="font-display text-[clamp(2.4rem,5vw,3.6rem)] font-bold text-ink">{employee.name}</h2>
      </div>
      <div>
        <p className="max-w-[30em] text-[clamp(1.15rem,1.9vw,1.5rem)] leading-relaxed text-ink">{employee.pitch}</p>
        <div className="mt-7.5 grid max-w-[30em] gap-2.5">
          <div className="grid grid-cols-[68px_1fr] items-baseline gap-3.5 rounded-xs bg-sand-200 px-4 py-3.25 text-[14.5px] text-ink-400">
            <span className="self-center font-mono text-[10.5px] tracking-[0.08em] uppercase">Antes</span>
            <span>{stripLeadPrefix(employee.before)}</span>
          </div>
          <div
            className={cn(
              "grid grid-cols-[68px_1fr] items-baseline gap-3.5 rounded-xs bg-sand-200 px-4 py-3.25 text-[14.5px] font-semibold text-ink border-l-[3px]",
              employee.accent === "terra" ? "border-terra" : employee.accent === "pine" ? "border-pine" : "border-gold",
            )}
          >
            <span className="self-center font-mono text-[10.5px] tracking-[0.08em] uppercase">Ahora</span>
            <span>{stripLeadPrefix(employee.after)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TogetherSlide() {
  return (
    <div>
      <Eyebrow accent="pine">{PITCH_TOGETHER.eyebrow}</Eyebrow>
      <h2 className="font-display text-[clamp(2.1rem,4.6vw,3.6rem)] leading-[1.02] font-bold text-ink text-balance">
        {PITCH_TOGETHER.title}
      </h2>
      <p className="mt-5 max-w-[34em] text-[clamp(1.05rem,1.5vw,1.3rem)] leading-relaxed text-ink-500">
        {PITCH_TOGETHER.lead}
      </p>
      <div className="mt-8 grid gap-3.5 sm:grid-cols-3">
        {PITCH_TOGETHER.outcomes.map((o) => (
          <div key={o} className="rounded-md border border-hairline-strong bg-sand-200 p-5">
            <p className="m-0 font-display text-xl leading-tight font-bold text-ink">{o}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoSlide() {
  return (
    <div className="text-center">
      <Eyebrow>{PITCH_DEMO.eyebrow}</Eyebrow>
      <h2 className="font-display text-[clamp(2.1rem,4.6vw,3.6rem)] leading-[1.02] font-bold text-ink text-balance">
        {PITCH_DEMO.title}
      </h2>
      <p className="mx-auto mt-5 max-w-[30em] text-[clamp(1.05rem,1.5vw,1.3rem)] leading-relaxed text-ink-500">
        {PITCH_DEMO.lead}
      </p>
      <a
        href={PITCH_DEMO.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center gap-2.5 rounded-xs border border-terra bg-terra px-8.5 py-4.5 text-[17px] font-semibold text-sand-100 transition-colors hover:border-terra-dark hover:bg-terra-dark"
      >
        {PITCH_DEMO.ctaLabel} →
      </a>
      <p className="mt-4 font-mono text-[12.5px] text-ink-400">{PITCH_DEMO.urlLabel}</p>
    </div>
  );
}

function CloseSlide() {
  return (
    <div className="text-center">
      <Eyebrow>{PITCH_CLOSE.eyebrow}</Eyebrow>
      <h2 className="font-display text-[clamp(2.1rem,4.6vw,3.6rem)] leading-[1.05] font-bold text-ink text-balance">
        {PITCH_CLOSE.title}
      </h2>
      <p className="mx-auto mt-5 max-w-[30em] text-[clamp(1.05rem,1.5vw,1.3rem)] leading-relaxed text-ink-500">
        {PITCH_CLOSE.lead}
      </p>
      <p className="mt-9 font-mono text-xs tracking-[0.04em] text-ink-400">
        {PITCH_CLOSE.creditLabel}{" "}
        <a
          href={PITCH_CLOSE.creditUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-600 underline hover:text-ink"
        >
          {PITCH_CLOSE.creditName}
        </a>
        {" · "}
        <span dangerouslySetInnerHTML={{ __html: "<!--email_off-->" }} />
        <a href={`mailto:${PITCH_CLOSE.creditEmail}`} className="text-ink-600 underline hover:text-ink">
          {PITCH_CLOSE.creditEmail}
        </a>
        <span dangerouslySetInnerHTML={{ __html: "<!--/email_off-->" }} />
      </p>
    </div>
  );
}
