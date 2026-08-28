-- supabase/migrations/20260828010000_tenant_trade_name.sql

-- A Mexican commercial lease's declarative section names the registered
-- legal entity (razon social) as the signing ARRENDATARIO, but the roster
-- and a landlord's own vocabulary almost always use the operating brand
-- name instead ("PETCO", "Cabanna") -- two genuinely different strings for
-- the same real-world tenant, not a formatting variant tenant_entity alone
-- can represent. tenant_entity keeps carrying whichever name is currently
-- authoritative for display/matching; trade_name is the other one, when the
-- contract states both (a "operando bajo el nombre comercial de..." clause)
-- or when the roster's own tenant_entity is itself the brand name.
alter table locales
  add column trade_name text;

alter table leases
  add column trade_name text;
