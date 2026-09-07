-- Supports the renewal diff view (/consola/renovaciones/[id]): three small
-- additions to lease_renewals, none of them a new concept —
--   - rejection_reason: captured when a landlord rejects a draft
--     (/api/workflow/approve-lease-renewal), so a later redraft's diff view
--     can quote why the prior version was rejected instead of just showing
--     a "Rechazada" badge with no context.
--   - last_edited_by / last_edited_reasoning: set when Valeria's
--     propose_renewal_edit → updateRenewalFieldAction path (ask-copiloto.ts
--     §"Valeria's conversational-edit capability") lands a change, so the
--     diff view can attribute a changed row to "Valeria AI" with her stated
--     reasoning instead of defaulting every row to "Mariana AI" regardless
--     of who actually touched it last.
--   - landlord_feedback: a lightweight "request changes" note a landlord can
--     leave on a draft without rejecting it outright (still
--     needs_landlord_review) or approving it — for whoever redrafts next.
alter table lease_renewals
  add column rejection_reason text,
  add column last_edited_by text,
  add column last_edited_reasoning text,
  add column landlord_feedback text;
