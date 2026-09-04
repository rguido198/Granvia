-- Commercial category per locale (Anchor/Food/Retail/Service), independent of
-- occupancy — locales.status already tracks OCCUPIED/VACANT/PENDING_LEASE, so
-- this is not an "and Vacant" enum: a vacant unit keeps whatever category it
-- was built as, which is the more useful signal for backfill leasing strategy
-- ("we have a vacant Food-category slot") than collapsing category into
-- vacancy. Nullable — no auto-inference from the free-text permitted_use
-- column on leases; existing units get a one-time manual pass.

create type locale_unit_type as enum ('ANCHOR', 'FOOD', 'RETAIL', 'SERVICE', 'OTHER');

alter table locales
  add column unit_type locale_unit_type;
