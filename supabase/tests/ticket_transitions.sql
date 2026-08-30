-- supabase/tests/ticket_transitions.sql
--
-- Manual/CI-optional integration check for the atomic ticket-transition
-- RPCs (supabase/migrations/20260829000008_ticket_transition_rpcs.sql).
-- No pgTAP or DB-test harness exists in this repo yet — plain assertions
-- via a DO block that RAISE EXCEPTION on any failure, all-or-nothing.
--
-- What this proves that a mocked route test (route.test.ts) cannot: a
-- real mismatched locale_id is actually rejected by
-- confirm_ticket_resolution() itself, with zero side effects — and that a
-- successful transition's status update and its ticket_status_history row
-- land together, atomically.
--
-- Run manually via the Supabase MCP execute_sql tool (or psql) against
-- the test project whenever this migration changes. Not wired into
-- `npm run test` — no CI Postgres instance exists for that yet. Cleans
-- up its own throwaway ticket at the end; safe to re-run.

do $$
declare
  v_locale_a uuid;
  v_locale_b uuid;
  v_ticket_id uuid;
  v_result jsonb;
  v_status text;
  v_history_count int;
begin
  select id into v_locale_a from locales order by id limit 1;
  select id into v_locale_b from locales order by id offset 1 limit 1;
  if v_locale_a is null or v_locale_b is null then
    raise exception 'need at least 2 locales in this project to run this check';
  end if;

  insert into tickets (locale_id, tenant_entity, raw_report, status, channel)
  values (
    v_locale_a,
    'TEST — ticket_transitions.sql',
    'TEST — ticket_transitions.sql',
    'pending_confirmation',
    'consola_propietario'
  )
  returning id into v_ticket_id;

  -- 1. Wrong-locale confirm is rejected, with zero side effects.
  v_result := confirm_ticket_resolution(v_ticket_id, v_locale_b, 'wrong tenant');
  if (v_result ->> 'ok') <> 'false' or (v_result ->> 'reason') <> 'forbidden' then
    raise exception 'expected {ok:false, reason:forbidden}, got %', v_result;
  end if;

  select status into v_status from tickets where id = v_ticket_id;
  if v_status <> 'pending_confirmation' then
    raise exception 'ownership-mismatch confirm must not change ticket status, found %', v_status;
  end if;

  if exists (select 1 from ticket_status_history where ticket_id = v_ticket_id) then
    raise exception 'ownership-mismatch confirm must not write a history row';
  end if;

  -- 2. Right-locale confirm succeeds — status and history land together.
  v_result := confirm_ticket_resolution(v_ticket_id, v_locale_a, 'right tenant');
  if (v_result ->> 'ok') <> 'true' then
    raise exception 'expected {ok:true}, got %', v_result;
  end if;

  select status into v_status from tickets where id = v_ticket_id;
  if v_status <> 'closed' then
    raise exception 'status did not flip to closed, found %', v_status;
  end if;

  select count(*) into v_history_count
  from ticket_status_history
  where ticket_id = v_ticket_id and to_status = 'closed';
  if v_history_count <> 1 then
    raise exception 'expected exactly 1 closed history row, found %', v_history_count;
  end if;

  raise notice 'ticket_transitions.sql: all assertions passed';

  delete from ticket_status_history where ticket_id = v_ticket_id;
  delete from tickets where id = v_ticket_id;
end;
$$;
