"use client";

import { useMemo, useState } from "react";
import { computeDaysRemaining, tierForDays, TIER_LABELS, type ExpirationTierKey, type LeaseDetail } from "@/lib/data/contract-status";
import { RENEWAL_OUTREACH_STAGES, type RenewalOutreachStage, type RenewalOutreachStatus } from "@/lib/data/renewal-outreach-types";

const STAGE_LABEL: Record<RenewalOutreachStage, string> = {
  contacted: "Contactado",
  negotiating: "En Negociación",
  proposal_sent: "Propuesta Enviada",
  tenant_accepted: "Inquilino Aceptó",
  tenant_declined: "Inquilino Rechazó",
};

const RENEWAL_STATUS_LABEL: Record<"needs_landlord_review" | "approved" | "rejected", string> = {
  needs_landlord_review: "Proyecto — Revisión Pendiente",
  approved: "Renovación Aprobada",
  rejected: "Renovación Rechazada",
};

// Tiers rendered near-term-first, all six shown — matches the same buckets
// the .xlsx export's "Vencimientos Próximos" sheet uses. expired/d30 open by
// default (the actionable window); everything past that starts collapsed,
// same DocumentGroup-style "collapsed behind a count" pattern the Gate 1
// bulk-triage backlog already established.
const TIER_ORDER: ExpirationTierKey[] = ["expired", "d30", "d60", "d90", "d180", "plus180"];
const DEFAULT_EXPANDED = new Set<ExpirationTierKey>(["expired", "d30"]);

/** timeZone: "UTC" is load-bearing — lease.endDate is a bare "YYYY-MM-DD"
 *  string, which parses as UTC midnight; without an explicit zone,
 *  toLocaleDateString() renders in the viewer's local timezone and rolls
 *  the date back a day in negative-UTC-offset zones like Mexicali's. */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function ContactForm({
  leaseRowId,
  onSubmit,
}: {
  leaseRowId: string;
  onSubmit: (leaseRowId: string, stage: RenewalOutreachStage, note: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<RenewalOutreachStage>("contacted");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-bold text-[var(--console-accent)] border border-[var(--console-accent)] px-2.5 py-1 rounded-lg hover:bg-[var(--console-accent-soft)] cursor-pointer"
      >
        Registrar Contacto
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <select
        value={stage}
        onChange={(e) => setStage(e.target.value as RenewalOutreachStage)}
        className="text-xs rounded-lg border border-hairline-strong px-2 py-1 bg-white focus:border-[var(--console-accent)] focus:outline-none"
      >
        {RENEWAL_OUTREACH_STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABEL[s]}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (opcional)"
        className="text-xs rounded-lg border border-hairline-strong px-2 py-1 w-36 bg-white focus:border-[var(--console-accent)] focus:outline-none"
      />
      <button
        type="button"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          await onSubmit(leaseRowId, stage, note);
          setSaving(false);
          setOpen(false);
          setNote("");
        }}
        className="text-xs font-bold text-white bg-ink px-2.5 py-1 rounded-lg hover:bg-ink-700 disabled:opacity-50 cursor-pointer"
      >
        {saving ? "…" : "Guardar"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-ink-500 hover:text-ink cursor-pointer px-1"
      >
        Cancelar
      </button>
    </div>
  );
}

