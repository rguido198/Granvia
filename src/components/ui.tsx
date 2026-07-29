import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const ACCENT_TEXT = {
  terra: "text-terra",
  pine: "text-pine",
  gold: "text-gold",
} as const;

const ACCENT_BG = {
  terra: "bg-terra",
  pine: "bg-pine",
  gold: "bg-gold",
} as const;

export type Accent = keyof typeof ACCENT_TEXT;

export const accentText = (accent: Accent) => ACCENT_TEXT[accent];
export const accentBg = (accent: Accent) => ACCENT_BG[accent];

/**
 * The comp's signature label: mono, tiny, wide-tracked, always uppercase.
 * Tracking loosens as the label shrinks, matching the original per-instance
 * letter-spacing values.
 */
export function Kicker({
  children,
  accent = "terra",
  className,
}: {
  children: ReactNode;
  accent?: Accent | "muted";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-[11px] tracking-[0.24em] uppercase",
        accent === "muted" ? "text-ink-400" : ACCENT_TEXT[accent],
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Mono comment line, e.g. "// Selecciona la duración para ver qué recibes". */
export function MonoNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("font-mono text-[11px] text-ink-400", className)}>
      {"// "}
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  as: Tag = "h2",
  className,
  ...props
}: ComponentProps<"h2"> & {
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      {...props}
      className={cn(
        "font-display font-semibold tracking-[-0.01em]",
        Tag === "h1"
          ? "text-[clamp(2.75rem,7vw,4.5rem)] leading-[0.98]"
          : "text-[clamp(2rem,4.5vw,2.875rem)] leading-none",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

const BUTTON_BASE =
  "inline-flex cursor-pointer items-center justify-center rounded-xs text-center text-[15px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_VARIANTS = {
  solid: "border border-terra bg-terra text-sand-100 hover:bg-terra-dark hover:border-terra-dark",
  outline:
    "border border-hairline-strong bg-transparent text-ink hover:border-ink hover:bg-ink hover:text-sand-100",
  pine: "border border-pine bg-pine text-sand-100 hover:bg-ink hover:border-ink",
} as const;

type ButtonVariant = keyof typeof BUTTON_VARIANTS;

const BUTTON_SIZES = {
  md: "px-7 py-[15px]",
  sm: "px-5 py-[11px] text-[13.5px]",
} as const;

export function Button({
  variant = "solid",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: keyof typeof BUTTON_SIZES;
}) {
  return (
    <button
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "solid",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: keyof typeof BUTTON_SIZES;
}) {
  return (
    <Link
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        "hover:text-sand-100",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Renders real photography if `src` is provided, or diagonal-stripe stand-in if not.
 */
export function ImagePlaceholder({
  label,
  src,
  tone = "light",
  className,
}: {
  label: string;
  src?: string | null;
  tone?: "light" | "dark";
  className?: string;
}) {
  if (src) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-sm bg-sand-200",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label}
          className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-[1.02]"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "flex items-end overflow-hidden rounded-sm p-4 sm:p-5",
        tone === "dark" ? "stripe-dark" : "stripe-light",
        className,
      )}
    >
      <span
        className={cn(
          "font-mono text-[10px] tracking-[0.1em] uppercase sm:text-[11px]",
          tone === "dark" ? "text-dune-500" : "text-ink-300",
        )}
        aria-hidden="true"
      >
        img · {label}
      </span>
    </div>
  );
}

/** Standard page gutter — 1180px max width, 32px desktop gutters. */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1180px] px-5 sm:px-8", className)}>
      {children}
    </div>
  );
}

/** Wraps page content so every route gets the comp's fade-up entrance. */
export function PageFade({ children }: { children: ReactNode }) {
  return <div className="animate-fade-up">{children}</div>;
}
