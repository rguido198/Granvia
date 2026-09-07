-- escalation_method was deliberately left free text at
-- 20260903221148_lease_escalation_schedule.sql ("matching lease_renewals'
-- own convention rather than inventing a second vocabulary"). In practice
-- exactly two values are ever written anywhere in the codebase —
-- "fixed_pct" (a matched %, or Mariana's renewal-drafting default) and
-- "landlord_specified" (draft-renewal route's flat-rent override) — and
-- four different UI components each render their own ad-hoc fallback
-- string for anything else. Confirmed via the live data before adding this
-- constraint: leases.escalation_method is null|'fixed_pct' only,
-- lease_renewals.escalation_method is 'fixed_pct' only. Constraining now,
-- while zero landlord-committed escalation schedules exist yet (the
-- backfill flow this migration precedes), is free; doing it after is a
-- data migration.

alter table leases
  add constraint leases_escalation_method_check
  check (escalation_method is null or escalation_method in ('fixed_pct', 'landlord_specified'));

alter table lease_renewals
  add constraint lease_renewals_escalation_method_check
  check (escalation_method in ('fixed_pct', 'landlord_specified'));
