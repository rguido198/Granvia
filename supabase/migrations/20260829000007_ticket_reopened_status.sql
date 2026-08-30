-- supabase/migrations/20260829000007_ticket_reopened_status.sql

-- "El problema continúa" — the tenant's own rejection of a landlord-marked
-- completion — needs a real lifecycle state, not a status.dispatched
-- reuse with a history note. A reopened ticket is distinct from a fresh
-- dispatch: it's a landlord decision point (re-dispatch to the same
-- contractor, or close administratively), and STATUS_LABEL/STATUS_BADGE
-- style Records in this codebase are typed off this same enum, so adding
-- the value here is what makes `tsc` find every place that needs to
-- handle it.
--
-- Own migration file, not folded into the next one: Postgres disallows
-- using a brand-new enum value inside the same transaction it was added
-- in for some contexts (e.g. referencing it in a function body created in
-- the same transaction) — splitting removes any doubt.
alter type ticket_status add value 'reopened' after 'pending_confirmation';
