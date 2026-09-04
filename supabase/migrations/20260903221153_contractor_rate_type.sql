-- Distinguishes a vendor billed a flat recurring rate from one billed
-- per-incident — contractors.rate alone doesn't say which, and Diego's
-- vendor roster needs the distinction (e.g. "4 on flat rate").

create type contractor_rate_type as enum ('FLAT', 'PER_INCIDENT');

alter table contractors
  add column rate_type contractor_rate_type;
