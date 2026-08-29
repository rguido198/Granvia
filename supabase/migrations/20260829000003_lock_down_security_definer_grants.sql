-- supabase/migrations/20260829000003_lock_down_security_definer_grants.sql

-- get_advisors flagged all three as callable by anon via /rest/v1/rpc/...
-- Checked each function body before touching anything:
--
-- is_landlord() / my_locale_id() are auth.uid()-scoped (`where id =
-- auth.uid()`) — an anon caller has no session, so auth.uid() is null and
-- both just return false/null, no cross-tenant data exposure either way.
-- But only `authenticated` has a real reason to call them: they back the
-- "landlords full access" / "tenants read own X" RLS policies, which only
-- ever run for a signed-in role. anon's grant is unused surface, not a
-- deliberate design choice, so it's revoked; authenticated keeps EXECUTE —
-- revoking that would break every RLS policy built on these two functions.
--
-- handle_new_user() is exclusively the on_auth_user_created trigger on
-- auth.users (confirmed via pg_trigger) — nothing calls it directly, and
-- trigger firing doesn't need a role-level EXECUTE grant regardless of what
-- gets revoked here. Locked down for both roles.
-- Postgres grants EXECUTE to PUBLIC by default on function creation, and
-- anon/authenticated inherit through that membership — revoking from the
-- named roles alone leaves PUBLIC's grant standing and changes nothing.
-- Revoke from PUBLIC, then re-grant authenticated explicitly on the two
-- that still need it.
revoke execute on function public.is_landlord() from public;
grant execute on function public.is_landlord() to authenticated;

revoke execute on function public.my_locale_id() from public;
grant execute on function public.my_locale_id() to authenticated;

revoke execute on function public.handle_new_user() from public;
