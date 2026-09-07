import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type AuditEntry = {
  id: string;
  timestamp: string; // ISO — the client formats for display
  actorType: "user" | "agent";
  actor: string;
  action: string;
  hash: string;
};

// Web Crypto (not node:crypto) — this module runs under the /consola route's
// edge runtime, which has no Node crypto module.
async function fingerprint(entry: Omit<AuditEntry, "hash">): Promise<string> {
  const canonical = JSON.stringify({ id: entry.id, timestamp: entry.timestamp, actorType: entry.actorType, actor: entry.actor, action: entry.action });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return "sha256_" + hex.slice(0, 16);
}

async function stamp(entry: Omit<AuditEntry, "hash">): Promise<AuditEntry> {
  return { ...entry, hash: await fingerprint(entry) };
}

/** Human labels for lease_field_history.field_name — the raw column name
 *  shouted snake_case in the database, same reasoning as
 *  ESCALATION_METHOD_LABEL (contract-status.ts): a landlord reading this
 *  tab shouldn't see "cam_cap_controllable_pct" verbatim. */
const LEASE_FIELD_LABEL: Record<string, string> = {
  escalation_pct: "% de escalación",
  escalation_month: "mes de escalación",
  escalation_method: "método de escalación",
  escalation_confirmed_none: "confirmación de sin escalación",
  cam_share_basis: "base de prorrateo CAM",
  cam_cap_controllable_pct: "tope de controlables CAM",
  admin_fee_pct: "cuota administrativa CAM",
  security_deposit_amount: "depósito en garantía",
  security_deposit_status: "estatus del depósito",
  agent_notes: "notas del agente",
};

/**
 * Real events, pulled from the tables each real Tier 2/3 action actually
 * writes to — replaces the seeded/appended local React state that used to
 * back the RBAC tab's "Bitácora Inmutable de Auditoría." Each hash is a real
 * SHA-256 of the entry's own fields (not a stored, re-checked integrity
 * proof — a content fingerprint, which is what the UI's "verificado con
 * hash SHA-256" label actually means here).
 *
 * Two known gaps, both a consequence of properties.autonomy_frozen and
 * lease_applications.reviewed_at being current-state columns, not append-only
 * history: an autonomy-kill-switch deactivation overwrites its own record (so
 * only a currently-active freeze shows up here, never a past one that was
 * since lifted), and a lease application only ever shows its most recent
 * review, not a full decision trail. A third gap of the same shape —
 * manual landlord edits to `leases` fields leaving no trace — is now closed
 * by lease_field_history (20260907160000_lease_field_history.sql) below.
 */
