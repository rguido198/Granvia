-- Per-clause ledger for Mariana's Legal screen — replaces nothing (the 8
-- named-clause columns + exclusive_use_clause on `leases` stay as the
-- fast-lookup path computeContractAggregates() and Copiloto already read;
-- this is the separate, granular audit view, decided to coexist rather than
-- replace on 2026-09-03). Auto-generated at digitization time from the same
-- `special_clauses` array lease-extraction.ts already produces
-- (documents.extracted_fields.special_clauses) — promoteExtraction
-- (workers/workflows/src/lease-digitization.ts) replaces a lease's full set
-- on every (re-)digitization rather than accumulating duplicates across
-- re-extractions.
create type lease_clause_review_status as enum ('needs_counsel', 'awaiting_reading', 'up_to_date', 'ready_to_redo');

create table lease_clauses (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references leases (id) on delete cascade,
  source_document_id uuid references documents (id) on delete set null,
  -- 1-based position within the source document's special_clauses array at
  -- extraction time — not a literal contract clause number (the extraction
  -- schema carries no such field), a stable-enough proxy for "clause 9 of 22".
  clause_number integer not null,
  clause_label text not null,
  clause_text text not null,
  review_status lease_clause_review_status not null default 'awaiting_reading',
  flagged boolean not null default false,
  agent_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lease_clauses_lease_id_idx on lease_clauses (lease_id);

alter table lease_clauses enable row level security;
create policy "landlords full access" on lease_clauses for all using (is_landlord());

drop trigger if exists set_updated_at on public.lease_clauses;
create trigger set_updated_at
  before update on public.lease_clauses
  for each row execute function public.set_updated_at();
