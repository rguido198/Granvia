-- supabase/migrations/20260829000004_rate_limit_hits.sql

-- Backs src/lib/security/rate-limit.ts — a sliding-window request counter
-- for the two endpoints an unauthenticated caller can hit: /api/site-auth
-- (password guessing) and /api/ingest's open kinds (storage/AI-cost abuse).
-- No in-memory counter works here: each serverless invocation is its own
-- process, so a per-IP count has to live somewhere every invocation can see.
create table rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket_key text not null,
  created_at timestamptz not null default now()
);

-- Every check is "count rows for this bucket_key newer than X" — bucket_key
-- first, created_at second, matches that access pattern exactly.
create index rate_limit_hits_bucket_created_idx on rate_limit_hits (bucket_key, created_at);

-- Only the service-role client (src/lib/supabase/server.ts) ever touches
-- this table — no anon/authenticated policy needed, RLS stays enabled with
-- no grants so a client-side key can't read or pad another caller's count.
alter table rate_limit_hits enable row level security;
