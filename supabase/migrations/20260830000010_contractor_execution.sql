-- supabase/migrations/20260830000010_contractor_execution.sql

-- 1. Add arrived_at to tickets for onsite SLA tracking (maintenance-dispatcher SKILL.md)
alter table public.tickets add column if not exists arrived_at timestamptz;

-- 2. Single-dispatch access tokens for contractors (no login link)
create table if not exists public.contractor_access_tokens (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  created_by text not null
);

create index if not exists contractor_access_tokens_ticket_id_idx on public.contractor_access_tokens(ticket_id);

alter table public.contractor_access_tokens enable row level security;

drop policy if exists "landlords full access" on public.contractor_access_tokens;
create policy "landlords full access" on public.contractor_access_tokens
  for all using (is_landlord());

-- 3. mark_ticket_arrived RPC — atomic arrival registration
create or replace function public.mark_ticket_arrived(
  p_ticket_id uuid,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status ticket_status;
  v_arrived_at timestamptz;
begin
  select status, arrived_at into v_status, v_arrived_at from tickets where id = p_ticket_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_status <> 'dispatched' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'previous_status', v_status);
  end if;

  if v_arrived_at is null then
    update tickets set arrived_at = now() where id = p_ticket_id;
    insert into ticket_status_history (ticket_id, from_status, to_status, note)
    values (p_ticket_id, 'dispatched', 'dispatched', 'Llegada a sitio registrada por ' || p_actor);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.mark_ticket_arrived(uuid, text) from public;
revoke all on function public.mark_ticket_arrived(uuid, text) from anon, authenticated;
grant execute on function public.mark_ticket_arrived(uuid, text) to service_role;

-- 4. Update redispatch_ticket RPC to clear arrived_at on re-dispatch
create or replace function public.redispatch_ticket(
  p_ticket_id uuid,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status ticket_status;
begin
  select status into v_status from tickets where id = p_ticket_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_status <> 'reopened' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'previous_status', v_status);
  end if;

  update tickets set status = 'dispatched', dispatched_at = now(), arrived_at = null where id = p_ticket_id;

  insert into ticket_status_history (ticket_id, from_status, to_status, note)
  values (p_ticket_id, 'reopened', 'dispatched', 'Reenviado al contratista por ' || p_actor);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.redispatch_ticket(uuid, text) from public;
revoke all on function public.redispatch_ticket(uuid, text) from anon, authenticated;
grant execute on function public.redispatch_ticket(uuid, text) to service_role;