export async function fetchAuditLog(): Promise<AuditEntry[]> {
  const supabase = getSupabaseServiceClient();
  const entries: AuditEntry[] = [];

  const { data: history } = await supabase
    .from("ticket_status_history")
    .select("id, ticket_id, from_status, to_status, note, changed_at")
    .order("changed_at", { ascending: false })
    .limit(20);

  if (history?.length) {
    const ticketIds = [...new Set(history.map((h) => h.ticket_id))];
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, tenant_entity, estimated_cost, approved_by")
      .in("id", ticketIds);
    const ticketById = new Map((tickets ?? []).map((t) => [t.id, t]));

    const approverIds = [...new Set((tickets ?? []).map((t) => t.approved_by).filter((v): v is string => !!v))];
    const { data: profiles } = approverIds.length
      ? await supabase.from("profiles").select("id, email, full_name").in("id", approverIds)
      : { data: [] };
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    for (const h of history) {
      const ticket = ticketById.get(h.ticket_id);
      const approver = ticket?.approved_by ? profileById.get(ticket.approved_by) : null;
      entries.push(
        await stamp({
          id: `tsh-${h.id}`,
          timestamp: h.changed_at,
          actorType: "user",
          actor: approver?.full_name ?? approver?.email ?? "Administrador",
          action: `${h.note ?? `Ticket movido de ${h.from_status ?? "?"} a ${h.to_status}`}${ticket?.tenant_entity ? ` — ${ticket.tenant_entity}` : ""}`,
        }),
      );
    }
  }

  const { data: decisions } = await supabase
    .from("agent_decisions")
    .select("id, skill, ticket_id, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (decisions?.length) {
    for (const d of decisions) {
      entries.push(
        await stamp({
          id: `decision-${d.id}`,
          timestamp: d.created_at,
          actorType: "agent",
          actor: d.skill === "maintenance-dispatcher" ? "diego_ai_agent" : "mariana_ai_agent",
          action:
            d.skill === "maintenance-dispatcher"
              ? "Diego IA generó diagnóstico y clasificación de costo para un ticket de mantenimiento"
              : "Mariana IA generó dictamen de auditoría de exclusividad para una solicitud de arrendamiento",
        }),
      );
    }
  }

  const { data: leaseReviews } = await supabase
    .from("lease_applications")
    .select("id, applicant_entity, status, reviewed_by, reviewed_at")
    .not("reviewed_by", "is", null)
    .order("reviewed_at", { ascending: false })
    .limit(10);

  if (leaseReviews?.length) {
    const reviewerIds = [...new Set(leaseReviews.map((r) => r.reviewed_by).filter((v): v is string => !!v))];
    const { data: profiles } = reviewerIds.length
      ? await supabase.from("profiles").select("id, email, full_name").in("id", reviewerIds)
      : { data: [] };
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    for (const r of leaseReviews) {
      const reviewer = r.reviewed_by ? profileById.get(r.reviewed_by) : null;
      entries.push(
        await stamp({
          id: `lease-${r.id}`,
          timestamp: r.reviewed_at!,
          actorType: "user",
          actor: reviewer?.full_name ?? reviewer?.email ?? "Administrador",
          action: `${r.status === "approved" ? "Aprobó" : "Rechazó"} la solicitud de arrendamiento de ${r.applicant_entity}`,
        }),
      );
    }
  }

  const { data: property } = await supabase
    .from("properties")
    .select("autonomy_frozen, autonomy_frozen_by, autonomy_frozen_at")
    .single();

  if (property?.autonomy_frozen && property.autonomy_frozen_at) {
    entries.push(
      await stamp({
        id: "autonomy-freeze-current",
        timestamp: property.autonomy_frozen_at,
        actorType: "user",
        actor: property.autonomy_frozen_by ?? "Administrador",
        action: "Activó el interruptor de emergencia — automatizaciones de Diego IA congeladas",
      }),
    );
  }

  const { data: fieldChanges } = await supabase
    .from("lease_field_history")
    .select("id, lease_id, field_name, old_value, new_value, changed_by, changed_at")
    .order("changed_at", { ascending: false })
    .limit(20);

  if (fieldChanges?.length) {
    const leaseIds = [...new Set(fieldChanges.map((f) => f.lease_id))];
    const { data: leases } = await supabase.from("leases").select("id, locale_id, tenant_entity").in("id", leaseIds);
    const leaseById = new Map((leases ?? []).map((l) => [l.id, l]));

    const localeIds = [...new Set((leases ?? []).map((l) => l.locale_id).filter((v): v is string => !!v))];
    const { data: locales } = localeIds.length
      ? await supabase.from("locales").select("id, unit_number").in("id", localeIds)
      : { data: [] };
    const localeById = new Map((locales ?? []).map((l) => [l.id, l]));

    const changerIds = [...new Set(fieldChanges.map((f) => f.changed_by).filter((v): v is string => !!v))];
    const { data: profiles } = changerIds.length
      ? await supabase.from("profiles").select("id, email, full_name").in("id", changerIds)
      : { data: [] };
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    for (const f of fieldChanges) {
      const lease = leaseById.get(f.lease_id);
      const locale = lease?.locale_id ? localeById.get(lease.locale_id) : null;
      const changer = f.changed_by ? profileById.get(f.changed_by) : null;
      const fieldLabel = LEASE_FIELD_LABEL[f.field_name] ?? f.field_name;
      const unitLabel = locale?.unit_number ?? lease?.tenant_entity ?? "un contrato";
      entries.push(
        await stamp({
          id: `lfh-${f.id}`,
          timestamp: f.changed_at,
          actorType: "user",
          actor: changer?.full_name ?? changer?.email ?? "Administrador",
          action: `Actualizó ${fieldLabel} de ${unitLabel}: "${f.old_value ?? "(vacío)"}" → "${f.new_value ?? "(vacío)"}"`,
        }),
      );
    }
  }

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
