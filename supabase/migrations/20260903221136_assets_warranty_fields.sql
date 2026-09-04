-- Extend assets table to support warranty tracking and equipment intake
alter table assets
  add column if not exists name text,
  add column if not exists category text default 'GENERAL',
  add column if not exists serial_number text,
  add column if not exists coverage_summary text,
  add column if not exists status text default 'ACTIVE',
  add column if not exists source_document_id uuid references documents (id) on delete set null;

create index if not exists assets_category_idx on assets (category);
create index if not exists assets_warranty_expiry_idx on assets (warranty_expiry);
