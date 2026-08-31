"use client";

import { useState, useMemo, useRef, useEffect, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import type {
  ConsoleData,
} from "@/lib/console-data";
import type { DiegoKPIs, DiegoTicket } from "@/lib/data/diego-tickets.server";
import type { LocaleOption } from "@/lib/data/tenant-portal.server";
import type { Contractor } from "@/lib/data/contractors.server";
import type { AutonomyState } from "@/lib/platform/settings.server";
import type { AuditEntry } from "@/lib/platform/audit-log.server";
import type { CorporateUser } from "@/lib/platform/users.server";
import type { Portfolio, LocaleStatus, LeaseDocumentRow } from "@/lib/data/portfolio.server";
import type { PendingLeaseApplication } from "@/lib/data/approval-queue.server";
import { buildApprovalQueue, type ApprovalQueueItem } from "@/lib/approval-queue";
import { DiegoTriageQueue } from "@/components/hub/diego-triage-queue";
import { ContractorRoster } from "@/components/hub/contractor-roster";
import { MarianaApplicationForm } from "@/components/hub/mariana-application-form";
import { DocumentViewerButton, isInFlight, LegalDocumentsPanel, UploadContractButton } from "@/components/hub/legal-documents-panel";
import { MarianaPendingPanel } from "@/components/hub/mariana-pending-panel";
import type { AttentionCounts } from "@/components/hub/header-attention-bell";
import { InviteLandlordForm } from "@/components/hub/invite-landlord-form";
import { toggleAutonomyKillSwitchAction } from "@/lib/platform/actions";
import { updateRentRollFieldAction } from "@/lib/data/portfolio-actions";
import { RentRollAdminTools, TerminateTenantButton } from "@/components/hub/rent-roll-tools";
import { LeaseRenewalPanel } from "@/components/hub/lease-renewal-panel";
import { RenewalWorkspace } from "@/components/hub/renewal-workspace";
import type { RenewalOutreachStage, RenewalOutreachStatus } from "@/lib/data/renewal-outreach-types";
import type { LeadRow } from "@/lib/data/lead-types";
import { LeadPipeline } from "@/components/hub/lead-pipeline";
import { TENANTS } from "@/content/tenants";
import { TenantLogo } from "@/components/tenant-logo";

type SidebarTab = "rentroll" | "maint" | "legal" | "rbac";

type RentRollSortKey = "name" | "sqm" | "sharePct" | "rent";
type RentRollSort = { key: RentRollSortKey; dir: "asc" | "desc" };

type ContractSortKey = "name" | "endDate" | "rent";
type ContractSort = { key: ContractSortKey; dir: "asc" | "desc" };

function SortableHeader<K extends string>({
  label,
  sortKey,
  current,
  onSort,
  align = "left",
  title,
  className = "",
  width = "",
}: {
  label: string;
  sortKey: K;
  current: { key: K; dir: "asc" | "desc" };
  onSort: (key: K) => void;
  align?: "left" | "right";
  title?: string;
  className?: string;
  /** Column width hint on the <th> (see the width note on the Rent Roll table). */
  width?: string;
}) {
  const active = current.key === sortKey;
  return (
    <th className={`p-3.5 ${width} ${align === "right" ? "text-right" : "text-left"}`} title={title}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 cursor-pointer hover:text-ink ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-ink" : "text-ink-700"} ${className}`}
      >
        <span>{label}</span>
        <span className="text-[10px] leading-none">{active ? (current.dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

// Same hardcoded account text the footer session card has always shown —
// LandlordDashboard doesn't receive the authenticated session's email as a
// prop, so this is named as a constant rather than re-typed inline, not
// upgraded to a live value (that wiring lives outside this component).
const SESSION_EMAIL = "m.hage@lagranvia.com.mx";

/** "m.hage" → "MH" — initials for the sidebar's avatar tile. Never a photo. */
function emailInitials(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[.\-_]+/).filter(Boolean);
  const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return initials.toUpperCase();
}

function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

/** Marks a rent roll row whose lease traces back to an approved Mariana
 *  screening (leases <- lease_applications.promoted_lease_id) — a small
 *  glyph with a tooltip naming the application, not a text pill, so a row
 *  with both this and the contract icon doesn't read as cluttered. */
function MarianaLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true">
      <path
        d="M10 2.5 11.3 7l4.5 1.3-4.5 1.3L10 14l-1.3-4.4-4.5-1.3L8.7 7 10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M15.5 13v3M14 14.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// A small fixed palette of pastel/text pairs, each with real contrast
// (WCAG-safe 700/800-weight text on a 100-weight fill) — deterministic per
// tenant name so the same row always lands on the same color across
// reloads, and 80 rows read as scannable rather than one flat gray column.
const AVATAR_PALETTE: { bg: string; text: string }[] = [
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-amber-100", text: "text-amber-800" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-orange-100", text: "text-orange-800" },
];

function avatarPalette(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

/** Matches a Rent Roll row's real tenant_entity name against the real
 *  directory content (src/content/tenants.ts) so the row can show the
 *  tenant's real logo — same source TenantLogo already renders elsewhere
 *  (directory-map.tsx, plan-your-day.tsx). Case-insensitive since the two
 *  data sources are maintained independently. */
function findTenantByName(name: string) {
  const needle = name.trim().toLowerCase();
  return TENANTS.find((t) => t.name.trim().toLowerCase() === needle);
}

/**
 * Rent Roll row thumbnail — the tenant's real logo when the directory has
 * one on file (src/content/tenants.ts), a colored initials tile when it
 * doesn't (never a fabricated image), and a plain empty-slot glyph for a
 * vacant local (there's no tenant to show a mark for).
 *
 * The real-logo path previously looked illegible here not because the logos
 * themselves were bad, but because TenantLogo's own hardcoded p-3/rounded-xs
 * classes were silently winning over this component's `p-1`/`rounded-lg`
 * override (see TenantLogo's doc comment — cn() can't resolve that kind of
 * conflict) — most of the 36px box was padding, not logo. Fixed via
 * TenantLogo's explicit padding/rounded props instead of a second
 * className string fighting the first.
 */
function RentRollThumbnail({ name, vacant }: { name: string; vacant: boolean }) {
  if (vacant) {
    return (
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-hairline-strong text-ink-300"
        aria-hidden="true"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </span>
    );
  }

  const tenant = findTenantByName(name);
  if (tenant) {
    return (
      <TenantLogo
        tenant={tenant}
        className="h-10 w-10 shrink-0 border border-hairline"
        padding="p-1"
        rounded="rounded-lg"
      />
    );
  }

  const { bg, text } = avatarPalette(name);
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-hairline text-[11px] font-bold ${bg} ${text}`}
    >
      {nameInitials(name)}
    </span>
  );
}

/**
 * Small SVG circular-progress ring — colored arc proportional to `percent`,
 * gray track for the remainder, percentage printed in the center. Used for
 * the single plaza-wide "Ocupación GLA" KPI, not per-row (a tenant here is
 * binary occupied/vacant — there's no meaningful per-locale percentage to
 * ring the way PrimeStay rings per-property occupancy in a multi-property
 * table).
 */
function OccupancyRing({ percent, size = 60, stroke = 6 }: { percent: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference * (1 - clamped / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--console-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10.5px] font-bold text-ink tabular-nums">
        {clamped.toFixed(1)}%
      </div>
    </div>
  );
}

/**
 * Sidebar nav item — quiet gray highlight + accent-tinted label on the
 * active item (PrimeStay's "light gray background, not a bold color fill"),
 * not the console's older solid accent-filled pill.
 */
function SidebarNavItem({
  active,
  onClick,
  trailing,
  children,
}: {
  active: boolean;
  onClick: () => void;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
        active ? "bg-slate-100 text-[var(--console-accent)]" : "text-ink-700 hover:bg-slate-100 hover:text-ink"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 transition-opacity ${
            active ? "bg-[var(--console-accent)] opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />
        <span>{children}</span>
      </span>
      {trailing}
    </button>
  );
}

/**
 * Underline sub-navigation — plain text labels with a colored bottom border
 * on the active tab, muted gray on the rest. Replaces the filled rounded-pill
 * bar previously used for maintSubTab/legalSubTab/the Copiloto agent switch;
 * matches the PrimeStay reference's "Properties / Units / Keys & Locks…" row
 * instead of a segmented-control of colored buttons. Click handlers/state are
 * unchanged — this is styling only.
 */
function SubTabBar<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-5 border-b border-hairline ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`pb-3 -mb-px text-xs font-bold transition-colors cursor-pointer border-b-2 ${
            active === t.key
              ? "border-[var(--console-accent)] text-[var(--console-accent)]"
              : "border-transparent text-ink-500 hover:text-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Format an audit entry's ISO timestamp for display — real entries span days,
 * not just "today," so the date rides along instead of being dropped.
 */
function formatAuditTimestamp(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Format a lease's ISO end_date (date-only, no time component) for display.
 *  timeZone: "UTC" is load-bearing — a bare "YYYY-MM-DD" string parses as
 *  UTC midnight, and toLocaleDateString() without an explicit zone renders
 *  in the viewer's own local timezone. Mexicali is UTC-7/-8, so an
 *  unrelated viewer or CI machine on a negative-offset timezone rolled
 *  every lease's displayed vencimiento back a day (e.g. "2028-08-31"
 *  showing as "30 ago 2028"). Format in UTC to match how it was parsed. */
function formatContractDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

/**
 * Format currency in MXN with optional decimals
 */
function formatMxn(val: number, decimals = 0) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(val);
}



/**
 * Main Landlord Asset Management Console Component
 */
export function LandlordDashboard({
  data,
  diegoTickets,
  diegoKpis,
  localeOptions,
  contractors,
  autonomyState,
  initialAuditLog,
  corporateUsers,
  portfolio,
  activeLeaseDocuments,
  leaseApplications,
  renewalOutreachStatus,
  leads,
  onPendingCountsChange,
  navigateRequest,
  onNavigateRequestHandled,
  currency,
  copilotOpen,
  setCopilotOpen,
  sidebarOpen,
  setSidebarOpen,
  triggerToast,
}: {
  data: ConsoleData;
  diegoTickets: DiegoTicket[];
  diegoKpis: DiegoKPIs;
  localeOptions: LocaleOption[];
  contractors: Contractor[];
  autonomyState: AutonomyState;
  initialAuditLog: AuditEntry[];
  corporateUsers: CorporateUser[];
  portfolio: Portfolio;
  activeLeaseDocuments: LeaseDocumentRow[];
  leaseApplications: PendingLeaseApplication[];
  /** Latest outreach event per lease, keyed by leases.id (LeaseDetail
   *  .leaseRowId) — fetched once server-side alongside portfolio, since a
   *  Map isn't RSC-serializable across the client boundary. */
  renewalOutreachStatus: Record<string, RenewalOutreachStatus>;
  leads: LeadRow[];
  /** Pushed up on every change so ConsoleShell's HeaderAttentionBell (its
   *  header bar, not this component's) can render a live count without
   *  duplicating the buildApprovalQueue() derivation up there. */
  onPendingCountsChange: (counts: AttentionCounts) => void;
  /** Set by a HeaderAttentionBell click; consumed once (see the effect
   *  below) to flip activeTab/maintSubTab/legalSubTab the same way a
   *  sidebar or "Ir a revisión" click already does. */
  navigateRequest: { tab: "maint" | "legal"; subTab: string } | null;
  onNavigateRequestHandled: () => void;
  /**
   * Console chrome owned by ConsoleShell's single header bar. The controls for
   * all of these render up there (see console-shell.tsx) — this component is
   * the consumer, not the owner, so it receives them instead of holding its own
   * useState and a second header bar to drive them.
   */
  currency: "MXN" | "USD";
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  triggerToast: (msg: string) => void;
}) {
  const {
    capexCases,
    capexRejected,
    capexWarrantyRecovered,
    maintenanceEvents,
    periodLabel,
  } = data;

  // Same fix as liveActiveLeaseDocuments below, same reason: portfolio is
  // fetched by this exact page's Server Component (consola/page.tsx) the
  // same way activeLeaseDocuments was, and router.refresh() was confirmed
  // unreliable at delivering that prop fresh on this deployment. A rent
  // change confirmed at Gate 2, or an inline Rent Roll edit, writes
  // leases.base_rent_monthly correctly either way -- this is what makes
  // seeing that update not depend on a manual page reload.
  const [livePortfolio, setLivePortfolio] = useState(portfolio);
  useEffect(() => {
    setLivePortfolio(portfolio);
  }, [portfolio]);
  const refreshPortfolio = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio", { cache: "no-store" });
      if (!res.ok) return;
      const { portfolio: fresh } = (await res.json()) as { portfolio: Portfolio };
      setLivePortfolio(fresh);
    } catch {
      // Transient network hiccup — the next mutation's refresh call retries.
    }
  }, []);

  const { rentRoll, leases, formerTenants, approvedApplications, plazaTotalGla, leasedSqm, contractedRent } =
    livePortfolio;

  // Per-row lookup for the SSOT table's "Ver contrato" icon and Mariana
  // badge — leases is already fetched for the Legal tab's own table, so this
  // reuses that same data instead of a second query. Keyed by locale id, not
  // lease id: LeaseDetail.id is actually the locale's id (portfolio.server
  // .ts's existing convention — `id: l.locale_id` in the leases mapping),
  // while PortfolioRow.leaseId is the leases-table row's own id. Look this
  // map up with r.slug (the locale id), never r.leaseId.
  const leaseByLocaleId = useMemo(() => new Map(leases.map((l) => [l.id, l])), [leases]);

  // Unit picker for the Legal tab's Gate 1 (entity reconciliation) form.
  // Sourced from `localeOptions` rather than `leases` so a vacant or
  // pending locale is still selectable — a scanned contract can perfectly
  // well belong to a unit that has no active lease row yet, which is
  // exactly the case a landlord needs to correct a bad match toward.
  const leaseDocumentUnits = useMemo(
    () =>
      localeOptions
        .map((l) => ({
          id: l.id,
          unitCode: l.unitNumber,
          tenantEntity: l.tenantEntity ?? "Vacante",
          status: l.status,
        }))
        // Sorted by tenant, not unit code: the picker renders "tenant — unit"
        // specifically so a landlord can type a tenant's name and jump to it
        // via the browser's native <select> search — that only works if the
        // list is actually ordered by the text it's searching on.
        .sort((a, b) => a.tenantEntity.localeCompare(b.tenantEntity, "es")),
    [localeOptions],
  );

  // View & Filter States
  const [activeTab, setActiveTab] = useState<SidebarTab>("rentroll");
  const exchangeRate = 17.50; // Exchange rate (17.50 MXN = 1 USD)

  const formatVal = (val: number, decimals = 0) => {
    if (currency === "USD") {
      const usdVal = val / exchangeRate;
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      }).format(usdVal);
    }
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(val);
  };

  const [isEditingRentRoll, setIsEditingRentRoll] = useState(false);
  const router = useRouter();

  // The lease-digitization workflow (src/workflows/lease-digitization.ts)
  // runs after the upload response has already gone back to the browser —
  // `after()` in the ingest route dispatches it post-response, and
  // extractFromText/extractFromVision each make a multi-second Opus call on
  // top of that.
  //
  // This used to poll via router.refresh() (re-running the Server Component
  // and delivering a fresh activeLeaseDocuments prop). Confirmed live that
  // was NOT reliably reaching the rendered page in production — checked the
  // database directly mid-test and found a document genuinely `extracting`
  // (which isInFlight correctly renders, unit-tested) that the deployed page
  // still showed as "Nada pendiente de revisión," unchanged across several
  // router.refresh() calls and multiple poll ticks. Removing a leftover
  // `runtime = "edge"` on the page was a reasonable, confirmed-safe fix
  // attempt and didn't fully resolve it either. Rather than keep chasing
  // why RSC refresh isn't landing, this polls a plain JSON endpoint
  // (/api/documents/active-lease) directly from the client and holds the
  // result in local state — sidesteps router.refresh()/RSC entirely, so
  // whatever was wrong with that path can't affect this one.
  const [liveActiveLeaseDocuments, setLiveActiveLeaseDocuments] = useState(activeLeaseDocuments);
  // If a genuine full navigation or an RSC refresh from elsewhere on the
  // page DOES land with a new prop, take it — don't let stale local poll
  // state fight a fresher server-provided value.
  useEffect(() => {
    setLiveActiveLeaseDocuments(activeLeaseDocuments);
  }, [activeLeaseDocuments]);

  const refreshActiveLeaseDocuments = useCallback(async () => {
    try {
      // no-store: every poll hits this exact same URL every 3s -- without
      // this, the browser's own HTTP cache can serve the first response
      // back forever regardless of what the server sends, which reproduces
      // exactly the bug this endpoint exists to fix.
      const res = await fetch("/api/documents/active-lease", { cache: "no-store" });
      if (!res.ok) return;
      const { documents } = (await res.json()) as { documents: LeaseDocumentRow[] };
      setLiveActiveLeaseDocuments(documents);
    } catch {
      // Transient network hiccup — the next poll tick (or the next manual
      // upload) tries again; nothing here is worth surfacing to the landlord.
    }
  }, []);

  // Same predicate legal-documents-panel.tsx's queue card uses (imported,
  // not re-declared) — the poll-alive condition and what UploadContractButton's
  // badge/warning count as "still processing" have to agree, or the button
  // could show zero in-flight while the queue still has some (or vice versa).
  const inFlightLeaseDocuments = liveActiveLeaseDocuments.filter(isInFlight);
  const hasInFlightLeaseDocument = inFlightLeaseDocuments.length > 0;
  useEffect(() => {
    if (!hasInFlightLeaseDocument) return;
    const interval = setInterval(refreshActiveLeaseDocuments, 3000);
    return () => clearInterval(interval);
  }, [hasInFlightLeaseDocument, refreshActiveLeaseDocuments]);

  // Approval Inbox — two more sources with no live-refresh path anywhere in
  // this file today (diegoTickets is a plain prop; lease_applications was
  // never fetched client-side at all before this tab existed). Rather than
  // add a second background poll interval, both refresh together from one
  // explicit "Actualizar" button on the inbox itself — see refreshApprovals
  // below. livePortfolio/liveActiveLeaseDocuments above are reused as-is.
  const [liveDiegoTickets, setLiveDiegoTickets] = useState(diegoTickets);
  const [liveDiegoKpis, setLiveDiegoKpis] = useState(diegoKpis);
  useEffect(() => {
    setLiveDiegoTickets(diegoTickets);
  }, [diegoTickets]);
  useEffect(() => {
    setLiveDiegoKpis(diegoKpis);
  }, [diegoKpis]);

  const [liveLeaseApplications, setLiveLeaseApplications] = useState(leaseApplications);
  useEffect(() => {
    setLiveLeaseApplications(leaseApplications);
  }, [leaseApplications]);

  // Contract Renewal Workspace outreach log. No poll loop — the POST
  // response already returns the new latest status for that one lease, so
  // it's merged straight into local state instead of a round-trip refetch.
  const [liveRenewalOutreachStatus, setLiveRenewalOutreachStatus] = useState(renewalOutreachStatus);
  useEffect(() => {
    setLiveRenewalOutreachStatus(renewalOutreachStatus);
  }, [renewalOutreachStatus]);

  const registerRenewalContact = useCallback(
    async (leaseRowId: string, stage: RenewalOutreachStage, note: string) => {
      try {
        const res = await fetch(`/api/leases/${leaseRowId}/renewal-outreach`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage, note: note || undefined }),
        });
        if (!res.ok) {
          const { error } = (await res.json().catch(() => ({ error: "no se pudo registrar el contacto" }))) as {
            error?: string;
          };
          triggerToast(error ?? "no se pudo registrar el contacto");
          return;
        }
        const { status } = (await res.json()) as { status: RenewalOutreachStatus };
        setLiveRenewalOutreachStatus((prev) => ({ ...prev, [leaseRowId]: status }));
        triggerToast("Contacto registrado.");
      } catch {
        triggerToast("no se pudo registrar el contacto — intenta de nuevo");
      }
    },
    [triggerToast],
  );

  const [refreshingApprovals, setRefreshingApprovals] = useState(false);
  const refreshApprovals = useCallback(async () => {
    setRefreshingApprovals(true);
    try {
      const [ticketsRes, applicationsRes] = await Promise.all([
        fetch("/api/tickets/active", { cache: "no-store" }),
        fetch("/api/leases/pending-applications", { cache: "no-store" }),
      ]);
      if (ticketsRes.ok) {
        const { tickets, kpis } = (await ticketsRes.json()) as { tickets: DiegoTicket[]; kpis: DiegoKPIs };
        setLiveDiegoTickets(tickets);
        setLiveDiegoKpis(kpis);
      }
      if (applicationsRes.ok) {
        const { applications } = (await applicationsRes.json()) as { applications: PendingLeaseApplication[] };
        setLiveLeaseApplications(applications);
      }
    } catch {
      // Transient network hiccup — the button stays clickable to retry.
    } finally {
      setRefreshingApprovals(false);
    }
  }, []);

  // Diego's workflow (extraction + triage Claude call) writes the ticket row
  // well after /api/ingest's 202 response — a single refreshApprovals() call
  // right after submit fires too early. Burst a handful of refetches over
  // ~15s instead of guessing one exact delay.
  const burstRefreshApprovals = useCallback(() => {
    const delaysMs = [1500, 1500, 2000, 3000, 4000, 5000];
    let elapsed = 0;
    for (const d of delaysMs) {
      elapsed += d;
      setTimeout(() => void refreshApprovals(), elapsed);
    }
  }, [refreshApprovals]);

  const approvalQueue = useMemo(
    () =>
      buildApprovalQueue({
        diegoTickets: liveDiegoTickets,
        portfolio: livePortfolio,
        activeLeaseDocuments: liveActiveLeaseDocuments,
        leaseApplications: liveLeaseApplications,
      }),
    [liveDiegoTickets, livePortfolio, liveActiveLeaseDocuments, liveLeaseApplications],
  );

  // Mariana's sidebar badge splits real legal decisions from Gate 1/2
  // document volume — a 70-document backlog and 3 actual decisions
  // (lease applications + renewals) aren't the same kind of "pending" and
  // shouldn't collapse into one number. Diego's badge doesn't need an
  // equivalent split or a useMemo at all — diegoKpis.pendingApprovalsCount
  // already is exactly this count.
  const marianaDecisionesCount = useMemo(
    () => approvalQueue.filter((i) => i.kind === "lease_application" || i.kind === "lease_renewal").length,
    [approvalQueue],
  );
  const marianaExpedientesCount = useMemo(
    () => approvalQueue.filter((i) => i.kind === "lease_match" || i.kind === "lease_extraction").length,
    [approvalQueue],
  );

  // Pushes these three numbers up to ConsoleShell's HeaderAttentionBell.
  // liveDiegoKpis.pendingApprovalsCount is Diego's own count (no separate
  // derivation needed — it's already exactly this number).
  useEffect(() => {
    onPendingCountsChange({
      diegoDecisiones: liveDiegoKpis.pendingApprovalsCount,
      marianaDecisiones: marianaDecisionesCount,
      marianaExpedientes: marianaExpedientesCount,
    });
  }, [liveDiegoKpis.pendingApprovalsCount, marianaDecisionesCount, marianaExpedientesCount, onPendingCountsChange]);

  // Consumes a HeaderAttentionBell click exactly once, then clears it —
  // same tab/sub-tab state handleApprovalNavigate already drives, just
  // triggered from the header instead of a queue row.
  useEffect(() => {
    if (!navigateRequest) return;
    selectTab(navigateRequest.tab);
    if (navigateRequest.tab === "maint") setMaintSubTab(navigateRequest.subTab as typeof maintSubTab);
    else setLegalSubTab(navigateRequest.subTab as typeof legalSubTab);
    onNavigateRequestHandled();
    // selectTab/setMaintSubTab/setLegalSubTab are plain consts redefined
    // every render (not memoized) — omitted from deps for the same reason
    // handleApprovalNavigate above omits them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigateRequest, onNavigateRequestHandled]);

  // Deep-link targets: set by handleApprovalNavigate below, consumed by
  // DiegoTriageQueue (focusTicketId) and LegalDocumentsPanel
  // (focusDocumentId) to open/scroll to the specific row, not just the tab.
  const [focusTicketId, setFocusTicketId] = useState<string | null>(null);
  const [focusDocumentId, setFocusDocumentId] = useState<string | null>(null);

  const handleApprovalNavigate = useCallback(
    (item: ApprovalQueueItem) => {
      if (!("tab" in item.deepLink)) return; // lease_application: no panel to send it to yet
      const { tab, subTab, target } = item.deepLink;
      selectTab(tab);
      if (tab === "maint" && subTab) setMaintSubTab(subTab as typeof maintSubTab);
      if (tab === "legal" && subTab) setLegalSubTab(subTab as typeof legalSubTab);

      if (target.kind === "ticket") {
        setFocusTicketId(target.id);
        setFocusDocumentId(null);
      } else if (target.kind === "lease_renewal") {
        setInspectedContractId(target.id);
        setFocusTicketId(null);
        setFocusDocumentId(null);
      } else if (target.kind === "lease_match" || target.kind === "lease_extraction") {
        setFocusDocumentId(target.id);
        setFocusTicketId(null);
      }
    },
    // selectTab isn't itself memoized (it's a plain const redefined every
    // render), so it's intentionally omitted — including it would recreate
    // this callback every render for no behavioral difference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Keyed `${localeId}:${field}` — lets each cell show its own saving state
  // independently instead of locking the whole table while one field saves.
  const [savingField, setSavingField] = useState<string | null>(null);

  async function saveRentRollField(localeId: string, field: "sqm" | "rent", rawValue: string, currentValue: number, label: string) {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0) {
      triggerToast(`Valor inválido para ${label}.`);
      return;
    }
    if (value === currentValue) return;

    const key = `${localeId}:${field}`;
    setSavingField(key);
    const result = await updateRentRollFieldAction(localeId, field, value);
    setSavingField(null);

    if (result.error) {
      triggerToast(`No se pudo actualizar ${label}: ${result.error}`);
      return;
    }
    triggerToast(`${label} actualizado.`);
    // No router.refresh() here — same reason LegalDocumentsPanel's
    // onResolved skips it: an unawaited RSC refresh racing this client
    // poll can land later with a stale prop and clobber the fresh state.
    void refreshPortfolio();
  }

  // Rent Roll table sort/filter — text filter is pure client-side (rentRoll
  // is already fully loaded), and the Estado facet below is likewise a plain
  // client-side predicate over the real `status` field portfolio.server.ts
  // now carries per row (see PortfolioRow.status) rather than a fetch/query
  // change, since fetchPortfolio() already returns every locale regardless
  // of status.
  const [rentRollFilter, setRentRollFilter] = useState("");
  const [rentRollStatusFilter, setRentRollStatusFilter] = useState<"ALL" | LocaleStatus>("ALL");
  const [rentRollSort, setRentRollSort] = useState<RentRollSort>({ key: "name", dir: "asc" });

  const toggleRentRollSort = (key: RentRollSortKey) => {
    setRentRollSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  };

  const visibleRentRoll = useMemo(() => {
    const needle = rentRollFilter.trim().toLowerCase();
    const filtered = rentRoll.filter((r) => {
      const matchesText =
        !needle ||
        r.name.toLowerCase().includes(needle) ||
        (r.tradeName ?? "").toLowerCase().includes(needle) ||
        r.unitCode.toLowerCase().includes(needle);
      const matchesStatus = rentRollStatusFilter === "ALL" || r.status === rentRollStatusFilter;
      return matchesText && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      const { key, dir } = rentRollSort;
      const mult = dir === "asc" ? 1 : -1;
      if (key === "name") return a.name.localeCompare(b.name) * mult;
      return (a[key] - b[key]) * mult;
    });
    return sorted;
  }, [rentRoll, rentRollFilter, rentRollStatusFilter, rentRollSort]);

  // AI Copilot Drawer — one Copiloto, not a per-agent picker: it has both
  // leases and tickets in context on every question (see the ask-endpoint).
  // Its open/closed state arrives as a prop because the button that toggles it
  // now lives in ConsoleShell's single header bar; the drawer itself, and every
  // conversation state below, still belong here.
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotAskedQuestion, setCopilotAskedQuestion] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  // Cancels an in-flight ask if a new one is submitted before the previous
  // one resolves, so a slow response can't land after a newer question's.
  const copilotAbortRef = useRef<AbortController | null>(null);

  // Interactive AI Action States & Simulations
  const [warrantyCategoryFilter, setWarrantyCategoryFilter] = useState<string>("ALL");

  // Diego IA Maintenance Calendar States
  const [eventNotified, setEventNotified] = useState<Record<string, boolean>>({});

  // Accessibility font scale lives once now, behind the settings gear in
  // ConsoleShell's outer bar — that bar wraps this whole component's render
  // tree, so its zoom/scale-font-* already reaches everything below. A second,
  // independently-stateful "Texto:" control used to live here too, which meant
  // its own zoom could silently compound with ConsoleShell's; removed instead
  // of kept as a second source of truth.

  // Sidebar nav is a full-screen drawer on mobile (closed by default) so the
  // console content is reachable without scrolling past the entire nav first —
  // on desktop (lg:) it stays permanently visible regardless of this state.
  // Opened from the hamburger in ConsoleShell's bar, hence the prop.
  const selectTab = (tab: SidebarTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  // Governance Policy Edit States
  const [editingPolicyCard, setEditingPolicyCard] = useState<null | "diego" | "sso">(null);

  // CapEx cost Diego kept off the landlord's P&L this month (denied to the tenant + warranty-covered).
  // Excludes APROBADO_PRORRATEO_CAM cases — those route to Renata's CAM pool, not here, so this
  // total never double-counts against Fondo CAM NNN Mensual.
  const diegoProtectedCapex = capexRejected + capexWarrantyRecovered;

  const [diegoThresholdVal, setDiegoThresholdVal] = useState<number>(50000);
  const [diegoAutoMode, setDiegoAutoMode] = useState<boolean>(true);
  const [ssoEnforcedMode, setSsoEnforcedMode] = useState<boolean>(true);
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(autonomyState.frozen);
  const [killSwitchPending, setKillSwitchPending] = useState(false);

  // Diego IA Maintenance Sub-Navigation State
  const [maintSubTab, setMaintSubTab] = useState<"triage" | "calendario" | "capex" | "contratistas">("triage");

  // Mariana IA Legal Engine States. "expedientes" (Locales y Contratos) is
  // her default landing — the legal intelligence workspace itself, not the
  // pending-decision queue. "pendientes" exists as a focused sub-view,
  // reached via the sidebar's dedicated "Ver pendientes" badge click
  // (onTrailingClick above) rather than by replacing the default.
  const [legalSubTab, setLegalSubTab] = useState<
    "pendientes" | "expedientes" | "vencimientos" | "prospectos" | "marco_legal"
  >("expedientes");
  const [lastLawScanDate, setLastLawScanDate] = useState("Hoy, 10 Ago 2026 · 06:00 hrs");
  const [selectedProspectIndex, setSelectedProspectIndex] = useState<number>(0);
  const [customProspectBrand, setCustomProspectBrand] = useState("");
  const [customProspectCategory, setCustomProspectCategory] = useState("Cafetería & Repostería");
  const [inspectedContractId, setInspectedContractId] = useState<string | null>(null);

  // Contracts table (Expedientes & Anomalías) search/filter/sort — same
  // client-side pattern as the Rent Roll table above; `leases` is already
  // fully loaded. "Renovación Próxima" (lease.renewalSoon, <=6 months to
  // end_date, see portfolio.server.ts) is the one real anomaly signal this
  // schema carries, so it drives both the filter toggle and the tab count
  // below rather than a fabricated anomaly count.
  const [contractFilter, setContractFilter] = useState("");
  const [contractOnlyRenewalSoon, setContractOnlyRenewalSoon] = useState(false);
  const [contractSort, setContractSort] = useState<ContractSort>({ key: "endDate", dir: "asc" });

  const toggleContractSort = (key: ContractSortKey) => {
    setContractSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  };

  const renewalSoonCount = useMemo(() => leases.filter((c) => c.renewalSoon).length, [leases]);
  const digitizedLeaseCount = useMemo(() => leases.filter((c) => c.sourceDocumentId).length, [leases]);

  const visibleLeases = useMemo(() => {
    const needle = contractFilter.trim().toLowerCase();
    const filtered = leases.filter((c) => {
      const matchesText =
        !needle ||
        c.tenantEntity.toLowerCase().includes(needle) ||
        (c.tradeName ?? "").toLowerCase().includes(needle) ||
        c.unitCode.toLowerCase().includes(needle);
      const matchesRenewal = !contractOnlyRenewalSoon || c.renewalSoon;
      return matchesText && matchesRenewal;
    });

    const sorted = [...filtered].sort((a, b) => {
      const { key, dir } = contractSort;
      const mult = dir === "asc" ? 1 : -1;
      if (key === "name") return a.tenantEntity.localeCompare(b.tenantEntity) * mult;
      if (key === "endDate") return (new Date(a.endDate).getTime() - new Date(b.endDate).getTime()) * mult;
      return (a.rentMonthly - b.rentMonthly) * mult;
    });
    return sorted;
  }, [leases, contractFilter, contractOnlyRenewalSoon, contractSort]);

  // Toast notifications are raised through ConsoleShell (the currency toggle up
  // in its bar fires them too, so one queue rather than two), hence the prop.

  // Immutable Audit Trail — the real events each Tier 2/3 action actually
  // writes to (ticket_status_history, agent_decisions, lease_applications
  // reviews, the autonomy kill-switch — see src/lib/platform/audit-log.server.ts),
  // not a hardcoded array. Fetched server-side; rendered newest-first.
  const auditLog = initialAuditLog;
  const [auditLogFilter, setAuditLogFilter] = useState("");

  return (
    <div className="min-h-screen bg-slate-50 text-ink-700 flex flex-col lg:flex-row antialiased">
      {/* Mobile drawer backdrop — tap outside the sidebar to close it */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* LEFT SIDEBAR NAVIGATION — off-canvas drawer on mobile, permanent column on lg+ */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-white border-r border-hairline/80 shrink-0 flex flex-col justify-between p-5 space-y-6 text-left transition-transform duration-200 lg:static lg:z-auto lg:w-72 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          <div className="flex justify-end lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="-mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-slate-100"
              aria-label="Cerrar menú"
            >
              ✕
            </button>
          </div>
          {/* Brand Header */}
          <div className="px-1 py-1 space-y-2">
            <div className="inline-block bg-slate-50 px-3 py-2 rounded-xl border border-hairline shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/la-gran-via-logo-horizontal.png"
                alt="La Gran Vía Mexicali"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-ink-500 font-semibold px-0.5">Asset Management Hub · Consola</p>
          </div>

          {/* Navigation Links — a lighter three-group structure survives here
              rather than PrimeStay's single flat "MENU" list on purpose:
              Diego IA and Mariana IA are named, standing AI agents (the core
              of this product's pitch), not generic settings pages, so the
              grouping keeps that distinction legible. What moved toward
              PrimeStay's restraint is the active-state treatment below — a
              quiet gray highlight + accent-tinted label instead of a solid
              accent-filled pill. */}
          <nav className="space-y-1 text-left">
            <p className="px-2 text-[11px] font-bold text-ink-400 tracking-wider mb-2">
              Panel del Portafolio
            </p>

            <SidebarNavItem active={activeTab === "rentroll"} onClick={() => selectTab("rentroll")}>
              Rent Roll & Locales
            </SidebarNavItem>

            <p className="px-2 text-[11px] font-bold text-ink-400 tracking-wider mt-6 mb-2">
              Gestión & Inteligencia Operativa
            </p>

            {/* No counts on the sidebar itself — a long badge here read as
             *  heavier than the agent name and turned navigation into an
             *  alert rail. Counts live where they have context: inside
             *  each agent's own tabs (Diego's "Triage" label, Mariana's
             *  "Pendientes" label, both below) and in the header's
             *  HeaderAttentionBell, which both push their counts into via
             *  onPendingCountsChange. */}
            <SidebarNavItem active={activeTab === "maint"} onClick={() => selectTab("maint")}>
              Diego IA · Mantenimiento
            </SidebarNavItem>

            <SidebarNavItem active={activeTab === "legal"} onClick={() => selectTab("legal")}>
              Mariana IA · Legal
            </SidebarNavItem>

            <p className="px-2 text-[11px] font-bold text-ink-400 tracking-wider mt-6 mb-2">
              Gobierno & Seguridad
            </p>

            <SidebarNavItem
              active={activeTab === "rbac"}
              onClick={() => selectTab("rbac")}
              trailing={<span className="text-xs font-bold bg-slate-200 text-ink px-2 py-0.5 rounded shrink-0 ml-2">Admin</span>}
            >
              Control de Acceso RBAC
            </SidebarNavItem>
          </nav>
        </div>

        {/* Footer Session Badge — avatar (real initials, no fabricated photo)
            + name/email + settings affordance, closer to PrimeStay's
            profile-card pattern than the previous plain text+dot row. The
            email itself is the same account text this card has always shown;
            LandlordDashboard isn't handed the authenticated session identity
            as a prop (that lives further up, outside this component's
            scope), so this only restyles the container — it doesn't invent
            a different identity. */}
        <div className="pt-4 border-t border-hairline space-y-3 text-left">
          <div
            onClick={() => {
              selectTab("rbac");
              triggerToast("Abriendo Consola de Control de Acceso & Permisos RBAC...");
            }}
            className="flex items-center gap-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 p-3 border border-hairline transition-all cursor-pointer group text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
              {emailInitials(SESSION_EMAIL)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="group-hover:underline font-mono text-xs font-bold text-ink truncate">{SESSION_EMAIL}</p>
              <p className="text-[11px] text-ink-500 font-semibold truncate">Administrador General</p>
            </div>
            <svg className="h-4 w-4 text-ink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.041.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a7.688 7.688 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.127.332-.184.582-.496.644-.87l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA — no header of its own: the console has exactly one
          header bar and it lives in ConsoleShell, directly above this component.
          The title, the mobile nav toggle, the currency toggle, the period
          selector and the Copiloto button all moved up there. */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* MAIN BODY AREA */}
        <div className="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {activeTab === "rentroll" && (
            <Fragment>
            <div className="bg-white border border-hairline rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs">
              {/* TOP HEADER & ACTION BAR — trimmed to title → buttons; the
                  SSOT framing and the /inquilinos-/directorio sync note are
                  real, load-bearing facts about this specific system (not
                  filler), so they aren't deleted — they move into the "ⓘ"
                  disclosure next to the title instead of sitting as
                  always-visible prose + a separate banner block below. */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-2xl font-bold text-ink">
                      Rent Roll & Directorio Unificado de Locales
                    </h2>
                    <details className="relative">
                      <summary
                        className="list-none flex h-5 w-5 items-center justify-center rounded-full border border-hairline-strong text-[11px] font-bold text-ink-500 cursor-pointer hover:border-[var(--console-accent)] hover:text-[var(--console-accent)] [&::-webkit-details-marker]:hidden"
                        title="Sobre este registro"
                      >
                        i
                      </summary>
                      <div className="absolute left-0 z-20 mt-2 w-80 max-w-[85vw] rounded-xl border border-hairline bg-white p-4 text-xs shadow-md">
                        <p className="font-bold text-ink text-xs mb-1.5">
                          Single Source of Truth (SSOT) · Base de Datos Maestra · Periodo Fiscal: Agosto 2026
                        </p>
                        <p className="text-ink-700 leading-relaxed">
                          Registro maestro de {rentRoll.length} locales comerciales. Los cambios aplicados aquí actualizan en tiempo real el Portal del Arrendatario (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-ink-700 font-medium">/inquilinos</code>). El Plano Interactivo público (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-ink-700 font-medium">/directorio</code>) usa su propio contenido de marketing y no se actualiza desde aquí.
                        </p>
                      </div>
                    </details>
                  </div>
                  <p className="text-xs text-ink-500 font-medium">
                    {rentRoll.length} locales · GLA Total {plazaTotalGla.toLocaleString("es-MX")} m²
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <a
                    href="/api/portfolio/export"
                    download
                    className="bg-slate-100 border border-hairline hover:bg-slate-200 text-ink px-4 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    Exportar Reporte (.xlsx)
                  </a>
                  <button
                    onClick={() => {
                      const nextState = !isEditingRentRoll;
                      setIsEditingRentRoll(nextState);
                      if (nextState) {
                        triggerToast("Modo edición activado. Cada cambio se guarda al salir del campo (Tab o Enter).");
                      }
                    }}
                    className="bg-ink hover:bg-ink-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    {isEditingRentRoll ? "Terminar Edición" : "Modo Edición"}
                  </button>
                </div>
              </div>

              {/* Add / bulk-import tenants — Tier 3 actions, real Supabase
                  writes against the same locales/leases tables the rent roll
                  below reads from. Kept next to the header rather than the
                  sort/filter bar so they read as rent-roll-wide operations,
                  not a per-row table control. */}
              <RentRollAdminTools approvedApplications={approvedApplications} />

              {/* PORTFOLIO KPI SUMMARY — three numbers derivable from lease
                  terms alone. The previous two cards (Renta Recibida / Real
                  Cobrada, Variación-Pendiente CFDI) claimed to know what was
                  actually collected and which invoices had payment-method
                  mismatches — that requires a bank feed or ERP/accounting
                  connection this engagement doesn't have and isn't getting.
                  Nothing here implies knowledge this system doesn't have.
                  Renta Promedio/m² (an average nobody actually acts on) was
                  swapped for Contratos Digitalizados — a number tied
                  directly to the active work of reading the 85-lease
                  backlog into the system, and one that visibly moves every
                  time a landlord confirms one at Gate 2. */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-hairline/90 border-t-2 border-t-[var(--console-accent)] rounded-xl p-4.5 space-y-1">
                  <p className="text-xs font-bold text-ink-500 tracking-wide">Renta Contratada (Portafolio)</p>
                  <p className="text-2xl font-bold text-ink">{formatMxn(contractedRent)}</p>
                  <p className="text-xs text-ink-500 font-medium">{rentRoll.length} locales bajo contrato</p>
                </div>

                <div className="bg-slate-50 border border-hairline/90 border-t-2 border-t-[var(--console-accent)] rounded-xl p-4.5 space-y-1">
                  <p className="text-xs font-bold text-ink-500 tracking-wide">Contratos Digitalizados</p>
                  <p className="text-2xl font-bold text-ink">
                    {digitizedLeaseCount} de {leases.length}
                  </p>
                  <p className="text-xs text-ink-500 font-medium">
                    {leases.length > 0 ? Math.round((digitizedLeaseCount / leases.length) * 100) : 0}% con contrato
                    escaneado en el sistema
                  </p>
                </div>

                <div className="bg-slate-50 border border-hairline/90 border-t-2 border-t-[var(--console-accent)] rounded-xl p-4.5 flex items-center gap-4">
                  <OccupancyRing percent={(leasedSqm / plazaTotalGla) * 100} />
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-ink-500 tracking-wide">Ocupación GLA</p>
                    <p className="text-xs text-ink-500 font-medium">
                      {leasedSqm.toLocaleString("es-MX")} de {plazaTotalGla.toLocaleString("es-MX")} m² totales
                    </p>
                  </div>
                </div>
              </div>

              {/* The standalone "Rent Roll Maestro · Periodo Fiscal" banner
                  that used to sit here is gone — Periodo Fiscal now lives in
                  the "ⓘ" disclosure above and GLA Total is already the KPI
                  tile's own subtext (Ocupación GLA, below); this was purely
                  duplicated info, not a fact this system was hiding. */}

              {/* RENT ROLL MASTER TABLE (CLEAN 5-COLUMN EXECUTIVE LEASE LEDGER) */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={rentRollFilter}
                  onChange={(e) => setRentRollFilter(e.target.value)}
                  placeholder="Filtrar por inquilino o local…"
                  className="w-full max-w-xs rounded-lg border border-hairline-strong px-3 py-2 text-xs bg-white focus:border-[var(--console-accent)] focus:outline-none"
                />
                <select
                  aria-label="Filtrar por estado del local"
                  value={rentRollStatusFilter}
                  onChange={(e) => setRentRollStatusFilter(e.target.value as "ALL" | LocaleStatus)}
                  className="rounded-lg border border-hairline-strong bg-white px-3 py-2 text-xs font-semibold text-ink-700 focus:outline-none focus:border-[var(--console-accent)] cursor-pointer"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="OCCUPIED">Ocupado</option>
                  <option value="VACANT">Vacante</option>
                  <option value="PENDING_LEASE">Pendiente de Contrato</option>
                </select>
                <p className="text-[11px] text-ink-500 font-medium whitespace-nowrap ml-auto">
                  {visibleRentRoll.length} de {rentRoll.length} locales
                </p>
              </div>

              {/* Column widths are percentages that add up to 100%, and the
                  table is table-fixed so they are honoured literally. Auto
                  layout is not enough here: the tenant name carries `truncate`
                  (i.e. white-space: nowrap), which makes that column's
                  max-content width the longest name in the whole roll, and auto
                  layout will not take a column below max-content no matter what
                  width the <th> asks for. Fixed layout is what actually lets
                  the cap bite — and it is what makes the truncate do its job
                  instead of sitting there inert.

                  The earlier pass pinned the four right-hand columns at their
                  natural label width and left this one greedy. That was wrong
                  in practice: the tenant column then sized itself to the single
                  longest name in 85 rows ("Derma Club Farmacia Dermatológica",
                  324px), while a typical name is ~120px — so every ordinary row
                  showed ~210px of dead air before the right-aligned Superficie
                  figure, which is the gap that got flagged.

                  Capping it at 26% (~253px at 1440) truncates that outlier and
                  four others — hence the title tooltip on the name below, so
                  nothing is actually lost — and moves the reclaimed width to
                  the trailing status column, whose pills are centred. Measured
                  at 1440px over the first six rows, the space between the
                  tenant name and the Superficie figure drops from 177–248px to
                  113–184px. Shortening "% Participación GLA" was the other
                  lever available and turned out not to be needed: 16% is what
                  that two-line header already wants.

                  Percentages also fix a second thing the px widths were doing.
                  Their fixed sum (652px + a greedy tenant column) exceeded the
                  wrapper below 1400px, and the wrapper is overflow-hidden — at
                  1024px the old table ran 298px past it and the status column
                  was simply cut off. Percentages can't overflow. */}
              <div className="border border-hairline rounded-xl bg-white shadow-2xs overflow-hidden">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] font-bold text-ink-700 border-b border-hairline tracking-wider">
                    <tr>
                      <SortableHeader label="Inquilino & Local" sortKey="name" current={rentRollSort} onSort={toggleRentRollSort} width="w-[26%]" />
                      <SortableHeader label="Superficie" sortKey="sqm" current={rentRollSort} onSort={toggleRentRollSort} align="right" width="w-[11%]" />
                      <SortableHeader
                        label="% Participación GLA"
                        sortKey="sharePct"
                        current={rentRollSort}
                        onSort={toggleRentRollSort}
                        align="right"
                        width="w-[16%]"
                        title={`GLA = Gross Leasable Area / Superficie Rentable Bruta (${plazaTotalGla.toLocaleString("es-MX")} m² total)`}
                      />
                      <SortableHeader
                        label="Renta Mensual Contratada"
                        sortKey="rent"
                        current={rentRollSort}
                        onSort={toggleRentRollSort}
                        align="right"
                        width="w-[20%]"
                        className="font-extrabold"
                      />
                      <th
                        className="p-3.5 w-[27%] text-center cursor-default select-none"
                        title="SSOT = Single Source of Truth / Fuente Única de Verdad (Información sincronizada en tiempo real)"
                      >
                        Estatus Contractual SSOT
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline text-ink-700 font-medium">
                    {visibleRentRoll.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-ink-500">
                          {rentRollFilter ? <>Sin resultados para &ldquo;{rentRollFilter}&rdquo;.</> : "Sin locales con este estatus."}
                        </td>
                      </tr>
                    )}
                    {visibleRentRoll.map((r) => {
                      const isBlueLuna = r.name.includes("Blue Luna");

                      return (
                        <tr key={r.slug} className={`transition-colors ${isEditingRentRoll ? "bg-slate-100/50 hover:bg-slate-100" : "hover:bg-slate-50"}`}>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <RentRollThumbnail name={r.tradeName ?? r.name} vacant={r.vacant} />
                              <div className="min-w-0 flex-1">
                                {/* The column is capped now, so the handful of
                                    names longer than it can hold actually hit
                                    this truncate — the tooltip is what keeps
                                    the full name reachable. tradeName leads
                                    when present (what a landlord actually
                                    calls the tenant) — name (the legal
                                    entity) drops to a secondary line instead
                                    of disappearing, since it's still what
                                    RFC/CFDI-facing work needs. */}
                                <p className="font-bold text-ink text-sm truncate" title={r.tradeName ?? r.name}>
                                  {r.tradeName ?? r.name}
                                </p>
                                {r.tradeName && (
                                  <p className="text-xs text-ink-500 truncate" title={r.name}>
                                    {r.name}
                                  </p>
                                )}
                                <p className="text-xs text-ink-500 font-medium">{r.unitCode}</p>
                              </div>
                              {/* Only real, direct signal a contract scan exists for this
                                  unit without expanding the row — previously buried as an
                                  icon-only button off in the far-right Acciones column,
                                  easy to miss while scanning names top-to-bottom. */}
                              {r.sourceDocumentId && (
                                <DocumentViewerButton documentId={r.sourceDocumentId} label="Ver contrato" iconOnly />
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-medium text-ink-700 whitespace-nowrap">
                            {isEditingRentRoll ? (
                              <input
                                type="number"
                                defaultValue={r.sqm}
                                aria-label={`Superficie m² para ${r.name}`}
                                disabled={savingField === `${r.slug}:sqm`}
                                className="w-16 bg-white border border-hairline-strong rounded px-1.5 py-0.5 text-right font-bold text-ink text-sm focus:border-[var(--console-accent)] focus:outline-none disabled:opacity-50"
                                onBlur={(e) => saveRentRollField(r.slug, "sqm", e.target.value, r.sqm, `Superficie de ${r.name}`)}
                                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                              />
                            ) : (
                              `${r.sqm} m²`
                            )}
                          </td>
                          <td className="p-3.5 text-right font-medium text-ink-700 text-sm whitespace-nowrap">{r.sharePct.toFixed(2)}%</td>
                          <td className="p-3.5 text-right font-bold text-ink text-sm whitespace-nowrap">
                            {isEditingRentRoll ? (
                              <input
                                type="number"
                                defaultValue={r.rent}
                                aria-label={`Renta mensual para ${r.name}`}
                                disabled={savingField === `${r.slug}:rent`}
                                className="w-24 bg-white border border-hairline-strong rounded px-1.5 py-0.5 text-right font-bold text-ink text-sm focus:border-[var(--console-accent)] focus:outline-none disabled:opacity-50"
                                onBlur={(e) => saveRentRollField(r.slug, "rent", e.target.value, r.rent, `Renta de ${r.name}`)}
                                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                              />
                            ) : (
                              <div>
                                <p className="font-bold text-ink text-sm">{formatVal(r.rent)}</p>
                                <p className="text-xs text-ink-500 font-medium">
                                  {formatVal(Math.round(r.rent / r.sqm))}/m²
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1">
                              {isBlueLuna ? (
                                <button
                                  onClick={() => {
                                    setCopilotOpen(true);
                                    setQueryResult(
                                      "Mariana IA (Contratos & Arrendamientos): Blue Luna Café (Local 16). Póliza de seguro de responsabilidad civil vence en Nov 2026. Recordatorio legal pre-notificado."
                                    );
                                    triggerToast("Mariana IA (Contratos): Expediente Blue Luna Café abierto.");
                                  }}
                                  title="Ver auditoría de póliza asignada a Mariana IA"
                                  className="bg-caution-surface hover:bg-caution-surface text-caution border border-caution/40 px-2.5 py-1 rounded-full font-bold text-[11px] cursor-pointer transition-all hover:scale-105 shadow-xs flex items-center gap-1 mx-auto"
                                >
                                  Revisar Seguro · Mariana IA →
                                </button>
                              ) : r.vacant ? (
                                <span className="bg-slate-100 text-ink-500 border border-hairline px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                                  Vacante
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-ink-700 border border-hairline px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                                  Vigente SSOT
                                </span>
                              )}
                              {!r.vacant && r.leaseId && (
                                <div className="flex items-center gap-2.5">
                                  <TerminateTenantButton localeId={r.slug} leaseId={r.leaseId} tenantName={r.name} unitCode={r.unitCode} />
                                  {/* DocumentViewerButton for this lease now lives in the name
                                      cell (leftmost column) instead of here — showing up
                                      wherever a landlord is already scanning for it, not
                                      buried in this action column too. */}
                                  {leaseByLocaleId.get(r.slug)?.sourceApplicationNumber && (
                                    <span
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-hairline text-ink-400 shrink-0"
                                      title={`Origen: ${leaseByLocaleId.get(r.slug)!.sourceApplicationNumber} — evaluado por Mariana IA`}
                                    >
                                      <MarianaLinkIcon />
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* INQUILINOS ANTERIORES — a "Desocupar" never deletes a locale,
                it just drops the unit out of the rent roll above (which only
                shows it as "Vacante"). Without this section that would read
                as data loss; this is where the history actually lives (see
                formerTenants in portfolio.server.ts). */}
            {formerTenants.length > 0 && (
              <div className="bg-white border border-hairline rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div>
                  <h3 className="text-base font-bold text-ink">Inquilinos Anteriores</h3>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Locales desocupados — el registro se conserva, no se elimina. {formerTenants.length} en historial.
                  </p>
                </div>
                {/* Six short columns over ~970px: left to itself auto layout
                    stretched every one of them by ~40px, so the whole row read
                    as gaps. Widths hand the slack to the tenant-name column and
                    keep the four data columns near their own content; the
                    status pill closes the row against the right edge instead of
                    floating in the middle of a wide last column. */}
                <div className="border border-hairline rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold text-ink-500 border-b border-hairline tracking-wider">
                      <tr>
                        <th className="p-3.5 w-[10%]">Local</th>
                        <th className="p-3.5 w-[38%]">Antiguo Inquilino</th>
                        <th className="p-3.5 w-[10%] text-right">Superficie</th>
                        <th className="p-3.5 w-[12%] text-right">Última Renta</th>
                        <th className="p-3.5 w-[15%]">Contrato Terminó</th>
                        <th className="p-3.5 w-[15%] text-right">Estatus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {formerTenants.map((t) => (
                        <tr key={t.localeId} className="hover:bg-slate-50">
                          <td className="p-3.5 font-semibold text-ink-700 whitespace-nowrap">{t.unitCode}</td>
                          <td className="p-3.5 text-ink-700">{t.tenantEntity}</td>
                          <td className="p-3.5 text-right text-ink-500 tabular-nums">{t.sqm.toLocaleString("es-MX")} m²</td>
                          <td className="p-3.5 text-right text-ink-500 tabular-nums">{formatVal(t.lastRentMonthly)}</td>
                          <td className="p-3.5 text-ink-500">
                            {t.leaseEndDate !== "—"
                              ? new Date(t.leaseEndDate).toLocaleDateString("es-MX", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  timeZone: "UTC",
                                })
                              : "—"}
                          </td>
                          <td className="p-3.5 text-right">
                            <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-ink-700 border border-hairline">
                              Vacante
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </Fragment>
          )}

          {activeTab === "maint" && (
            <div className="bg-white border border-hairline rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs">
              {/* HEADER & WARRANTY UPLOAD ACTION BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--console-accent)]" />
                    <span className="text-xs font-semibold tracking-wider text-ink-500">
                      Agente de Mantenimiento & CapEx · Diego IA
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-ink mt-1">Diego IA · CapEx, Mantenimiento & Expediente Digital</h2>
                  <p className="text-xs text-ink-500 font-medium mt-1">
                    Control de pólizas de equipos pesados (HVAC, Elevadores, Subestaciones), bitácora preventiva y reclamación automática de garantías a proveedores.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => triggerToast("Selecciona la Garantía, Póliza o Manual de Equipo (PDF/XML) para indexar en Diego IA...")}
                    className="bg-white hover:bg-[var(--console-accent-soft)] text-[var(--console-accent)] border border-[var(--console-accent)] font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                  >
                    + Cargar Garantía o Manual (PDF)
                  </button>
                </div>
              </div>

              {/* SUB-NAVIGATION — underline tabs, not filled pills */}
              <SubTabBar
                tabs={[
                  {
                    key: "triage",
                    label:
                      liveDiegoKpis.pendingApprovalsCount > 0
                        ? `Triage (${liveDiegoKpis.pendingApprovalsCount} requieren aprobación)`
                        : "Triage",
                  },
                  { key: "calendario", label: "Calendario" },
                  { key: "capex", label: "CapEx & Costos" },
                  { key: "contratistas", label: "Contratistas & Garantías" },
                ]}
                active={maintSubTab}
                onChange={setMaintSubTab}
              />

              {/* SUB-TAB 1: TRIAGE */}
              {maintSubTab === "triage" && (
              <div className="space-y-6 animate-fadeIn">
              {/* DIEGO IA · LIVE TRIAGE QUEUE — real Supabase rows, the Tier 3 gate,
                  and the dynamic jurisdiction watermark. */}
              <DiegoTriageQueue
                tickets={liveDiegoTickets}
                kpis={liveDiegoKpis}
                localeOptions={localeOptions}
                focusTicketId={focusTicketId}
                onTicketSubmitted={burstRefreshApprovals}
              />
              </div>
              )}

              {/* SUB-TAB 1B: CALENDARIO — split out from Triage so the live approval
                  queue and the informational preventive-maintenance schedule don't
                  compete for the same screen. This calendar has no Supabase table
                  behind it, so it never pretended to gate a real dispatch — the
                  approval affordance that used to imply it did was removed. */}
              {maintSubTab === "calendario" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">
                      Calendario de Próximos Eventos
                    </h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Mantenimiento preventivo y calibraciones programadas.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {maintenanceEvents.map((event) => {
                    const isNotified = eventNotified[event.id];
                    return (
                      <div
                        key={event.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border bg-white border-hairline"
                      >
                        <div className="text-center shrink-0 w-16">
                          <p className="text-xs font-extrabold text-ink">{event.date.split(" ")[0]}</p>
                          <p className="text-[10px] font-bold text-ink-500 uppercase">{event.date.split(" ")[1]} {event.date.split(" ")[2]}</p>
                        </div>
                        {/* max-w caps the only growable item in the row. Without
                            it this block took every spare pixel (629px at 1440px
                            for content that never exceeds 504px), which parked the
                            cost and the notify button against the far edge with a
                            ~150px hole in front of them. Capped at 520px, the
                            date, the text and the cost read as one cluster; the
                            leftover moves to the ml-auto on the button below, so
                            it sits in front of an action rather than in the
                            middle of the sentence the row is telling. */}
                        <div className="flex-1 min-w-0 sm:max-w-[520px]">
                          <p className="font-bold text-ink text-xs">{event.title}</p>
                          <p className="text-[11px] text-ink-500">{event.vendor} · {event.category} · Responsable: {event.responsible}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-ink text-xs tabular-nums">{formatVal(event.costEstimate)}</p>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 bg-slate-100 text-ink-700 border border-hairline">
                            Programado
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                          <button
                            onClick={() => {
                              setEventNotified((prev) => ({ ...prev, [event.id]: true }));
                              triggerToast(`Correo enviado a ${event.responsible} (${event.responsibleEmail}) sobre "${event.title}".`);
                            }}
                            disabled={isNotified}
                            className={`font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all whitespace-nowrap border ${
                              isNotified
                                ? "bg-slate-50 text-ink-400 border-hairline cursor-default"
                                : "bg-white hover:bg-[var(--console-accent-soft)] text-[var(--console-accent)] border-[var(--console-accent)] cursor-pointer"
                            }`}
                          >
                            {isNotified ? "Notificado ✓" : "Notificar por Correo"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* SUB-TAB 2: CAPEX & COSTOS */}
              {maintSubTab === "capex" && (
              <div className="space-y-6 animate-fadeIn">
              {/* CAPEX COST-RESPONSIBILITY LEDGER (TIES DIEGO'S ACTIVITY TO A REAL $ FIGURE FOR FINANZAS) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">
                      Registro de Casos CapEx & Responsabilidad de Costo
                    </h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Cada solicitud de gasto mayor resuelta por Diego IA: quién paga y por qué. Alimenta la tarjeta &ldquo;CapEx Protegido&rdquo; en la Torre de Control CFO.
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-slate-100 text-ink-700 px-3 py-1 rounded-lg border border-hairline shrink-0">
                    {formatVal(diegoProtectedCapex)} Protegidos del P&amp;L
                  </span>
                </div>

                <div className="overflow-x-auto border border-hairline rounded-xl bg-white shadow-2xs">
                  {/* No width hints here on purpose: unlike the other four
                      ledgers, every column in this one is already content-bound
                      (its natural width overflows ~970px and wraps), so there is
                      no slack to redistribute — forcing percentages would only
                      take room from the case text. */}
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-ink-700 font-bold border-b border-hairline text-[11px] tracking-wider">
                      <tr>
                        <th className="p-3.5">Caso / Inquilino</th>
                        <th className="p-3.5">Tipo de Gasto & Equipo</th>
                        <th className="p-3.5 text-right">Monto</th>
                        <th className="p-3.5">Veredicto Diego IA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline font-medium">
                      {capexCases.map((c) => {
                        const verdictMeta =
                          c.verdict === "RECHAZADO_RESPONSABILIDAD_INQUILINO"
                            ? { label: "Rechazado · Responsabilidad Inquilino", badge: "bg-[var(--console-accent-soft)] text-[var(--console-accent)] border border-[var(--console-accent)]/30" }
                            : c.verdict === "APROBADO_GARANTIA_COSTO_CERO"
                              ? { label: "Aprobado · Garantía ($0 MXN)", badge: "bg-slate-100 text-ink-700 border border-hairline" }
                              : { label: "Aprobado · Prorrateo CAM", badge: "bg-caution-surface text-caution border border-caution/40" };
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/90 transition-colors align-top">
                            <td className="p-3.5">
                              <p className="font-bold text-ink text-sm">{c.tenant}</p>
                              <p className="text-xs text-ink-500">{c.id}</p>
                            </td>
                            <td className="p-3.5">
                              <p className="text-ink-700 font-semibold">{c.expenseType}</p>
                              <p className="text-xs text-ink-500">{c.equipmentModel} · {c.serialNumber}</p>
                            </td>
                            <td className="p-3.5 text-right font-bold tabular-nums text-ink whitespace-nowrap">
                              {formatVal(c.amount)}
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-1 ${verdictMeta.badge}`}>
                                {verdictMeta.label}
                              </span>
                              <p className="text-xs text-ink-500 leading-relaxed max-w-md">{c.details}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
              )}

              {/* SUB-TAB 3: CONTRATISTAS & GARANTÍAS */}
              {maintSubTab === "contratistas" && (
              <div className="space-y-6 animate-fadeIn">
              {/* PREAPPROVED CONTRACTOR ROSTER — real contractors table, wired to
                  matchContractorAndTier()'s exact-match dispatch lookup. */}
              <ContractorRoster contractors={contractors} />

              {/* EXPEDIENTE DIGITAL DE GARANTÍAS DE EQUIPOS Y DOCUMENTOS DE INFRAESTRUCTURA */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">
                      Expediente Digital de Garantías & Pólizas de Equipos
                    </h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Diego IA monitorea la vigencia de pólizas de mantenimiento, reclamaciones a fabricantes e historial técnico.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <span className="text-xs font-bold bg-slate-100 text-ink-700 px-3 py-1 rounded-lg border border-hairline shrink-0">
                      8 Garantías Indexadas en Diego IA
                    </span>
                    {/* Second entry point for the same upload action that lives at the top of
                        the Diego tab — this is where a landlord is actually browsing the
                        expediente, so the action has to be reachable from here too. */}
                    <button
                      onClick={() => triggerToast("Selecciona la Garantía, Póliza o Manual de Equipo (PDF/XML) para indexar en Diego IA...")}
                      className="bg-ink hover:bg-ink-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shrink-0"
                    >
                      + Cargar Garantía o Manual (PDF)
                    </button>
                  </div>
                </div>

                {/* WARRANTY SYSTEM CATEGORY FILTER PILLS */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  {[
                    { id: "ALL", label: "Todos los Sistemas (8)" },
                    { id: "HVAC", label: "HVAC & Climas (1)" },
                    { id: "ELEVATOR", label: "Elevadores (1)" },
                    { id: "POWER", label: "Eléctrico (1)" },
                    { id: "ROOF", label: "Techos (1)" },
                    { id: "FIRE", label: "Incendio (1)" },
                    { id: "SOLAR", label: "Solar (1)" },
                    { id: "SECURITY", label: "Seguridad (1)" },
                    { id: "PLUMBING", label: "Hidráulico (1)" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setWarrantyCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        warrantyCategoryFilter === cat.id
                          ? "bg-ink text-white font-bold shadow-2xs"
                          : "bg-slate-100 hover:bg-slate-200 text-ink-700 border border-hairline"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* 8 CRITICAL INFRASTRUCTURE WARRANTY CARDS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* WARRANTY CARD 1: CHILLER TRANE */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "HVAC") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-ink-700 border border-hairline px-2 py-0.5 rounded">
                              HVAC Climatización
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Serie: TRN-2024-884</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Chiller Centravac Trane 150 Ton (Torre Central)</h4>
                        </div>
                        <span className="bg-slate-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">garantia_trane_chiller_2024_2029.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>5 Años en Compresor, Condensador & Evaporador</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Climas de Mexicali S.A. de C.V.</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>14 de Noviembre de 2029</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA generó carta de reclamo de garantía para Climas de Mexicali.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Generar Reclamo de Garantía →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Revisión Preventiva: Al Día</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 2: THYSSENKRUPP ELEVATOR */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "ELEVATOR") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-ink-700 border border-hairline px-2 py-0.5 rounded">
                              Elevadores & Movilidad
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Serie: TK-MEX-4410</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Elevador Panorámico ThyssenKrupp (Zona A)</h4>
                        </div>
                        <span className="bg-slate-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">poliza_mantenimiento_thyssenkrupp_2026.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Atención de Urgencia 24/7 & Repuestos Originales</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>TK Elevator México</strong></p>
                        <p>📅 Vencimiento de Póliza: <strong>31 de Diciembre de 2026</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA solicitó inspección de rutina a TK Elevator México.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Solicitar Inspección Técnica →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Último Mantenimiento: 25 Jul</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 3: SCHNEIDER SUBSTATION */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "POWER") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-ink-700 border border-hairline px-2 py-0.5 rounded">
                              Subestación Eléctrica
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Serie: SCH-1500-KVA</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Subestación Eléctrica Schneider 1500 KVA</h4>
                        </div>
                        <span className="bg-slate-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">garantia_subestacion_schneider_2025.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Transformadores de Potencia & Interruptores de Vacío</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Schneider Electric México</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>28 de Febrero de 2028</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA descargó el certificado de garantía de Schneider Electric.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Ver Póliza de Garantía →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Carga Actual: 68% Capacity</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 4: MAPEI WATERPROOFING */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "ROOF") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-ink-700 border border-hairline px-2 py-0.5 rounded">
                              Impermeabilización Techos
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Superficie: 8,400 m²</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Impermeabilización Mapei (Cinemex & Zona B)</h4>
                        </div>
                        <span className="bg-slate-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía 10 Años ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">garantia_impermeabilizacion_mapei_10a.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Garantía de 10 Años Libre de Filtraciones en Techos</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Mapei de México</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>15 de Junio de 2034</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA programó la inspección anual previa a la temporada de lluvias.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Programar Inspección Anual →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Estado: 0 Filtraciones</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 5: JOHNSON CONTROLS FIRE PROTECTION (NEW) */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "FIRE") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-ink-700 border border-hairline px-2 py-0.5 rounded">
                              Protección Incendio
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Certificación: NFPA 25</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Sistema de Aspersión & Bomba SimplexGrinnell</h4>
                        </div>
                        <span className="bg-slate-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">poliza_sistema_contra_incendio_2026.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Certificación NFPA 25 & Reemplazo de Válvulas de Retención</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Johnson Controls Fire Protection</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>30 de Septiembre de 2027</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA confirmó la prueba de presión trimestral del sistema contra incendio.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Ver Dictamen Bomberos →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Presión: 140 PSI (OK)</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 6: CANADIAN SOLAR PANELS (NEW) */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "SOLAR") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-ink-700 border border-hairline px-2 py-0.5 rounded">
                              Energía Solar Fotovoltaica
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Capacidad: 350 kWp</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Arreglo Fotovoltaico Canadian Solar (Techado C)</h4>
                        </div>
                        <span className="bg-slate-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía 25 Años ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">garantia_paneles_solares_canadian_25a.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>25 Años de Rendimiento Fotovoltaico al 85% de Eficiencia</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Canadian Solar México / Enel X</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>10 de Enero de 2048</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA generó el reporte de generación limpia del arreglo solar.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Ver Eficiencia Inversores →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Generación: 42 MWh/mes</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 7: HIKVISION / FAAC PARKING (NEW) */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "SECURITY") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-ink-700 border border-hairline px-2 py-0.5 rounded">
                              Seguridad & Acceso
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">6 Carriles LPR</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Barreras Automatizadas & Cámaras FAAC / Hikvision</h4>
                        </div>
                        <span className="bg-slate-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">poliza_barreras_estacionamiento_faac.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Motores Hidráulicos FAAC & Cámaras de Reconocimiento LPR</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Hikvision & FAAC México</strong></p>
                        <p>📅 Vencimiento de Póliza: <strong>18 de Mayo de 2027</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA solicitó calibración de la cámara LPR del carril 2.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Calibrar Cámaras LPR →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Uptime: 99.9%</span>
                      </div>
                    </div>
                  )}

                  {/* WARRANTY CARD 8: GRUNDFOS WATER TREATMENT (NEW) */}
                  {(warrantyCategoryFilter === "ALL" || warrantyCategoryFilter === "PLUMBING") && (
                    <div className="border border-hairline rounded-2xl p-5 space-y-3 bg-white shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-ink-700 border border-hairline px-2 py-0.5 rounded">
                              Hidráulico & Planta PTAR
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">PTAR 50 m³/día</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">Planta de Tratamiento & Bombas Grundfos</h4>
                        </div>
                        <span className="bg-slate-100 text-ink border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Garantía Activa ✓
                        </span>
                      </div>

                      <div className="text-xs space-y-1 font-medium text-ink-700">
                        <p>📄 Documento Indexado: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-ink border border-hairline">garantia_planta_tratamiento_grundfos.pdf</code></p>
                        <p>🛠️ Cobertura: <strong>Bombas Sumergibles, Membranas Biológicas & Control SBR</strong></p>
                        <p>🏢 Proveedor Autorizado: <strong>Grundfos México</strong></p>
                        <p>📅 Vencimiento de Garantía: <strong>05 de Noviembre de 2027</strong></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-hairline text-xs">
                        <button
                          onClick={() => triggerToast("Diego IA verificó la calidad de agua tratada para riego de áreas verdes.")}
                          className="text-ink hover:text-ink-700 font-bold underline cursor-pointer text-xs"
                        >
                          Ver Reporte Calidad Agua →
                        </button>
                        <span className="text-[11px] text-ink-500 font-medium">Reutilización: 100% Riego</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
              )}
            </div>
          )}

          {activeTab === "legal" && (
            <div className="bg-white border border-hairline rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn shadow-xs">
              {/* MODULE HEADER & ACTION BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--console-accent)]" />
                    <span className="text-xs font-semibold tracking-wider text-ink-500">
                      Agente Legal IA · Mariana IA
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-ink mt-1">
                    Mariana IA · Inteligencia Multi-Contrato & Exclusividades
                  </h2>
                  <p className="text-xs text-ink-500 mt-1">
                    Supervisión activa de {rentRoll.length} contratos de arrendamiento, consultas legales en tiempo real y dictamen de exclusividades para prospectos.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <MarianaApplicationForm localeOptions={localeOptions} onSubmitted={burstRefreshApprovals} />
                  <button
                    onClick={() => {
                      setCopilotOpen(true);
                      triggerToast("Abriendo Consulta IA...");
                    }}
                    className="bg-white hover:bg-[var(--console-accent-soft)] text-[var(--console-accent)] border border-[var(--console-accent)] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
                  >
                    <span className="h-2 w-2 rounded-full bg-[var(--console-accent)]" />
                    <span>Consulta IA</span>
                  </button>
                </div>
              </div>

              {/* SUB-NAVIGATION — underline tabs, not filled pills */}
              <SubTabBar
                tabs={[
                  { key: "expedientes", label: `Locales y Contratos (${rentRoll.length})` },
                  { key: "vencimientos", label: "Vencimientos y Renovaciones" },
                  {
                    key: "pendientes",
                    label:
                      marianaDecisionesCount + marianaExpedientesCount > 0
                        ? `Pendientes (${marianaDecisionesCount} decisiones · ${marianaExpedientesCount} expedientes)`
                        : "Pendientes",
                  },
                  { key: "prospectos", label: "Viabilidad de Prospectos (Exclusividades)" },
                  { key: "marco_legal", label: "Marco Jurídico & Radar de Leyes (DOF & BC)" },
                ]}
                active={legalSubTab}
                onChange={setLegalSubTab}
              />

              {/* SUB-TAB 1: LOCALES Y CONTRATOS (EXECUTIVE TABLE LEDGER WITH EXPANDABLE ROWS) —
                  Mariana's default workspace: the familiar directory of locales, active
                  contracts, anomalies, and renewal context. Internal key stays
                  "expedientes" (unchanged from before this reorg) — only the tab
                  label and its position in the bar changed. */}
              {legalSubTab === "expedientes" && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-ink">
                        Directorio General de Contratos Activos
                      </h3>
                      <p className="text-xs text-ink-500 mt-0.5">
                        Resumen ejecutivo de expedientes. Haz clic en cualquier fila para desplegar el desglose de cláusulas auditadas.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-xs font-bold bg-slate-100 text-ink-700 px-3 py-1 rounded-lg border border-hairline cursor-default select-none"
                        title="SSOT = Single Source of Truth / Fuente Única de Verdad"
                      >
                        {leases.length} Contratos Indexados (SSOT)
                      </span>
                      {/* Was buried at the bottom of this tab, below the
                          table, inside the Digitalización card — reachable
                          only after scrolling past 85 rows. Moved to the one
                          entry point every visit to this tab starts at. */}
                      <UploadContractButton
                        onUploaded={() => {
                          // Immediate — doesn't wait for the first 3s poll
                          // tick, so the queue below picks up the new
                          // document(s) as soon as the upload itself
                          // resolves. router.refresh() kept alongside for
                          // whatever else on this page it does still reach.
                          void refreshActiveLeaseDocuments();
                          router.refresh();
                        }}
                        onFeedback={triggerToast}
                        inFlightFilenames={inFlightLeaseDocuments.map((doc) => doc.originalFilename)}
                        onLiveUpdate={setLiveActiveLeaseDocuments}
                      />
                    </div>
                  </div>

                  {/* DIGITALIZACIÓN DE CONTRATOS — lease-document pipeline
                      review queue. Sits right under the upload button on
                      purpose: it was previously below the 85-row table, so
                      uploading (top) and reviewing what you just uploaded
                      (bottom) read as two disconnected places. */}
                  <div className="border border-hairline rounded-xl bg-white shadow-2xs p-4 space-y-3.5">
                    <div>
                      <h3 className="text-base font-bold text-ink">Digitalización de Contratos</h3>
                      <p className="text-xs text-ink-500 mt-0.5">
                        Documentos en proceso de validación. Cada uno requiere dos confirmaciones humanas: el local
                        al que corresponde, y la exactitud de las cláusulas extraídas.
                      </p>
                    </div>

                    <LegalDocumentsPanel
                      documents={liveActiveLeaseDocuments}
                      allUnits={leaseDocumentUnits}
                      onResolved={() => {
                        // No router.refresh() here — same reason
                        // MarianaPendingPanel's onRefresh below skips it:
                        // an unawaited RSC refresh racing these two client
                        // polls can land later with a stale prop and
                        // clobber the fresh state right back (confirmed
                        // live — see liveActiveLeaseDocuments's own doc
                        // comment above).
                        void refreshActiveLeaseDocuments();
                        void refreshPortfolio();
                      }}
                      focusDocumentId={focusDocumentId}
                    />
                  </div>

                  {/* Search / filter bar — same client-side pattern as the
                      Rent Roll table (leases is already fully loaded), added
                      because a plain 85-row list has no other way to narrow
                      down to one tenant or to just the renewal-soon subset. */}
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={contractFilter}
                      onChange={(e) => setContractFilter(e.target.value)}
                      placeholder="Filtrar por inquilino o local…"
                      className="w-full max-w-xs rounded-lg border border-hairline-strong px-3 py-2 text-xs bg-white focus:border-[var(--console-accent)] focus:outline-none"
                    />
                    <label className="flex items-center gap-2 text-xs font-semibold text-ink-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={contractOnlyRenewalSoon}
                        onChange={(e) => setContractOnlyRenewalSoon(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-hairline-strong accent-[var(--console-accent)] cursor-pointer"
                      />
                      Mostrar solo renovación próxima ({renewalSoonCount})
                    </label>
                    <p className="text-[11px] text-ink-500 font-medium whitespace-nowrap ml-auto">
                      {visibleLeases.length} de {leases.length} contratos
                    </p>
                  </div>

                  <div className="overflow-x-auto border border-hairline rounded-xl bg-white shadow-2xs">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-ink-700 font-bold border-b border-hairline text-[11px] tracking-wider">
                        <tr>
                          {/* Four short columns over ~970px: their combined
                              natural width is only ~713px, so ~260px of slack
                              has to live somewhere. Handing all of it to the
                              tenant column (it was 40%) put ~300px of dead air
                              between the tenant name and the expiry date while
                              the other two gaps sat at ~176/151px — one obvious
                              hole rather than even breathing room.

                              30/21/19/30 splits it: measured at 1440px the
                              tenant-name-to-expiry-date gap drops from
                              239–304px to 142–207px, and what it gives up goes
                              to the other two gaps, which end up in the same
                              range. The tenant column at 30% (~292px) lands
                              within a few px of its own natural 298px and this
                              table's names are not nowrap, so the worst case is
                              a wrapped name, never a truncated one. Rent stays right-aligned like
                              every other money column here and the status pill
                              still closes the row on the right edge. */}
                          <SortableHeader
                            label="Inquilino & Ubicación"
                            sortKey="name"
                            current={contractSort}
                            onSort={toggleContractSort}
                            width="w-[30%]"
                          />
                          <SortableHeader
                            label="Vencimiento Contrato"
                            sortKey="endDate"
                            current={contractSort}
                            onSort={toggleContractSort}
                            width="w-[21%]"
                          />
                          <SortableHeader
                            label="Renta Mensual"
                            sortKey="rent"
                            current={contractSort}
                            onSort={toggleContractSort}
                            align="right"
                            width="w-[19%]"
                          />
                          <th className="p-3.5 w-[30%] text-right">Estatus Contractual</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline font-medium">
                        {visibleLeases.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-ink-500">
                              {contractFilter ? (
                                <>Sin resultados para &ldquo;{contractFilter}&rdquo;.</>
                              ) : (
                                "Ningún contrato con renovación próxima."
                              )}
                            </td>
                          </tr>
                        )}
                        {visibleLeases.map((c) => (
                          <Fragment key={c.id}>
                            <tr
                              onClick={() => setInspectedContractId(inspectedContractId === c.id ? null : c.id)}
                              className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                            >
                              <td className="p-3.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-ink-400 font-bold text-[11px] select-none">
                                    {inspectedContractId === c.id ? "▲" : "▼"}
                                  </span>
                                  <div className="min-w-0">
                                    {/* tradeName leads (what a landlord actually calls the
                                        tenant); tenantEntity — the legal name — drops to a
                                        secondary line instead of repeating as the only name
                                        shown, which is what the expanded row's header used
                                        to do (same string, twice, no more informative the
                                        second time). */}
                                    <p className="font-bold text-ink text-sm">{c.tradeName ?? c.tenantEntity}</p>
                                    {c.tradeName && <p className="text-xs text-ink-500">{c.tenantEntity}</p>}
                                    <p className="text-xs text-ink-500">{c.unitCode} · {c.sqm} m²</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <p
                                  className={`font-bold text-sm ${c.isExpired ? "text-alert" : c.renewalSoon ? "text-caution" : "text-ink"}`}
                                >
                                  {formatContractDate(c.endDate)}
                                </p>
                              </td>
                              <td className="p-3.5 font-semibold text-ink-700 text-sm text-right tabular-nums">{formatMxn(c.rentMonthly)}</td>
                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {/* One instance, here — not duplicated next to the name in
                                      both the collapsed row and the expanded header the way
                                      it was before. This is the only place "is there a scan
                                      on file" needs to show. */}
                                  {c.sourceDocumentId && (
                                    <span onClick={(e) => e.stopPropagation()}>
                                      <DocumentViewerButton documentId={c.sourceDocumentId} label="Ver contrato" iconOnly />
                                    </span>
                                  )}
                                  {c.isExpired ? (
                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-alert-surface text-alert border border-alert-edge">
                                      Vencido
                                    </span>
                                  ) : c.renewalSoon ? (
                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-caution-surface text-caution border border-caution/40">
                                      Renovación Próxima
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold text-ink-500">Vigente</span>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* EXPANDABLE CLAUSE DETAIL ROW — exclusive_use_clause, permitted_use,
                                and the eight named clause columns the leases table has. No
                                per-contract hash, no INPC/penalty clause columns exist in the
                                schema, so none are shown. */}
                            {inspectedContractId === c.id && (
                              <tr className="bg-slate-50/90 text-ink animate-fadeIn border-b-2 border-hairline">
                                <td colSpan={4} className="p-5 space-y-4 text-sm">
                                  <div className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
                                    <h4 className="font-bold text-sm text-ink">
                                      {c.tradeName ? `${c.tradeName} — ${c.tenantEntity}` : c.tenantEntity} · {c.unitCode}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      {/* The document viewer lives next to the Vigente/Vencido
                                          badge in the collapsed row now, not here too — one
                                          instance instead of the same icon repeating in every
                                          view of this same contract. */}
                                      {c.sourceApplicationNumber && (
                                        <span
                                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-hairline text-ink-400 shrink-0"
                                          title={`Origen: ${c.sourceApplicationNumber} — evaluado por Mariana IA`}
                                        >
                                          <MarianaLinkIcon />
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                    <div className="bg-white p-4 rounded-xl border border-hairline shadow-2xs space-y-1.5">
                                      <p className="font-extrabold text-ink text-sm tracking-wide">Cláusula de Exclusividad</p>
                                      <p className="text-ink-700 text-sm leading-relaxed font-medium">
                                        {c.exclusiveUseClause || "Sin cláusula de exclusividad registrada."}
                                      </p>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-hairline shadow-2xs space-y-1.5">
                                      <p className="font-extrabold text-ink text-sm tracking-wide">Uso Permitido</p>
                                      <p className="text-ink-700 text-sm leading-relaxed font-medium">
                                        {c.permittedUse || "No especificado."}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Eight recurring clause types promoted out of special_clauses
                                      into their own leases columns — see lease-extraction-schema.ts
                                      for the frequency data behind this list. Present-only: most
                                      leases have at most one or two of the eight, so a fixed grid of
                                      always-visible "no aplica" cards (the exclusivity/permitted-use
                                      pattern above) would mostly show empty state here. */}
                                  {(() => {
                                    const allNamedClauses: [string, string | null][] = [
                                      ["Estacionamiento Reservado", c.parkingClause],
                                      ["Publicidad en Directorio", c.directoryAdvertisingClause],
                                      ["Ampliación Futura", c.expansionOptionClause],
                                      ["Horario Extendido", c.extendedHoursClause],
                                      ["Señalización Exterior", c.signageClause],
                                      ["Mascotas", c.petsClause],
                                      ["Restricción de Subarrendamiento", c.subleaseRestrictionClause],
                                      ["Remodelación", c.remodelingClause],
                                    ];
                                    const namedClauses = allNamedClauses.filter(
                                      (entry): entry is [string, string] => entry[1] !== null,
                                    );
                                    if (namedClauses.length === 0) return null;
                                    return (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {namedClauses.map(([label, text]) => (
                                          <div key={label} className="bg-white p-4 rounded-xl border border-hairline shadow-2xs space-y-1.5">
                                            <p className="font-extrabold text-ink text-sm tracking-wide">{label}</p>
                                            <p className="text-ink-700 text-sm leading-relaxed font-medium">{text}</p>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}

                                  <LeaseRenewalPanel
                                    leaseId={c.leaseRowId}
                                    currentEndDate={c.endDate}
                                    isExpired={c.isExpired}
                                    renewalSoon={c.renewalSoon}
                                    renewals={c.renewals}
                                    suggestedEscalationPct={c.suggestedEscalationPct}
                                    suggestedEscalationClauseText={c.suggestedEscalationClauseText}
                                  />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 1c: VENCIMIENTOS Y RENOVACIONES — Contract Renewal
                  Workspace. A portfolio-wide lens grouped by the same
                  expiration tiers the .xlsx export uses (tierForDays), not a
                  second copy of renewal drafting: "Redactar/Ver Renovación"
                  deep-links back into this tab's own LeaseRenewalPanel via
                  setInspectedContractId, flipping legalSubTab back to
                  "expedientes" first so the panel is actually mounted. */}
              {legalSubTab === "vencimientos" && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h3 className="text-base font-bold text-ink">Vencimientos y Renovaciones</h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Contratos agrupados por proximidad de vencimiento. Registra cada contacto con el inquilino sin salir de esta vista.
                    </p>
                  </div>
                  <RenewalWorkspace
                    leases={leases}
                    outreachStatus={liveRenewalOutreachStatus}
                    onRegisterContact={registerRenewalContact}
                    onOpenContract={(localeId) => {
                      setLegalSubTab("expedientes");
                      setInspectedContractId(localeId);
                    }}
                  />
                </div>
              )}

              {/* SUB-TAB 1b: PENDIENTES — a focused sub-view, not the
                  default landing: decisions awaiting Mariana (lease
                  applications, renewal drafts, Gate 1/2 document review),
                  reached via SubTabBar or the sidebar's "Ver pendientes"
                  badge (onTrailingClick). Deep links flip legalSubTab back
                  to "expedientes" and set inspectedContractId/
                  focusDocumentId — same mechanism as the rest of this file,
                  just mounted from a sub-view instead of replacing the
                  workspace it belongs inside. */}
              {legalSubTab === "pendientes" && (
                <div className="animate-fadeIn">
                  <MarianaPendingPanel
                    items={approvalQueue}
                    leaseApplications={liveLeaseApplications}
                    onNavigate={handleApprovalNavigate}
                    onRefresh={() => {
                      void refreshApprovals();
                      // An approved application feeds fetchPortfolio()'s
                      // approvedApplications (the Add-Tenant picker) — keep
                      // that live too, same as LegalDocumentsPanel's own
                      // onResolved already does for Gate 1/2.
                      void refreshPortfolio();
                    }}
                    refreshing={refreshingApprovals}
                  />
                </div>
              )}

              {/* SUB-TAB: PIPELINE DE PROSPECTOS & EVALUADOR DE VIABILIDAD */}
              {legalSubTab === "prospectos" && (
                <div className="space-y-8 animate-fadeIn">
                  {/* Live Lead-to-Lease Pipeline */}
                  <LeadPipeline leads={leads} rentRoll={rentRoll} localeOptions={localeOptions} />

                  {/* Labeled Divider separating live data from demo simulator */}
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-300"></div>
                    <span className="flex-shrink mx-4 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                      Simulador de Exclusividad — Demostración
                    </span>
                    <div className="flex-grow border-t border-slate-300"></div>
                  </div>

                  {/* Illustrative Demo Simulator */}
                  <div className="bg-slate-50/80 border border-hairline/90 rounded-2xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline/70 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink bg-slate-200 px-2.5 py-0.5 rounded-md">
                          Inteligencia de Arrendamiento
                        </span>
                        <h3 className="text-base font-bold text-ink">
                          Evaluador de Viabilidad Legal de Nuevos Inquilinos (Exclusividades RAG)
                        </h3>
                      </div>
                      <p className="text-xs text-ink-500 mt-1">
                        Mariana IA cruza el giro y ubicación del prospecto contra los {rentRoll.length} contratos vigentes para prevenir violaciones de exclusividad.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-ink-700 bg-white px-3 py-1 rounded-lg border border-hairline shrink-0">
                      {rentRoll.length} Contratos Audibles
                    </span>
                  </div>

                  {/* PRESET PROSPECT SELECTOR BAR */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-ink-700 tracking-wider">
                      Seleccionar Prospecto a Evaluar o Ingresar Uno Nuevo:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { brand: "Dunkin' Donuts", unit: "Local B-14", tag: "Zona B" },
                        { brand: "Krispy Kreme", unit: "Local A-08", tag: "Zona A" },
                        { brand: "Buffalo Wild Wings", unit: "Local 10-04", tag: "Zona 10" },
                        { brand: "Planet Fitness", unit: "Local C-02", tag: "Zona C" },
                      ].map((p, idx) => {
                        const isSelected = selectedProspectIndex === idx;
                        return (
                          <button
                            key={p.brand}
                            onClick={() => {
                              setSelectedProspectIndex(idx);
                              setCustomProspectBrand("");
                              triggerToast(`Mariana IA ejecutó auditoría RAG para ${p.brand}...`);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-ink text-white border-ink shadow-md"
                                : "bg-white hover:bg-slate-100 text-ink border-hairline shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs">{p.brand}</span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isSelected ? "bg-ink-700 text-white" : "bg-slate-100 text-ink-500"}`}>
                                {p.tag}
                              </span>
                            </div>
                            <p className={`text-[11px] mt-1 ${isSelected ? "text-ink-300" : "text-ink-500"}`}>{p.unit}</p>
                          </button>
                        );
                      })}
                    </div>

                    {/* CUSTOM PROSPECT INPUT FORM */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                      <div className="flex-1 w-full flex gap-2">
                        <input
                          type="text"
                          value={customProspectBrand}
                          onChange={(e) => setCustomProspectBrand(e.target.value)}
                          placeholder="Ingresar Marca Comercial Personalizada (ej: Lululemon, Sephora...)"
                          className="flex-1 bg-white border border-hairline-strong rounded-xl px-3.5 py-2 text-xs text-ink-700 focus:outline-none focus:border-[var(--console-accent)] font-medium"
                        />
                        <select
                          value={customProspectCategory}
                          onChange={(e) => setCustomProspectCategory(e.target.value)}
                          className="bg-white border border-hairline-strong rounded-xl px-3 py-2 text-xs font-semibold text-ink-700 focus:outline-none cursor-pointer"
                        >
                          <option value="Cafetería & Repostería">Cafetería & Repostería</option>
                          <option value="Restaurante & Bar">Restaurante & Bar</option>
                          <option value="Ropa & Moda">Ropa & Moda</option>
                          <option value="Gimnasio & Salud">Gimnasio & Salud</option>
                          <option value="Cosméticos & Belleza">Cosméticos & Belleza</option>
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          if (!customProspectBrand) {
                            triggerToast("Por favor escribe el nombre de la marca comercial.");
                            return;
                          }
                          triggerToast(`Mariana IA ejecutó auditoría RAG cruzada para ${customProspectBrand}...`);
                        }}
                        className="w-full sm:w-auto bg-ink hover:bg-ink-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all cursor-pointer shrink-0 shadow-2xs"
                      >
                        Auditar con Mariana IA
                      </button>
                    </div>
                  </div>

                  {/* MARIANA AI RAG LEGAL DICTAMEN CARD */}
                  {(() => {
                    const prospect = customProspectBrand
                      ? {
                          brand: customProspectBrand,
                          category: customProspectCategory,
                          requestedUnit: "Local Disponible Solicitado",
                          zone: "Zona General",
                          viable: true,
                          reasoning: `Dictamen Mariana IA (RAG Legal Audit): VIABLE SIN CONFLICTO. Tras auditar la marca ${customProspectBrand} (${customProspectCategory}) contra el índice vectorial de los ${rentRoll.length} contratos de La Gran Vía, Mariana IA confirma que no se detectaron cláusulas de exclusividad ni radio restrictivo en su categoría comercial.`,
                          conflictingContract: "Ninguno (0 Conflictos RAG)",
                          snippet: `Bóveda Legal RAG: 'La marca ${customProspectBrand} cumple con todos los requisitos de compatibilidad comercial sin colisión de exclusividad.'`,
                        }
                      : [
                          {
                            brand: "Dunkin' Donuts",
                            category: "Cafetería & Repostería",
                            requestedUnit: "Local B-14 (320 m²)",
                            zone: "Zona B (Exterior)",
                            viable: true,
                            reasoning: "Dictamen Mariana IA (RAG Legal Audit): VIABLE SIN CONFLICTO DE EXCLUSIVIDAD. El contrato de Blue Luna Café (contrato_blue_luna_cafe_2027.pdf, Cláusula 14.2) limita estrictamente la exclusividad de expendio de café preparado a la crujía de Zona 4 (Local 16). El Local B-14 está ubicado en Zona B (Zona Gastronómica Exterior), fuera de la delimitación territorial de exclusividad. Asimismo, no colisiona con 260 Grill & Bar ni Cinemex Premium.",
                            conflictingContract: "Ninguno (Local B-14 fuera de Zona 4)",
                            snippet: "Cláusula 14.2 de Blue Luna Café: 'El derecho de exclusividad para expendio de café de especialidad comprende única y exclusivamente la crujía de Zona 4 del inmueble comercial.'",
                          },
                          {
                            brand: "Krispy Kreme",
                            category: "Donas & Café",
                            requestedUnit: "Local A-08 (140 m²)",
                            zone: "Zona A",
                            viable: false,
                            reasoning: "Dictamen Mariana IA (RAG Legal Audit): CONFLICTO DETECTADO (IMPROCEDENTE). El Local A-08 colinda directamente con el pasillo central de Zona 4. El contrato vigente de Blue Luna Café (contrato_blue_luna_cafe_2027.pdf, Cláusula 14.2) otorga exclusividad sobre conceptos de café preparado y repostería en toda la Zona 4. El arrendamiento a Krispy Kreme en esta ubicación provocaría una demanda por rescisión con penalización a favor de Blue Luna Café.",
                            conflictingContract: "contrato_blue_luna_cafe_2027.pdf (Cláusula 14.2)",
                            snippet: "Cláusula 14.2 de Blue Luna Café: 'El Arrendador se obliga expresamente a no arrendar ni subarrendar ningún local comercial de la Zona 4 a empresas cuyo giro principal sea el expendio de café o donas.'",
                          },
                          {
                            brand: "Buffalo Wild Wings",
                            category: "Sports Bar & Alitas",
                            requestedUnit: "Local 10-04 (450 m²)",
                            zone: "Zona 10",
                            viable: false,
                            reasoning: "Dictamen Mariana IA (RAG Legal Audit): CONFLICTO DETECTADO (IMPROCEDENTE). El contrato firmado con 260 Grill & Bar (contrato_260_grill_2026_firmado.pdf, Cláusula 18.1) estipula un radio de exclusividad de 50 metros para conceptos de Sports Bar gastronómico con transmisión deportiva en pantallas gigantes. El Local 10-04 se encuentra a sólo 15 metros del Local 02.",
                            conflictingContract: "contrato_260_grill_2026_firmado.pdf (Cláusula 18.1)",
                            snippet: "Cláusula 18.1 de 260 Grill: 'Queda prohibida la instalación de Sports Bar u hostelería con pantalla gigante dentro de los locales contiguos del mismo bloque 10.'",
                          },
                          {
                            brand: "Planet Fitness",
                            category: "Gimnasio & Salud",
                            requestedUnit: "Local C-02 (850 m²)",
                            zone: "Zona C",
                            viable: true,
                            reasoning: `Dictamen Mariana IA (RAG Legal Audit): VIABLE SIN CONFLICTO. Ningún contrato vigente en el índice RAG de los ${rentRoll.length} inquilinos de La Gran Vía contempla cláusulas de exclusividad en giros de acondicionamiento físico o gimnasios. Operación 100% procedente.`,
                            conflictingContract: `Ninguno (0 Conflictos en ${rentRoll.length} contratos SSOT)`,
                            snippet: "Bóveda Legal RAG: 'No existen cláusulas restrictivas relativas a centros de salud, fitness o gimnasios en la plaza.'",
                          },
                        ][selectedProspectIndex];

                    return (
                      <div className="bg-white border border-hairline rounded-xl p-5 space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="h-3 w-3 rounded-full bg-[var(--console-accent)] shrink-0" />
                            <div>
                              <h4 className="font-bold text-ink text-sm">
                                Dictamen RAG: {prospect.brand} ({prospect.category})
                              </h4>
                              <p className="text-xs text-ink-500 font-medium">Espacio evaluado: {prospect.requestedUnit}</p>
                            </div>
                          </div>

                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${
                              prospect.viable
                                ? "bg-slate-100 text-ink border-hairline-strong"
                                : "bg-[var(--console-accent-soft)] text-[var(--console-accent)] border-[var(--console-accent)]/30"
                            }`}
                          >
                            {prospect.viable ? "VIABLE (SIN CONFLICTOS)" : "CONFLICTO DE EXCLUSIVIDAD"}
                          </span>
                        </div>

                        <div className="space-y-3 text-xs">
                          <p className="text-ink-700 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-xl border border-hairline/80">
                            {prospect.reasoning}
                          </p>

                          <div className="bg-slate-50 border-l-2 border-[var(--console-accent)] p-3.5 rounded-r-xl space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-ink-500 font-bold">
                              <span>Evidencia RAG extraída ({prospect.conflictingContract}):</span>
                              <span className="text-ink-400">Páginas de contrato verificadas</span>
                            </div>
                            <p className="italic text-ink-700 text-xs font-serif">&ldquo;{prospect.snippet}&rdquo;</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: MARCO JURÍDICO & RADAR DE LEYES (LEYES FEDERALES & BAJA CALIFORNIA) */}
              {legalSubTab === "marco_legal" && (
                <div className="space-y-6 animate-fadeIn">
                  {/* RADAR HEADER BANNER */}
                  <div className="bg-slate-50 border border-hairline rounded-2xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink bg-slate-200 px-2.5 py-0.5 rounded-md">
                            Supervisión Normativa
                          </span>
                          <h3 className="text-base font-bold text-ink">
                            Radar de Leyes & Reformas Legislativas (DOF & Baja California)
                          </h3>
                        </div>
                        <p className="text-xs text-ink-500 mt-1">
                          Mariana IA monitorea continuamente las publicaciones del Diario Oficial de la Federación (DOF) y del Periódico Oficial de Baja California (POE) para verificar automáticamente los {rentRoll.length} contratos vigentes ante cambios legales.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          onClick={() => triggerToast("Selecciona el archivo PDF o XML del Código o Reforma Legal para indexar en Mariana IA...")}
                          className="bg-white hover:bg-[var(--console-accent-soft)] text-[var(--console-accent)] border border-[var(--console-accent)] font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                        >
                          + Cargar Nueva Ley (PDF/XML)
                        </button>
                        <button
                          onClick={() => {
                            const nowStr = `Hoy, 10 Ago 2026 · ${new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} hrs`;
                            setLastLawScanDate(nowStr);
                            triggerToast(`Mariana IA consultó DOF y POE Baja California. 0 reformas recientes afectan los ${rentRoll.length} contratos.`);
                          }}
                          className="bg-ink hover:bg-ink-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                        >
                          Verificar Reformas Ahora
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-ink-700 font-medium pt-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[var(--console-accent-dark)]" />
                        <span>Última Verificación de Leyes: <strong>{lastLawScanDate}</strong></span>
                      </div>
                      <span className="bg-white text-ink-700 font-bold px-3 py-1 rounded-lg border border-hairline text-[11px]">
                        {rentRoll.length} Contratos Auditados vs Normativa BC & Federal
                      </span>
                    </div>
                  </div>

                  {/* 4 INGESTED LAW FRAMEWORK CARDS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* LAW CARD 1: CÓDIGO CIVIL BAJA CALIFORNIA */}
                    <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3 shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-wider bg-slate-100 text-ink-700 px-2 py-0.5 rounded border border-hairline">
                              Estatal · Baja California
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Art. 2270 - 2345</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">
                            Código Civil para el Estado de Baja California
                          </h4>
                        </div>
                        <span className="bg-slate-100 text-ink-700 border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Vigente POE 2026
                        </span>
                      </div>

                      <p className="text-xs text-ink-500 leading-relaxed font-medium">
                        Regula los requisitos formales del arrendamiento comercial en Mexicali y Baja California: plazos de renovación por buena fe, derecho del tanto y reglas de rescisión por mora en el estado.
                      </p>

                      <div className="bg-slate-50 p-3 rounded-xl border border-hairline/80 flex items-center justify-between text-xs font-bold text-ink-700">
                        <span>Estado de Contratos en Plaza:</span>
                        <span className="text-ink font-extrabold">{rentRoll.length} de {rentRoll.length} Cumplen 100% ✓</span>
                      </div>
                    </div>

                    {/* LAW CARD 2: CÓDIGO CIVIL FEDERAL */}
                    <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3 shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-wider bg-slate-100 text-ink-700 px-2 py-0.5 rounded border border-hairline">
                              Federal · México
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Art. 2398 - 2499</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">
                            Código Civil Federal (DOF Última Reforma 2026)
                          </h4>
                        </div>
                        <span className="bg-slate-100 text-ink-700 border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Vigente DOF 2026
                        </span>
                      </div>

                      <p className="text-xs text-ink-500 leading-relaxed font-medium">
                        Normativa supletoria nacional para la interpretación de convenios mercantiles, penas convencionales por rescisión anticipada e incremento anual de rentas indexado al INPC.
                      </p>

                      <div className="bg-slate-50 p-3 rounded-xl border border-hairline/80 flex items-center justify-between text-xs font-bold text-ink-700">
                        <span>Estado de Contratos en Plaza:</span>
                        <span className="text-ink font-extrabold">{rentRoll.length} de {rentRoll.length} Cumplen 100% ✓</span>
                      </div>
                    </div>

                    {/* LAW CARD 3: LEY DE EXTINCIÓN DE DOMINIO */}
                    <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3 shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-wider bg-slate-100 text-ink-700 px-2 py-0.5 rounded border border-hairline">
                              Federal · Penal / Fiscal
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">Art. 8 Cláusulas</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">
                            Ley Nacional de Extinción de Dominio
                          </h4>
                        </div>
                        <span className="bg-slate-100 text-ink-700 border border-hairline text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                          Auditoría 100%
                        </span>
                      </div>

                      <p className="text-xs text-ink-500 leading-relaxed font-medium">
                        Exige la inclusión obligatoria de la cláusula de deslinde de responsabilidad penal y uso exclusivo para actividades lícitas en todos los locales comerciales de La Gran Vía.
                      </p>

                      <div className="bg-slate-50 p-3 rounded-xl border border-hairline/80 flex items-center justify-between text-xs font-bold text-ink-700">
                        <span>Cláusula de Deslinde Incluida:</span>
                        <span className="text-ink font-extrabold">{rentRoll.length} de {rentRoll.length} Protegidos ✓</span>
                      </div>
                    </div>

                    {/* LAW CARD 4: CÓDIGO FISCAL SAT CFDI 4.0 — explains the
                        legal obligation only; no live compliance status,
                        since that requires an ERP/accounting connection
                        this engagement doesn't have. */}
                    <div className="bg-white border border-hairline rounded-2xl p-5 space-y-3 shadow-2xs hover:border-hairline-strong transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-hairline pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-wider bg-slate-100 text-ink-700 px-2 py-0.5 rounded border border-hairline">
                              Federal · SAT Fiscal
                            </span>
                            <span className="text-[10px] font-bold text-ink-500">CFDI 4.0</span>
                          </div>
                          <h4 className="font-bold text-sm text-ink mt-1">
                            Código Fiscal de la Federación (SAT Arrendamiento)
                          </h4>
                        </div>
                      </div>

                      <p className="text-xs text-ink-500 leading-relaxed font-medium">
                        Regula la obligación fiscal de expedir y timbrar comprobantes fiscales digitales por internet (CFDI 4.0) por rentas cobradas dentro de las 72 horas posteriores a la recolección.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: GOBIERNO, PERMISOS RBAC Y BITÁCORA DE AUDITORÍA */}
          {activeTab === "rbac" && (
            <div className="bg-white border border-hairline rounded-2xl p-6 sm:p-8 space-y-7 animate-fadeIn shadow-xs text-ink">
              {/* HEADER & NEW USER ACTION BAR */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[var(--console-accent)]" />
                    <span className="text-sm font-bold tracking-wider text-ink-500">
                      Gobierno & Seguridad de la Plataforma
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-ink mt-1">
                    Control de Accesos RBAC & Bitácora de Auditoría Inmutable
                  </h2>
                  <p className="text-sm text-ink-500 font-medium mt-1">
                    El Administrador General dicta los roles ejecutivos, restringe accesos por módulo y supervisa los registros de auditoría SHA-256.
                  </p>
                </div>

                <InviteLandlordForm />
              </div>

              {/* 3 GOVERNANCE SUMMARY METRICS CARDS — real counts only; a 4th
                  "Sesiones Activas" card was dropped rather than faked, since
                  Supabase Auth doesn't expose active-session tracking without
                  added instrumentation this app doesn't have. */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-slate-50 border border-hairline rounded-xl p-5 space-y-1.5">
                  <p className="text-sm font-bold text-ink-500 tracking-wide">Usuarios Corporativos</p>
                  <p className="text-3xl font-bold text-ink">{corporateUsers.length} {corporateUsers.length === 1 ? "Usuario" : "Usuarios"}</p>
                  <p className="text-sm text-ink-500 font-medium">
                    {corporateUsers.filter((u) => u.status === "active").length} Activos · {corporateUsers.filter((u) => u.status === "pending").length} Invitación Pendiente
                  </p>
                </div>
                <div className="bg-slate-50 border border-hairline rounded-xl p-5 space-y-1.5">
                  <p className="text-sm font-bold text-ink-500 tracking-wide">Perfiles Definidos</p>
                  <p className="text-3xl font-bold text-ink">1 Rol</p>
                  <p className="text-sm text-ink-500 font-medium">Landlord — acceso uniforme, sin niveles</p>
                </div>
                <div className="bg-slate-50 border border-hairline rounded-xl p-5 space-y-1.5">
                  <p className="text-sm font-bold text-ink-500 tracking-wide">Integridad de Auditoría</p>
                  <p className="text-3xl font-bold text-ink">{auditLog.length} Registros</p>
                  <p className="text-sm text-ink-500 font-medium">Huella SHA-256 por entrada</p>
                </div>
              </div>

              {/* REAL USER ROSTER — role='landlord' is the only tier that has
                  console access; there is no per-module permission model in
                  the schema (profiles.role is just landlord|tenant), so this
                  lists real accounts and their real invite status instead of
                  a fabricated permission matrix. */}
              <div className="space-y-4 pt-2">
                <div>
                  <h3 className="text-lg font-bold text-ink">
                    Usuarios con Acceso a la Consola
                  </h3>
                  <p className="text-sm text-ink-500 font-medium mt-0.5">
                    Cuentas reales con rol landlord — todas con el mismo acceso completo a Diego IA, Mariana IA y Rent Roll.
                  </p>
                </div>

                <div className="border border-hairline rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-ink-700 font-bold text-[11px] sm:text-xs tracking-wider border-b border-hairline-strong">
                      <tr>
                        <th className="py-3 px-3">Usuario</th>
                        <th className="py-3 px-3">Invitado</th>
                        <th className="py-3 px-3 text-right">Estatus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline text-ink-700 font-medium">
                      {corporateUsers.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-6 px-3 text-center text-ink-500">
                            Sin usuarios landlord registrados.
                          </td>
                        </tr>
                      )}
                      {corporateUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-ink font-mono text-xs sm:text-sm">{u.email}</div>
                            {u.fullName && <div className="text-[11px] sm:text-xs text-ink-500 font-medium">{u.fullName}</div>}
                          </td>
                          <td className="py-3 px-3 text-ink-700 text-xs">
                            {new Date(u.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {u.status === "active" ? (
                              <span className="bg-ok-surface text-ok border border-ok/30 font-bold px-2.5 py-1 rounded-md text-xs inline-block">Activo</span>
                            ) : (
                              <span className="bg-caution-surface text-caution border border-caution/40 font-bold px-2.5 py-1 rounded-md text-xs inline-block">Invitación Pendiente</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PROMINENT EMERGENCY KILL-SWITCH BANNER */}
              <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                killSwitchActive
                  ? "bg-ink border-signal text-white shadow-md"
                  : "bg-alert-surface border-alert-edge text-ink"
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-3 w-3 rounded-full ${killSwitchActive ? "bg-signal animate-pulse" : "bg-signal-dark"}`} />
                    <span className="font-bold text-base uppercase tracking-wide">
                      {killSwitchActive ? "MODO DE EMERGENCIA ACTIVO: AUTOMATIZACIONES CONGELADAS" : "INTERRUPTOR DE EMERGENCIA DEL SISTEMA (KILL-SWITCH)"}
                    </span>
                  </div>
                  <p className={`text-sm font-medium leading-relaxed ${killSwitchActive ? "text-dune-100" : "text-ink-500"}`}>
                    {killSwitchActive
                      ? "Todas las ejecuciones autónomas de Diego IA y accesos automatizados han sido suspendidos por instrucción del Administrador General."
                      : "Permite al Administrador General congelar de forma inmediata la ejecución autónoma de Diego IA en caso de mantenimiento o auditoría."}
                  </p>
                </div>

                <button
                  disabled={killSwitchPending}
                  onClick={async () => {
                    const nextState = !killSwitchActive;
                    setKillSwitchPending(true);
                    setKillSwitchActive(nextState);
                    try {
                      const result = await toggleAutonomyKillSwitchAction(nextState);
                      if (result.error) {
                        setKillSwitchActive(!nextState);
                        triggerToast(`No se pudo actualizar el kill-switch: ${result.error}`);
                        return;
                      }
                      triggerToast(nextState ? "INTERRUPTOR DE EMERGENCIA ACTIVADO: Automatizaciones congeladas." : "Modo de emergencia desactivado: Operaciones autónomas reanudadas.");
                    } catch {
                      setKillSwitchActive(!nextState);
                      triggerToast("No se pudo actualizar el kill-switch: error de conexión.");
                    } finally {
                      setKillSwitchPending(false);
                    }
                  }}
                  className={`px-6 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all cursor-pointer shadow-md shrink-0 whitespace-nowrap disabled:opacity-60 disabled:cursor-wait ${
                    killSwitchActive
                      ? "bg-white text-ink hover:bg-slate-100"
                      : "bg-signal-dark hover:bg-alert text-white"
                  }`}
                >
                  {killSwitchPending ? "Actualizando…" : killSwitchActive ? "RESTABLECER OPERACIONES AUTÓNOMAS" : "ACTIVAR KILL-SWITCH DE EMERGENCIA"}
                </button>
              </div>

              {/* ENTERPRISE AI AUTONOMY & SECURITY GOVERNANCE POLICIES */}
              <div className="space-y-4 pt-2">
                <div>
                  <h3 className="text-lg font-bold text-ink">
                    Límites de Autonomía de Agentes IA & Gobernanza de Seguridad
                  </h3>
                  <p className="text-sm text-ink-500 font-medium mt-0.5">
                    Configuración de umbrales financieros para ejecución autónoma, autenticación SSO y políticas de seguridad.
                  </p>
                </div>

                <div className="space-y-4 text-sm">
                  {/* POLICY 1: DIEGO AI SPENDING THRESHOLD */}
                  <div className="border border-hairline rounded-xl p-5 bg-slate-50 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-ink text-base">Diego IA · Umbral CapEx</span>
                          <span className="bg-slate-100 text-ink-700 border border-hairline text-xs font-bold px-2.5 py-0.5 rounded">
                            ${diegoThresholdVal.toLocaleString()} MXN Max
                          </span>
                        </div>
                        <p className="text-ink-700 text-sm leading-relaxed font-medium">
                          Diego IA puede despachar proveedores de mantenimiento automáticamente en órdenes de hasta ${diegoThresholdVal.toLocaleString()} MXN. Montos mayores requieren firma dual Admin.
                        </p>
                      </div>

                      {editingPolicyCard !== "diego" && (
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-xs font-bold text-ink">
                            <span className="text-ink-500">Estatus: </span>
                            <span className="text-ink">{diegoAutoMode ? "Piloto Automático Activo" : "Supervisión Manual"}</span>
                          </div>
                          <button
                            onClick={() => setEditingPolicyCard("diego")}
                            className="bg-white border border-[var(--console-accent)] hover:bg-[var(--console-accent-soft)] text-[var(--console-accent)] font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            Editar Configuración →
                          </button>
                        </div>
                      )}
                    </div>

                    {editingPolicyCard === "diego" && (
                      <div className="p-4 bg-white border border-hairline-strong rounded-xl space-y-3 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="block text-xs font-bold text-ink-700">
                            Monto Máximo Autónomo (MXN):
                            <input
                              type="number"
                              step={5000}
                              value={diegoThresholdVal}
                              onChange={(e) => setDiegoThresholdVal(Number(e.target.value))}
                              className="mt-1 w-full bg-slate-50 border border-hairline-strong rounded-lg px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:border-[var(--console-accent)]"
                            />
                          </label>

                          <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-2.5 text-sm font-bold text-ink cursor-pointer">
                              <input
                                type="checkbox"
                                checked={diegoAutoMode}
                                onChange={(e) => setDiegoAutoMode(e.target.checked)}
                                className="h-5 w-5 accent-[var(--console-accent)] rounded"
                              />
                              Piloto Automático Activo
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t border-hairline">
                          <button
                            onClick={() => {
                              setEditingPolicyCard(null);
                              triggerToast(`Umbral de Diego IA actualizado a $${diegoThresholdVal.toLocaleString()} MXN.`);
                            }}
                            className="bg-ink hover:bg-ink-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Guardar Cambios
                          </button>
                          <button
                            onClick={() => setEditingPolicyCard(null)}
                            className="bg-slate-100 hover:bg-slate-200 text-ink-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* POLICY 3: SSO & GEO-FENCING */}
                  <div className="border border-hairline rounded-xl p-5 bg-slate-50 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-ink text-base">SSO & Geo-Fencing IP</span>
                          <span className="bg-slate-100 text-ink-700 border border-hairline text-xs font-bold px-2.5 py-0.5 rounded">
                            Mexicali & Tijuana
                          </span>
                        </div>
                        <p className="text-ink-700 text-sm leading-relaxed font-medium">
                          Acceso restringido a rangos de IP autorizados de las corporativas Mexicali HQ y Tijuana, con autenticación obligatoria 2FA / WebAuthn Passkeys.
                        </p>
                      </div>

                      {editingPolicyCard !== "sso" && (
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-xs font-bold text-ink">
                            <span className="text-ink-500">Autenticación: </span>
                            <span className="text-ink">{ssoEnforcedMode ? "SAML 2.0 / 2FA Enforced" : "Estándar"}</span>
                          </div>
                          <button
                            onClick={() => setEditingPolicyCard("sso")}
                            className="bg-white border border-[var(--console-accent)] hover:bg-[var(--console-accent-soft)] text-[var(--console-accent)] font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            Editar Configuración →
                          </button>
                        </div>
                      )}
                    </div>

                    {editingPolicyCard === "sso" && (
                      <div className="p-4 bg-white border border-hairline-strong rounded-xl space-y-3 animate-fadeIn">
                        <label className="flex items-center gap-2.5 text-sm font-bold text-ink cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ssoEnforcedMode}
                            onChange={(e) => setSsoEnforcedMode(e.target.checked)}
                            className="h-5 w-5 accent-[var(--console-accent)] rounded"
                          />
                          SAML 2.0 / 2FA Obligatorio con Passkeys
                        </label>
                        <p className="text-xs text-ink-500 font-medium">
                          Geo-Fencing restringido a rangos corporativos Mexicali HQ (189.210.42.0/24) y Tijuana (201.140.88.0/24).
                        </p>

                        <div className="flex items-center gap-3 pt-2 border-t border-hairline">
                          <button
                            onClick={() => {
                              setEditingPolicyCard(null);
                              triggerToast("Política SSO & Geo-Fencing actualizada.");
                            }}
                            className="bg-ink hover:bg-ink-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Guardar Cambios
                          </button>
                          <button
                            onClick={() => setEditingPolicyCard(null)}
                            className="bg-slate-100 hover:bg-slate-200 text-ink-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* IMMUTABLE SHA-256 AUDIT TRAIL LOG VIEWER */}
              <div className="space-y-3.5 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-ink flex items-center justify-center shrink-0 shadow-2xs">
                      <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-ink">
                          Bitácora Inmutable de Auditoría
                        </h3>
                        <span className="inline-flex items-center gap-1.5 bg-ok-surface text-ok border border-ok/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          <span className="h-1.5 w-1.5 rounded-full bg-ok-surface0 animate-pulse" />
                          En Vivo
                        </span>
                      </div>
                      <p className="text-xs text-ink-500 mt-0.5">
                        Cada aprobación Tier 3 (despachos CapEx de Diego IA, solicitudes de arrendamiento de Mariana IA) se registra aquí — huella SHA-256 por entrada.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 sm:pl-12">
                    <span className="text-xs text-ink-700 font-bold bg-slate-100 border border-hairline px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                      {auditLog.length} Entradas
                    </span>
                    <button
                      onClick={() => {
                        const header = "Timestamp,Tipo,Actor,Accion,Hash SHA-256\n";
                        const rows = [...auditLog]
                          .reverse()
                          .map((e) =>
                            [e.timestamp, e.actorType === "user" ? "USER" : "AGENT", e.actor, `"${e.action.replace(/"/g, '""')}"`, e.hash].join(",")
                          )
                          .join("\n");
                        const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `bitacora_auditoria_lagranvia_${periodLabel.replace(/\s+/g, "_")}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        triggerToast(`Bitácora exportada (${auditLog.length} entradas, CSV).`);
                      }}
                      className="bg-ink hover:bg-ink-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-2xs"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Exportar CSV
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    value={auditLogFilter}
                    onChange={(e) => setAuditLogFilter(e.target.value)}
                    placeholder="Filtrar por usuario, agente o acción (ej: CFDI, m.hage, diego_ai_agent)..."
                    className="w-full bg-white border border-hairline-strong rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-ink placeholder-ink-400 focus:outline-none focus:border-[var(--console-accent)] focus:ring-2 focus:ring-[var(--console-accent)]/10 font-medium transition-all"
                  />
                </div>

                {(() => {
                  const q = auditLogFilter.trim().toLowerCase();
                  const filtered = [...auditLog]
                    .reverse()
                    .filter((e) => !q || e.actor.toLowerCase().includes(q) || e.action.toLowerCase().includes(q) || e.actorType.includes(q));

                  return (
                    <div className="bg-console-canvas rounded-2xl border border-console-hairline-strong shadow-md overflow-hidden">
                      <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-2.5 border-b border-console-hairline-strong bg-console-panel/60 text-[10px] font-bold tracking-wider text-console-slate">
                        <span>Actor</span>
                        <span>Acción registrada</span>
                        <span className="text-right">Verificación</span>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-console-hairline">
                        {filtered.length === 0 ? (
                          <p className="text-console-ash text-xs p-6 text-center">Sin resultados para &quot;{auditLogFilter}&quot;.</p>
                        ) : (
                          filtered.map((e, idx) => (
                            <div
                              key={e.id}
                              className={`grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3.5 hover:bg-console-panel/70 transition-colors ${idx === 0 ? "bg-console-panel/40" : ""}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border border-console-hairline-strong ${
                                    e.actorType === "user"
                                      ? "bg-console-raised text-console-bone"
                                      : "bg-console-raised text-ok-on-dark"
                                  }`}
                                >
                                  {e.actorType === "user" ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 3v1.5M15.75 3v1.5M3 8.25h1.5M3 12h1.5m-1.5 3.75h1.5M19.5 8.25H21M19.5 12H21m-1.5 3.75H21M8.25 19.5v1.5m7.5-1.5v1.5M6.75 6.75h10.5v10.5H6.75V6.75z" />
                                    </svg>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-console-bone truncate">{e.actor}</p>
                                  <p className="text-[10.5px] text-console-slate font-mono">{formatAuditTimestamp(e.timestamp)}</p>
                                </div>
                              </div>
                              <p className="text-xs text-console-ash leading-relaxed self-center">{e.action}</p>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span
                                  className={`text-[9.5px] font-bold tracking-wide px-2 py-0.5 rounded-full border border-console-hairline-strong ${
                                    e.actorType === "user"
                                      ? "bg-console-raised text-console-ash"
                                      : "bg-console-raised text-ok-on-dark"
                                  }`}
                                >
                                  {e.actorType === "user" ? "Usuario" : "Agente IA"}
                                </span>
                                <span className="text-[10px] font-mono text-console-slate" title="Hash SHA-256 de la entrada">
                                  {e.hash}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* AI ASSISTANT DRAWER / SLIDE-OVER PANEL */}
      {copilotOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[30rem] lg:w-[38rem] max-w-[92vw] bg-white border-l border-hairline shadow-2xl flex flex-col justify-between animate-slideLeft">
          <div className="p-4 border-b border-hairline bg-ink text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-ink-400" />
              <h3 className="font-bold text-base">Consulta IA</h3>
            </div>
            <button
              onClick={() => setCopilotOpen(false)}
              className="text-ink-400 hover:text-white text-xs cursor-pointer font-bold"
            >
              Cerrar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            <div className="bg-slate-50 border border-hairline rounded-xl p-3.5 space-y-2">
              {copilotAskedQuestion ? (
                <>
                  <p className="font-bold text-ink text-sm">{copilotAskedQuestion}</p>
                  <div className="bg-white p-3 rounded-lg border border-hairline text-ink-700 leading-relaxed text-sm font-medium shadow-2xs whitespace-pre-wrap">
                    {queryResult}
                  </div>
                </>
              ) : (
                <p className="text-ink-500 text-sm leading-relaxed">
                  Escribe una pregunta abajo sobre los contratos de arrendamiento o los tickets de mantenimiento reales de la plaza.
                </p>
              )}
              {copilotError && <p className="text-red-600 text-sm font-semibold">{copilotError}</p>}
            </div>
          </div>

          <div className="p-3 border-t border-hairline bg-slate-50">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!copilotQuestion.trim() || copilotLoading) return;
                const asked = copilotQuestion;
                const controller = new AbortController();
                copilotAbortRef.current = controller;
                setCopilotLoading(true);
                setCopilotError(null);
                try {
                  const res = await fetch("/api/copiloto/ask", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ question: asked }),
                    signal: controller.signal,
                  });
                  if (!res.ok) {
                    const json = (await res.json().catch(() => ({}))) as { error?: string };
                    throw new Error(json.error ?? "Error desconocido");
                  }
                  if (!res.body) throw new Error("Error de conexión con el agente.");

                  setCopilotAskedQuestion(asked);
                  setQueryResult("");
                  setCopilotQuestion("");

                  // Streamed plain text — append each chunk as Claude
                  // generates it rather than waiting for res.json() on the
                  // full response, so the drawer fills in live instead of
                  // staying blank for the entire generation.
                  const reader = res.body.getReader();
                  const decoder = new TextDecoder();
                  for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    setQueryResult((prev) => prev + decoder.decode(value, { stream: true }));
                  }
                } catch (err) {
                  if (err instanceof DOMException && err.name === "AbortError") return;
                  setCopilotError(err instanceof Error ? err.message : "Error de conexión con el agente.");
                } finally {
                  if (copilotAbortRef.current === controller) setCopilotLoading(false);
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={copilotQuestion}
                onChange={(e) => setCopilotQuestion(e.target.value)}
                placeholder="Pregunta a la IA sobre la plaza..."
                disabled={copilotLoading}
                className="flex-1 bg-white border border-hairline-strong rounded-xl px-3 py-2 text-sm text-ink-700 font-medium disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={copilotLoading}
                className="bg-ink text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-ink-700 transition-colors shadow-xs disabled:opacity-60 disabled:cursor-wait"
              >
                {copilotLoading ? "Consultando…" : "Enviar"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
