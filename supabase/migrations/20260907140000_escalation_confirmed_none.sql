-- The escalation backfill flow (one row per lease, pre-filled from the
-- contract's own mined clause via findEscalationClause) needs a way to
-- record "landlord reviewed this lease and confirmed the contract has no
-- escalation clause" — distinct from escalation_month simply being null,
-- which today means either "never reviewed" or "confirmed none," making
-- the two indistinguishable. Without this column, marking a lease
-- reviewed-no-escalation would leave it looking identical to one nobody
-- has ever looked at, and it would keep showing up as an open gap forever.

alter table leases
  add column escalation_confirmed_none boolean not null default false;
