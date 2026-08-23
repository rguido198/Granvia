-- Phase 1: ingestion entry point. Raw PDF/photo uploads land here first —
-- before a ticket or lease application exists — so file storage, extraction
-- status, and errors have somewhere to live independent of the record they
-- eventually produce or attach to.

create type document_status as enum (
  'uploaded',
  'extracting',
  'ready_for_triage',
  'attached',
  'failed'
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('maintenance_ticket', 'lease_application')),
  source_channel text,
  original_filename text not null,
  storage_path text not null,
  mime_type text not null,
  raw_text text,
  status document_status not null default 'uploaded',
  error_message text,
  ticket_id uuid references tickets (id),
  workflow_run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_status_idx on documents (status);
create index documents_ticket_idx on documents (ticket_id);

alter table documents enable row level security;

-- Private bucket for raw uploads. No storage.objects policies yet — only
-- service_role (the backend route) can read/write until Phase 4 auth.
insert into storage.buckets (id, name, public)
values ('intake', 'intake', false)
on conflict (id) do nothing;