function LeaseOutreachRow({
  lease,
  status,
  onRegisterContact,
  onOpenContract,
}: {
  lease: LeaseDetail;
  status: RenewalOutreachStatus | undefined;
  onRegisterContact: (leaseRowId: string, stage: RenewalOutreachStage, note: string) => Promise<void>;
  onOpenContract: (localeId: string) => void;
}) {
  const draft = lease.renewals[0] ?? null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-hairline last:border-b-0 hover:bg-slate-50/60">
      <div className="min-w-0">
        <p className="font-bold text-xs text-ink">{lease.tradeName ?? lease.tenantEntity}</p>
        {lease.tradeName && <p className="text-[11px] text-ink-500">{lease.tenantEntity}</p>}
        <p className="text-[11px] text-ink-500">
          {lease.unitCode} · Vence {formatDate(lease.endDate)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {status ? (
          <span
            className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--console-accent-soft)] text-[var(--console-accent)] border border-[var(--console-accent)]/40"
            title={status.note ?? undefined}
          >
            {STAGE_LABEL[status.stage]}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-ink-400">Sin contacto registrado</span>
        )}

        {draft && (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-ink-700 border border-hairline">
            {RENEWAL_STATUS_LABEL[draft.status]}
          </span>
        )}

        <ContactForm leaseRowId={lease.leaseRowId} onSubmit={onRegisterContact} />

        <button
          type="button"
          onClick={() => onOpenContract(lease.id)}
          className="text-xs font-bold bg-slate-100 text-ink-700 px-2.5 py-1 rounded-lg border border-hairline hover:bg-slate-200 cursor-pointer"
        >
          {draft ? "Ver Renovación" : "Redactar Renovación"}
        </button>
      </div>
    </div>
  );
}

function TierSection({
  tierKey,
  leases,
  outreachStatus,
  expanded,
  onToggle,
  onRegisterContact,
  onOpenContract,
}: {
  tierKey: ExpirationTierKey;
  leases: LeaseDetail[];
  outreachStatus: Record<string, RenewalOutreachStatus>;
  expanded: boolean;
  onToggle: () => void;
  onRegisterContact: (leaseRowId: string, stage: RenewalOutreachStage, note: string) => Promise<void>;
  onOpenContract: (localeId: string) => void;
}) {
  if (leases.length === 0) return null;

  return (
    <div className="border border-hairline rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-3.5 text-left cursor-pointer hover:bg-slate-50"
      >
        <p className="font-bold text-xs text-ink">
          {TIER_LABELS[tierKey]} <span className="text-ink-400 font-semibold">({leases.length})</span>
        </p>
        <span className="text-ink-400 text-xs">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-hairline">
          {leases.map((lease) => (
            <LeaseOutreachRow
              key={lease.id}
              lease={lease}
              status={outreachStatus[lease.leaseRowId]}
              onRegisterContact={onRegisterContact}
              onOpenContract={onOpenContract}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Portfolio-wide lens onto lease expiration + outreach — groups every lease
 * by the same tier boundaries the .xlsx export uses (tierForDays), and lets
 * a landlord log outreach without leaving the tiered view. Deliberately
 * doesn't rebuild renewal drafting: "Redactar/Ver Renovación" deep-links
 * back to LeaseRenewalPanel via onOpenContract, same navigation
 * handleApprovalNavigate already uses for lease_renewal targets.
 */
export function RenewalWorkspace({
  leases,
  outreachStatus,
  onRegisterContact,
  onOpenContract,
}: {
  leases: LeaseDetail[];
  outreachStatus: Record<string, RenewalOutreachStatus>;
  onRegisterContact: (leaseRowId: string, stage: RenewalOutreachStage, note: string) => Promise<void>;
  onOpenContract: (localeId: string) => void;
}) {
  const [expandedTiers, setExpandedTiers] = useState<Set<ExpirationTierKey>>(new Set(DEFAULT_EXPANDED));

  const leasesByTier = useMemo(() => {
    const groups = new Map<ExpirationTierKey, LeaseDetail[]>(TIER_ORDER.map((k) => [k, []]));
    for (const lease of leases) {
      const key = tierForDays(computeDaysRemaining(lease.endDate));
      groups.get(key)!.push(lease);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.endDate.localeCompare(b.endDate));
    }
    return groups;
  }, [leases]);

  const toggleTier = (key: ExpirationTierKey) => {
    setExpandedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {TIER_ORDER.map((tierKey) => (
        <TierSection
          key={tierKey}
          tierKey={tierKey}
          leases={leasesByTier.get(tierKey) ?? []}
          outreachStatus={outreachStatus}
          expanded={expandedTiers.has(tierKey)}
          onToggle={() => toggleTier(tierKey)}
          onRegisterContact={onRegisterContact}
          onOpenContract={onOpenContract}
        />
      ))}
    </div>
  );
}
