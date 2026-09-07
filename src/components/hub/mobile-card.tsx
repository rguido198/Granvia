import type { ReactNode } from "react";

/**
 * Shared card-list presentation for every console table's mobile view
 * (<640px, Tailwind's `sm` breakpoint) — root claude.md's mobile-audit ask:
 * the existing pattern for a table too wide for a phone was `overflow-x-auto`
 * on a `min-w-[…px]` fixed table (see landlord-dashboard.tsx's own comments
 * on the Rent Roll and Legal/Expedientes tables), which just moves the
 * cutoff into a horizontal scroll instead of removing it. Ramp's pattern —
 * and this one — collapses each row into a stacked card instead: identity +
 * primary metric up top, secondary fields in a compact 2-column grid,
 * actions as a full-width row at the bottom. No horizontal scroll at all.
 *
 * Deliberately just the visual shell, not a generic <ResponsiveTable> that
 * tries to derive cards from column definitions — every table here has its
 * own field set and per-row logic (editable cells, status badges, nested
 * conditionals), so each caller still writes its own row → card mapping;
 * this only standardizes how that card looks once written.
 *
 * The desktop `<table>` markup is untouched everywhere this is used — each
 * table's wrapping element gets `hidden sm:block` (or `sm:table-row` for a
 * bare `<tr>`) so the two views never render at the same time, and this
 * list renders as a sibling, not nested inside the table itself (a `<tbody>`
 * can't validly contain anything but `<tr>`).
 */
export function MobileCardList({ children }: { children: ReactNode }) {
  return <div className="sm:hidden space-y-2.5">{children}</div>;
}

export function MobileCard({
  title,
  subtitle,
  badge,
  primaryLabel,
  primaryValue,
  primaryValueCls = "text-ink",
  fields,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Top-right status pill — same badge component/classes the desktop
   *  table already uses for this row, passed through as-is. */
  badge?: ReactNode;
  primaryLabel?: string;
  /** The one number this card is organized around (rent, cost, total) —
   *  omit for a card with no single headline figure. */
  primaryValue?: ReactNode;
  primaryValueCls?: string;
  /** Secondary fields, rendered as a 2-column label/value grid — pass
   *  `<MobileCardField>` elements. Omit or pass an empty array for a card
   *  with nothing below the header. */
  fields?: ReactNode;
  /** Full-width action row at the bottom — same buttons/links the desktop
   *  row's actions column already has. */
  actions?: ReactNode;
}) {
  return (
    <div className="bg-white border border-hairline rounded-xl p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Wraps rather than truncates — a cut-off legal entity name
              ("COMERCIALIZADORA DULCE...") is actively misleading in a way
              a slightly taller card isn't. Capped at 2 lines; subtitle
              still truncates since it's supplementary, not the identity
              itself. */}
          <p className="font-bold text-ink text-sm line-clamp-2">{title}</p>
          {subtitle && <p className="text-xs text-ink-500 font-medium truncate">{subtitle}</p>}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {primaryValue !== undefined && (
        <div>
          {primaryLabel && <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{primaryLabel}</p>}
          <p className={`text-lg font-extrabold ${primaryValueCls}`}>{primaryValue}</p>
        </div>
      )}

      {fields && <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-hairline pt-2.5">{fields}</div>}

      {actions && (
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-hairline">{actions}</div>
      )}
    </div>
  );
}

export function MobileCardField({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: ReactNode;
  /** Spans both columns of the fields grid — for a value too long to share
   *  a row (a ticket's report text, a clause body). */
  fullWidth?: boolean;
}) {
  return (
    <div className={`min-w-0 ${fullWidth ? "col-span-2" : ""}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{label}</p>
      <p className={`text-xs font-semibold text-ink-700 mt-0.5 ${fullWidth ? "" : "truncate"}`}>{value}</p>
    </div>
  );
}

/** Empty-state row for a MobileCardList — same copy the table's own
 *  <td colSpan> empty row already shows, so the two views never disagree
 *  on what "nothing here" means. */
export function MobileCardEmpty({ children }: { children: ReactNode }) {
  return <p className="text-xs text-ink-500 font-medium text-center py-6 bg-white border border-hairline rounded-xl">{children}</p>;
}
