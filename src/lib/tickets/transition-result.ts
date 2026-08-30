import { NextResponse } from "next/server";

/**
 * Deliberately no "server-only" import — this is pure response-formatting
 * logic (no DB access, no secrets), same reasoning contract-status.ts
 * documents for staying free of it: keeping it importable from a plain
 * vitest run, not just a Next.js server bundle, is what lets
 * route.test.ts exist at all.
 *
 * Shared shape every ticket-transition RPC returns (mark_ticket_work_done,
 * confirm_ticket_resolution, reopen_ticket_from_confirmation,
 * redispatch_ticket, close_ticket_administratively —
 * supabase/migrations/20260829000008_ticket_transition_rpcs.sql). A
 * structured field, not an exception message to pattern-match — PostgREST
 * can mangle exception text, a typed `reason` can't drift.
 */
export type TicketTransitionResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_found" | "forbidden" | "invalid_status" | "invalid_input";
      previous_status?: string;
    };

/** Every /api/tickets/[id]/* route ends with this — one place mapping
 *  `reason` to an HTTP status, so the five routes can't drift on what
 *  each reason means. */
export function transitionResultToResponse(result: TicketTransitionResult): NextResponse {
  if (result.ok) return NextResponse.json({ ok: true });

  switch (result.reason) {
    case "not_found":
      return NextResponse.json({ error: "ticket not found" }, { status: 404 });
    case "forbidden":
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    case "invalid_status":
      return NextResponse.json(
        {
          error: result.previous_status
            ? `ticket is '${result.previous_status}' — no se puede realizar esta acción`
            : "el ticket ya cambió de estado — actualiza la vista",
        },
        { status: 409 },
      );
    case "invalid_input":
      return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  }
}
