-- Mariana's real schema (lease-screener/SKILL.md). `leases` already existed
-- from the original schema pass but was never populated beyond one fixture
-- row (LOC-12) — this migration adds the other half: incoming applicant
-- screening requests and Mariana's verdict on each, mirroring `tickets`'
-- shape (status/watermark/skeptic-findings/workflow_run_id) since both are
-- the same pattern — draft, self-audit, escalate ambiguity, gate on a human.
create type lease_risk_level as enum ('ALTO', 'MEDIO', 'BAJO');
create type lease_application_status as enum (
  'pending_triage',
  'needs_landlord_review',
  'approved',
  'rejected'
);

create table lease_applications (
  id uuid primary key default gen_random_uuid(),
  application_number text unique not null,
  target_locale_id uuid not null references locales (id),
  source_channel text,
  applicant_entity text not null,
  category text not null,
  subcategory text,
  -- Itemized, not a category label — SKILL.md §2A: "this is the critical
  -- input for the exclusive-use audit, not the category label."
  products text[] not null default '{}',
  requested_sqm numeric,
  desired_term_years numeric,
  raw_application text not null,
  status lease_application_status not null default 'pending_triage',
  -- 🔴 ALTO / 🟡 MEDIO / 🟢 BAJO per SKILL.md §2B's risk table.
  risk_level lease_risk_level,
  matched_locale_id uuid references locales (id),
  matched_clause_text text,
  -- Array of {applicant_product, protected_term} pairs — SKILL.md §2B:
  -- "State the matched pair... a risk level with no cited word-pair is not
  -- reviewable."
  matched_product_pairs jsonb,
  category_fit_score numeric,
  yield_score numeric,
  term_stability_score numeric,
  match_score numeric,
  -- The rendered Case A (conflict memo) or Case B (proposal draft), SKILL.md
  -- §4 — never sent to the applicant, always staged for landlord review.
  draft_markdown text,
  skeptic_flagged boolean not null default false,
  skeptic_concerns text[] not null default '{}',
  jurisdiction_pack_ref text,
  unresolved_jd_keys text[] not null default '{}',
  workflow_run_id text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence lease_application_number_seq start 1;
alter table lease_applications
  alter column application_number
  set default ('APP-' || lpad(nextval('lease_application_number_seq')::text, 3, '0'));

alter table lease_applications enable row level security;

-- Landlord-only — screening applicants never authenticate into this system,
-- and per SKILL.md this is never surfaced to incumbent tenants either.
create policy "landlords full access" on lease_applications for all using (is_landlord());
