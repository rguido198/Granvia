-- The active lease's own running escalation schedule (rate + which month it
-- applies), distinct from lease_renewals.escalation_pct/escalation_method,
-- which describe a *proposed* renewal's terms, not what's already in force on
-- the current signed lease. escalation_method stays free text (not an enum),
-- matching lease_renewals' own convention (e.g. "fixed_pct") rather than
-- inventing a second, divergent vocabulary for the same concept.

alter table leases
  add column escalation_pct numeric,
  add column escalation_method text,
  add column escalation_month smallint check (escalation_month between 1 and 12);
