-- Append-only outreach log for the Contract Renewal Workspace — same
-- reasoning ticket_status_history already established: a landlord recording
-- "yo contacté al inquilino" is an event, not a mutable status field, so
-- history of what was tried isn't lost to the next update. `stage` is plain
-- text (not a DB enum), same treatment tickets.closed_status already gets —
-- validated against a fixed TS union at the route layer, so a new stage
-- later never needs an ALTER TYPE. RLS mirrors lease_renewals's own policy
-- exactly (confirmed via pg_policy): one is_landlord() policy, FOR ALL.
create table renewal_outreach_events (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references leases (id),
  stage text not null,
  note text,
  actor text not null,
  created_at timestamptz not null default now()
);

create index renewal_outreach_events_lease_id_idx on renewal_outreach_events (lease_id);

alter table renewal_outreach_events enable row level security;

create policy "landlords full access" on renewal_outreach_events for all using (is_landlord());
