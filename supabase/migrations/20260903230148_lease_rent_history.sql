-- Append-only rent-change log for leases — same reasoning
-- renewal_outreach_events already established: a rent change is an event,
-- not just a mutable current value, so history isn't lost to the next
-- update. Feeds the escalation-applied audit (contract-status.ts
-- computeEscalationAudit): detecting "escalation not applied" needs to know
-- what the rent *was* before a scheduled bump, and leases.base_rent_monthly
-- only ever held the current value.
--
-- Starts empty on deploy — only rent changes made after this migration lands
-- are captured. The audit is honest about that limitation (see
-- computeEscalationAudit's own doc comment): it can't verify escalations
-- that were or weren't applied before this table existed.
create table lease_rent_history (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references leases (id),
  old_rent numeric,
  new_rent numeric not null,
  changed_at timestamptz not null default now()
);

create index lease_rent_history_lease_id_idx on lease_rent_history (lease_id);

alter table lease_rent_history enable row level security;

create policy "landlords full access" on lease_rent_history for all using (is_landlord());

-- Not security definer — same reasoning as set_updated_at (this repo's own
-- convention): every write to leases.base_rent_monthly already goes through
-- getSupabaseServiceClient() (service role, bypasses RLS), so the trigger
-- needs no elevated privilege of its own.
create or replace function public.log_rent_change()
returns trigger
language plpgsql
as $$
begin
  if new.base_rent_monthly is distinct from old.base_rent_monthly then
    insert into lease_rent_history (lease_id, old_rent, new_rent)
    values (new.id, old.base_rent_monthly, new.base_rent_monthly);
  end if;
  return new;
end;
$$;

drop trigger if exists log_rent_change on public.leases;
create trigger log_rent_change
  after update on public.leases
  for each row execute function public.log_rent_change();
