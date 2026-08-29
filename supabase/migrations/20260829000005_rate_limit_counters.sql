-- supabase/migrations/20260829000005_rate_limit_counters.sql

-- Replaces rate_limit_hits (20260829000004) — that table's count-then-insert
-- pattern in application code was two separate round trips, so N concurrent
-- requests could all read the same under-limit count before any of them
-- inserted, all pass, and the limit meant nothing under real concurrency.
--
-- Fixed-window counter instead: one row per (bucket_key, window_start),
-- incremented via `INSERT ... ON CONFLICT DO UPDATE ... RETURNING count`.
-- That statement takes a row lock on first insert and every concurrent
-- writer for the same bucket serializes on it — Postgres's standard atomic-
-- counter idiom, not a TOCTOU-prone read-then-write.
--
-- Trade-off: fixed windows, not sliding — a caller can burst up to 2x `max`
-- by timing requests across a window boundary. Acceptable for what this
-- guards (password-guessing throttle, upload-abuse throttle); the atomicity
-- fix is what actually mattered here, not sub-window precision.
drop table if exists rate_limit_hits;

create table rate_limit_counters (
  bucket_key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket_key, window_start)
);

create index rate_limit_counters_window_idx on rate_limit_counters (window_start);

alter table rate_limit_counters enable row level security;

-- security definer so the service-role client can call it as a plain RPC
-- without a broader grant on the table itself.
create or replace function consume_rate_limit(p_bucket_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  v_window_start := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);

  insert into rate_limit_counters (bucket_key, window_start, count)
  values (p_bucket_key, v_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set count = rate_limit_counters.count + 1
  returning count into v_count;

  -- Opportunistic cleanup of old windows for this bucket — every call is an
  -- equally good place to do it, no cron needed at this app's volume.
  delete from rate_limit_counters
  where bucket_key = p_bucket_key
    and window_start < clock_timestamp() - make_interval(secs => p_window_seconds * 4);

  return v_count <= p_max;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on function creation; only
-- the service-role client (never exposed to a browser) should be able to
-- call this, same lockdown pattern as 20260829000003.
revoke all on function consume_rate_limit(text, int, int) from public;
revoke all on function consume_rate_limit(text, int, int) from anon, authenticated;
grant execute on function consume_rate_limit(text, int, int) to service_role;
