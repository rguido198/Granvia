-- supabase/migrations/20260829000000_lease_renewal_indexes.sql

-- lease_renewals (20260828000000) and leases.source_document_id
-- (20260827010000) shipped without the FK/status indexes every other table
-- in this schema carries for its own filtered/joined columns (see
-- tickets_status_idx, tickets_locale_idx, documents_locale_idx). Postgres
-- never auto-indexes a foreign key, so both were full-table-scanning.
-- portfolio.server.ts already fetches all of lease_renewals unfiltered
-- today (fine at current size) and groups by source_lease_id in memory —
-- these indexes are ahead of that query, not fixing a live slowdown, but
-- match the codebase's existing convention of indexing at migration time
-- rather than after a scan shows up in production.
create index lease_renewals_source_lease_idx on lease_renewals (source_lease_id);
create index lease_renewals_locale_idx on lease_renewals (locale_id);
create index lease_renewals_status_idx on lease_renewals (status);

create index leases_source_document_idx on leases (source_document_id);

-- The skeptic-audit prompt in lease-renewal.ts is expected to catch a
-- nonsensical date range, but nothing stopped a bad write from reaching the
-- table underneath it — the same "don't trust the model on something
-- checkable in code" principle relevance.ts's own comment invokes.
alter table lease_renewals
  add constraint lease_renewals_new_end_after_start
  check (new_end_date > new_start_date);
