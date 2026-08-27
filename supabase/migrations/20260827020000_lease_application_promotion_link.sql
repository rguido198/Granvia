-- Threads a Mariana screening (lease_applications) forward to the real
-- `leases` row it eventually produced, once a landlord actually onboards
-- that approved applicant. `leases` stays the single authoritative source
-- for "who's the tenant, what are the terms" — this column never lets
-- lease_applications restate those facts, it only points at them, so an
-- approved screening and the resulting lease can never disagree about a
-- tenant's identity or terms.
--
-- Nullable: most applications are never promoted (rejected, or approved but
-- never followed through), and most existing `leases` rows predate Mariana
-- entirely (seed data, or hand-entered via addTenantAction with no prior
-- screening).
alter table lease_applications
  add column promoted_lease_id uuid references leases (id);

-- One application promotes to at most one lease — without this, a landlord
-- (or a bug) could link the same approved application to two different
-- onboarding actions, which would make "which lease did this screening
-- become" ambiguous instead of a single lookup.
create unique index lease_applications_promoted_lease_id_key
  on lease_applications (promoted_lease_id)
  where promoted_lease_id is not null;
