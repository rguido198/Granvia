-- Landlord-set quarterly maintenance spend cap, plaza-wide — single-property
-- deployment (root CLAUDE.md §5, same assumption settings.server.ts's
-- fetchAutonomyState already documents), so one column on the one properties
-- row, not a separate settings table. Nullable: no cap set until a landlord
-- configures one, rather than defaulting to a number nobody chose.

alter table properties
  add column maintenance_quarterly_budget_mxn numeric;
