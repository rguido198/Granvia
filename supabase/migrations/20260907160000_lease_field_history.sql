-- Closes the audit-trail gap named while auditing this session's own new
-- write paths: fetchAuditLog() (src/lib/platform/audit-log.server.ts) only
-- ever derived from ticket_status_history, agent_decisions,
-- lease_applications, and properties — a landlord's own manual edits to
-- `leases` fields (escalation terms, CAM terms, security deposit, agent
-- notes) left no trace anywhere. Same append-only-log-over-trigger pattern
-- as lease_rent_history (20260903230148_lease_rent_history.sql), covering
-- every column real actions in this codebase actually write.
--
-- Attribution needs a column, not just a trigger: every write to `leases`
-- goes through getSupabaseServiceClient() (service role), which carries no
-- Postgres auth.uid() session context, so the trigger alone cannot know
-- which landlord made a change. `updated_by` is a transient "who's writing
-- right now" column, set by the app in the same UPDATE as the real field
-- change (same convention tickets.approved_by / lease_renewals.reviewed_by
-- already use) — the trigger reads NEW.updated_by to attribute the history
-- row, then the value itself is superseded by the next write. It is not
-- itself a history of "who last touched this lease at all," only the
-- source the trigger reads from.
alter table leases add column updated_by uuid references profiles (id);

create table lease_field_history (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references leases (id),
  field_name text not null,
  old_value text,
  new_value text,
  changed_by uuid references profiles (id),
  changed_at timestamptz not null default now()
);

create index lease_field_history_lease_id_idx on lease_field_history (lease_id);

alter table lease_field_history enable row level security;

create policy "landlords full access" on lease_field_history for all using (is_landlord());

-- Not security definer — same reasoning as log_rent_change (this repo's own
-- convention): every write to `leases` already goes through
-- getSupabaseServiceClient() (service role, bypasses RLS), so the trigger
-- needs no elevated privilege of its own.
create or replace function public.log_lease_field_change()
returns trigger
language plpgsql
as $$
begin
  if new.escalation_pct is distinct from old.escalation_pct then
    insert into lease_field_history (lease_id, field_name, old_value, new_value, changed_by)
    values (new.id, 'escalation_pct', old.escalation_pct::text, new.escalation_pct::text, new.updated_by);
  end if;
  if new.escalation_month is distinct from old.escalation_month then
    insert into lease_field_history (lease_id, field_name, old_value, new_value, changed_by)
    values (new.id, 'escalation_month', old.escalation_month::text, new.escalation_month::text, new.updated_by);
  end if;
  if new.escalation_method is distinct from old.escalation_method then
    insert into lease_field_history (lease_id, field_name, old_value, new_value, changed_by)
    values (new.id, 'escalation_method', old.escalation_method, new.escalation_method, new.updated_by);
  end if;
  if new.escalation_confirmed_none is distinct from old.escalation_confirmed_none then
    insert into lease_field_history (lease_id, field_name, old_value, new_value, changed_by)
    values (new.id, 'escalation_confirmed_none', old.escalation_confirmed_none::text, new.escalation_confirmed_none::text, new.updated_by);
  end if;
  if new.cam_share_basis is distinct from old.cam_share_basis then
    insert into lease_field_history (lease_id, field_name, old_value, new_value, changed_by)
    values (new.id, 'cam_share_basis', old.cam_share_basis, new.cam_share_basis, new.updated_by);
  end if;
  if new.cam_cap_controllable_pct is distinct from old.cam_cap_controllable_pct then
    insert into lease_field_history (lease_id, field_name, old_value, new_value, changed_by)
    values (new.id, 'cam_cap_controllable_pct', old.cam_cap_controllable_pct::text, new.cam_cap_controllable_pct::text, new.updated_by);
  end if;
  if new.admin_fee_pct is distinct from old.admin_fee_pct then
    insert into lease_field_history (lease_id, field_name, old_value, new_value, changed_by)
    values (new.id, 'admin_fee_pct', old.admin_fee_pct::text, new.admin_fee_pct::text, new.updated_by);
  end if;
  if new.security_deposit_amount is distinct from old.security_deposit_amount then
    insert into lease_field_history (lease_id, field_name, old_value, new_value, changed_by)
    values (new.id, 'security_deposit_amount', old.security_deposit_amount::text, new.security_deposit_amount::text, new.updated_by);
  end if;
  if new.security_deposit_status is distinct from old.security_deposit_status then
    insert into lease_field_history (lease_id, field_name, old_value, new_value, changed_by)
    values (new.id, 'security_deposit_status', old.security_deposit_status, new.security_deposit_status, new.updated_by);
  end if;
  if new.agent_notes is distinct from old.agent_notes then
    insert into lease_field_history (lease_id, field_name, old_value, new_value, changed_by)
    values (new.id, 'agent_notes', old.agent_notes, new.agent_notes, new.updated_by);
  end if;
  return new;
end;
$$;

drop trigger if exists log_lease_field_change on public.leases;
create trigger log_lease_field_change
  after update on public.leases
  for each row execute function public.log_lease_field_change();
