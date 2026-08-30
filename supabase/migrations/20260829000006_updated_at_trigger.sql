-- supabase/migrations/20260829000006_updated_at_trigger.sql

-- documents, lease_applications, lease_renewals, and tickets all have an
-- updated_at column that only ever got a value from `default now()` on
-- insert — nothing set it on UPDATE. Confirmed via information_schema:
-- these are the only 4 public tables with the column. Found live this
-- session building the tenant portal's "updated since last visit"
-- indicator, which depends on updated_at actually changing when a
-- ticket's status does.
--
-- Not security definer — a trigger just stamping the row it's already
-- firing on (as part of an UPDATE the caller already had permission to
-- run) needs no elevated privilege. Only the transition RPCs in the next
-- migration do.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- drop-then-create rather than a bare CREATE TRIGGER: safe to re-run
-- against a project where this already landed, rather than erroring.
drop trigger if exists set_updated_at on public.documents;
create trigger set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.lease_applications;
create trigger set_updated_at
  before update on public.lease_applications
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.lease_renewals;
create trigger set_updated_at
  before update on public.lease_renewals
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.tickets;
create trigger set_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();
