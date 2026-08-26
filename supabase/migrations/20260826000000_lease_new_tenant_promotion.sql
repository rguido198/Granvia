-- supabase/migrations/20260826000000_lease_new_tenant_promotion.sql

-- Gate 2 (lease-digitization.ts's promoteExtraction) previously had no way
-- to finish when the confirmed locale has no active `leases` row (a vacant
-- unit newly occupied): it wrote a landlord-readable error_message and left
-- `status` at 'attached', a dead end indistinguishable in the UI from a
-- normal pending review — the document just sat there unresolved forever.
--
-- New enum value used as the discriminator instead of string-matching
-- error_message: 'needs_new_lease' is a distinct resting state the panel
-- renders its own form for (tenant name / term / rent), separate from an
-- ordinary Gate 2 review of an existing lease's terms.
--
-- Postgres cannot use a value added by ALTER TYPE ... ADD VALUE in the same
-- transaction that adds it, hence this migration does nothing but add it.
alter type document_status add value 'needs_new_lease';
