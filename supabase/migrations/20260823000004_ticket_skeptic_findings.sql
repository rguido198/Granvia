-- Surfaces the skeptic pass's own findings on the ticket itself, not just
-- buried in agent_decisions.ai_draft — a flagged concern with no replacement
-- bucket escalates to PENDIENTE (src/workflows/diego-triage.ts), and a
-- landlord approving a PENDIENTE ticket should be able to see why without
-- digging through raw JSON.
alter table tickets
  add column skeptic_flagged boolean not null default false,
  add column skeptic_concerns text[] not null default '{}';
