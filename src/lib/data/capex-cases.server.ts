import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type CapexVerdict =
  | "RECHAZADO_RESPONSABILIDAD_INQUILINO"
  | "APROBADO_GARANTIA_COSTO_CERO"
  | "APROBADO_PRORRATEO_CAM"
  | "APROBADO_COSTO_ARRENDADOR";

export type CapexCase = {
  id: string;
  ticketNumber: string;
  tenant: string;
  expenseType: string;
  amount: number;
  isQuestionable: boolean;
  verdict: CapexVerdict;
  details: string;
  equipmentModel: string;
  serialNumber: string;
};

/**
 * Real replacement for the hardcoded CAPEX_CASES fixture that used to live in
 * console-data.server.ts (`landlord-dashboard.tsx`'s "Registro de Casos CapEx
 * & Responsabilidad de Costo" table, which explicitly feeds the CFO Control
 * Tower's "CapEx Protegido" card — so a fake number here was already a
 * cross-skill reporting problem, not just a cosmetic one).
 *
 * "CapEx case" = any ticket that ever required a landlord decision (passed
 * through `needs_approval` at least once, per ticket_status_history — same
 * table diego-tickets.server.ts already reads for pendingConfirmationSince)
 * AND has since been cost-attributed (`cost_bucket` set). `approval_level` on
 * `tickets` was considered as a filter instead, but it's never written by any
 * workflow in this codebase — a dead column, not a real signal.
 *
 * Verdict is derived, never stored, so it can't drift from the ticket's own
 * cost_bucket/warranty_covered fields:
 *   - INQUILINO            -> RECHAZADO_RESPONSABILIDAD_INQUILINO
 *   - warranty_covered     -> APROBADO_GARANTIA_COSTO_CERO (checked before
 *                             cost_bucket, since a warranty claim is usually
 *                             also bucketed ARRENDADOR)
 *   - CAM                  -> APROBADO_PRORRATEO_CAM
 *   - ARRENDADOR otherwise -> APROBADO_COSTO_ARRENDADOR (a real 4th case the
 *                             old 3-verdict fixture never had to represent,
 *                             because it never drew from tickets the plaza
 *                             actually paid for directly)
 * PENDIENTE tickets are excluded — no verdict exists yet.
 */
export async function fetchCapexCases(): Promise<CapexCase[]> {
  const supabase = getSupabaseServiceClient();

  const { data: historyRows, error: historyError } = await supabase
    .from("ticket_status_history")
    .select("ticket_id")
    .eq("to_status", "needs_approval");
  if (historyError) throw new Error(historyError.message);

  const capexTicketIds = [...new Set((historyRows ?? []).map((h) => h.ticket_id as string))];
  if (capexTicketIds.length === 0) return [];

  const { data: rows, error: ticketsError } = await supabase
    .from("tickets")
    .select(
      "id, ticket_number, tenant_entity, cost_bucket, warranty_covered, skeptic_flagged, estimated_cost, final_cost, diagnosis_answer, work_performed, lease_clause_citation, asset_id",
    )
    .in("id", capexTicketIds)
    .not("cost_bucket", "is", null)
    .neq("cost_bucket", "PENDIENTE");
  if (ticketsError) throw new Error(ticketsError.message);

  const assetIds = [...new Set((rows ?? []).map((r) => r.asset_id).filter((id): id is string => !!id))];
  const assetById = new Map<string, { name: string | null; category: string | null; model: string | null; serial_number: string | null }>();
  if (assetIds.length > 0) {
    const { data: assets } = await supabase.from("assets").select("id, name, category, model, serial_number").in("id", assetIds);
    for (const a of assets ?? []) assetById.set(a.id, a);
  }

  return (rows ?? []).map((r) => {
    const asset = r.asset_id ? assetById.get(r.asset_id) : undefined;
    const amount = r.final_cost !== null ? Number(r.final_cost) : r.estimated_cost !== null ? Number(r.estimated_cost) : 0;

    let verdict: CapexVerdict;
    if (r.cost_bucket === "INQUILINO") verdict = "RECHAZADO_RESPONSABILIDAD_INQUILINO";
    else if (r.warranty_covered) verdict = "APROBADO_GARANTIA_COSTO_CERO";
    else if (r.cost_bucket === "CAM") verdict = "APROBADO_PRORRATEO_CAM";
    else verdict = "APROBADO_COSTO_ARRENDADOR";

    const details = [r.diagnosis_answer, r.work_performed, r.lease_clause_citation].filter(Boolean).join(" — ") || "Sin diagnóstico registrado.";

    return {
      id: r.id,
      ticketNumber: r.ticket_number,
      tenant: r.tenant_entity,
      expenseType: asset?.name ? `${asset.name}${asset.category ? ` (${asset.category})` : ""}` : "Sin activo asociado",
      amount,
      isQuestionable: r.skeptic_flagged,
      verdict,
      details,
      equipmentModel: asset?.model ?? "—",
      serialNumber: asset?.serial_number ?? "—",
    };
  });
}

export type CapexKpis = {
  /** Sum of RECHAZADO + GARANTIA verdicts only — money that did not hit the
   *  landlord's P&L, same formula the old fixture-backed diegoProtectedCapex
   *  used (capexRejected + capexWarrantyRecovered). Deliberately NOT
   *  extended to include APROBADO_PRORRATEO_CAM (paid by the CAM pool, not
   *  the landlord) or APROBADO_COSTO_ARRENDADOR (real landlord spend) —
   *  preserving the original definition rather than silently redefining it
   *  while just swapping in real data. */
  protectedFromPL: number;
};

export function computeCapexKpis(cases: CapexCase[]): CapexKpis {
  const protectedFromPL = cases
    .filter((c) => c.verdict === "RECHAZADO_RESPONSABILIDAD_INQUILINO" || c.verdict === "APROBADO_GARANTIA_COSTO_CERO")
    .reduce((sum, c) => sum + c.amount, 0);
  return { protectedFromPL };
}
