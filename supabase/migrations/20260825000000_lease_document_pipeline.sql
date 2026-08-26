-- supabase/migrations/20260825000000_lease_document_pipeline.sql

-- 'kind' already exists (text not null check (kind in ('maintenance_ticket','lease_application')))
-- — extend the constraint, do not add a duplicate column.
alter table documents drop constraint documents_kind_check;
alter table documents add constraint documents_kind_check
  check (kind in ('maintenance_ticket', 'lease_application', 'active_lease'));

alter table documents
  -- Gate 1: entity reconciliation (the tenant/locale match)
  add column suggested_locale_id uuid references locales (id) on delete set null,
  add column match_confidence numeric(3,2),
  add column locale_id uuid references locales (id) on delete set null,
  add column match_verified_at timestamptz,
  add column match_verified_by_id uuid references profiles (id),

  -- Gate 2: extraction accuracy
  add column extracted_fields jsonb not null default '{}'::jsonb,
  add column extraction_verified_at timestamptz,
  add column extraction_verified_by_id uuid references profiles (id);

create index documents_locale_idx on documents (locale_id);
create index documents_extracted_fields_gin on documents using gin (extracted_fields);

alter table leases
  add column responsibility_matrix jsonb,
  add column notice_period_days integer;
