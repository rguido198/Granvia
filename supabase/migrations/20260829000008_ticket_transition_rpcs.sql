-- supabase/migrations/20260829000008_ticket_transition_rpcs.sql

-- The two routes this replaces (mark-resolved, confirm-resolved) did
-- read-status, then update, then insert-history as three separate round
-- trips — two concurrent clicks could duplicate a history row or race
-- past each other, and a history-insert failure after a successful update
-- would leave a state change with no audit entry. Every transition below
-- is one function call = one Postgres transaction: `select ... for update`
-- locks the row and reads its current status, every check runs against
-- that locked read, and the status write + history insert happen in the
-- same statement block — a concurrent second call blocks on the lock
-- until the first transaction commits, then correctly sees the new status
-- and returns invalid_status rather than double-transitioning.
--
-- Every function returns jsonb — {"ok": true} or {"ok": false, "reason":
-- ..., "previous_status": ...} — instead of raising exceptions with a
-- message the calling route would have to pattern-match. `reason` is one
-- of: not_found, forbidden, invalid_status, invalid_input.
--
-- Same lockdown as consume_rate_limit (20260829000005): security
-- definer, fixed search_path, revoked from public/anon/authenticated,
-- granted only to service_role — every calling route already uses
-- getSupabaseServiceClient().

create or replace function public.mark_ticket_work_done(
  p_ticket_id uuid,
  p_actor text,
  p_work_performed text,
  p_final_cost numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status ticket_status;
  v_work text;
begin
  v_work := trim(coalesce(p_work_performed, ''));
  if length(v_work) < 1 or length(v_work) > 2000 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_input');
  end if;
  if p_final_cost is not null and (p_final_cost < 0 or p_final_cost > 10000000) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_input');
  end if;

  select status into v_status from tickets where id = p_ticket_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_status <> 'dispatched' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'previous_status', v_status);
  end if;

  update tickets
  set status = 'pending_confirmation', work_performed = v_work, final_cost = p_final_cost
  where id = p_ticket_id;

  insert into ticket_status_history (ticket_id, from_status, to_status, note)
  values (p_ticket_id, 'dispatched', 'pending_confirmation', 'Trabajo marcado como terminado por ' || p_actor);

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.confirm_ticket_resolution(
  p_ticket_id uuid,
  p_locale_id uuid,
  p_confirmed_by text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status ticket_status;
  v_locale_id uuid;
begin
  select status, locale_id into v_status, v_locale_id from tickets where id = p_ticket_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_locale_id <> p_locale_id then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if v_status <> 'pending_confirmation' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'previous_status', v_status);
  end if;

  update tickets
  set status = 'closed', confirmed_by = p_confirmed_by, confirmed_at = now(), closed_status = 'resuelto'
  where id = p_ticket_id;

  insert into ticket_status_history (ticket_id, from_status, to_status, note)
  values (p_ticket_id, 'pending_confirmation', 'closed', 'Confirmado como resuelto por ' || p_confirmed_by);

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.reopen_ticket_from_confirmation(
  p_ticket_id uuid,
  p_locale_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status ticket_status;
  v_locale_id uuid;
  v_note text;
begin
  v_note := trim(coalesce(p_note, ''));
  if length(v_note) < 1 or length(v_note) > 2000 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_input');
  end if;

  select status, locale_id into v_status, v_locale_id from tickets where id = p_ticket_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_locale_id <> p_locale_id then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if v_status <> 'pending_confirmation' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'previous_status', v_status);
  end if;

  update tickets set status = 'reopened' where id = p_ticket_id;

  insert into ticket_status_history (ticket_id, from_status, to_status, note)
  values (p_ticket_id, 'pending_confirmation', 'reopened', 'Inquilino reporta que el problema continúa: ' || v_note);

  return jsonb_build_object('ok', true);
end;
$$;

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

  -- A re-dispatch is a new repair attempt, not a continuation of the
  -- first one — dispatched_at moves forward. work_performed/final_cost
  -- from the prior attempt stay on the row untouched, as evidence of
  -- what didn't hold; mark_ticket_work_done overwrites them when this
  -- attempt is itself marked done.
  update tickets set status = 'dispatched', dispatched_at = now() where id = p_ticket_id;

  insert into ticket_status_history (ticket_id, from_status, to_status, note)
  values (p_ticket_id, 'reopened', 'dispatched', 'Reenviado al contratista por ' || p_actor);

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.close_ticket_administratively(
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
  if v_status not in ('pending_confirmation', 'reopened') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'previous_status', v_status);
  end if;

  update tickets set status = 'closed_administrative', closed_status = 'cerrado_administrativo' where id = p_ticket_id;

  insert into ticket_status_history (ticket_id, from_status, to_status, note)
  values (p_ticket_id, v_status, 'closed_administrative', 'Cerrado administrativamente por ' || p_actor || ' — sin respuesta del inquilino');

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.mark_ticket_work_done(uuid, text, text, numeric) from public;
revoke all on function public.mark_ticket_work_done(uuid, text, text, numeric) from anon, authenticated;
grant execute on function public.mark_ticket_work_done(uuid, text, text, numeric) to service_role;

revoke all on function public.confirm_ticket_resolution(uuid, uuid, text) from public;
revoke all on function public.confirm_ticket_resolution(uuid, uuid, text) from anon, authenticated;
grant execute on function public.confirm_ticket_resolution(uuid, uuid, text) to service_role;

revoke all on function public.reopen_ticket_from_confirmation(uuid, uuid, text) from public;
revoke all on function public.reopen_ticket_from_confirmation(uuid, uuid, text) from anon, authenticated;
grant execute on function public.reopen_ticket_from_confirmation(uuid, uuid, text) to service_role;

revoke all on function public.redispatch_ticket(uuid, text) from public;
revoke all on function public.redispatch_ticket(uuid, text) from anon, authenticated;
grant execute on function public.redispatch_ticket(uuid, text) to service_role;

revoke all on function public.close_ticket_administratively(uuid, text) from public;
revoke all on function public.close_ticket_administratively(uuid, text) from anon, authenticated;
grant execute on function public.close_ticket_administratively(uuid, text) to service_role;
