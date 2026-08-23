-- Phase 0: Diego (maintenance-dispatcher) schema
-- Supporting tables Diego's flow depends on (locales, leases, contractors, assets)
-- plus the ticket table itself and the RLEF correction log.
-- Source of truth for this schema: .claude/skills/maintenance-dispatcher/SKILL.md

create extension if not exists "pgcrypto";

create type locale_status as enum ('OCCUPIED', 'VACANT', 'PENDING_LEASE');
create type ticket_priority as enum ('P1', 'P2', 'P3', 'P4');
create type ticket_status as enum (
  'pending_triage',
  'pending_diagnosis',
  'pending_warranty_check',
  'pending_cost_attribution',
  'pending_skeptic',
  'needs_approval',
  'dispatched',
  'pending_confirmation',
  'closed',
  'closed_administrative'
);
create type cost_bucket as enum ('ARRENDADOR', 'INQUILINO', 'CAM', 'PENDIENTE');
create type approval_level as enum ('AUTO', 'GERENTE', 'DIRECCION');

create table properties (
  id uuid primary key default gen_random_uuid(),
  property_id text unique not null,
  name text not null,
  total_gla_sqm numeric not null,
  total_units integer not null,
  jurisdiction_id text not null,
  created_at timestamptz not null default now()
);

create table locales (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  unit_number text not null,
  area_sqm numeric not null,
  status locale_status not null default 'VACANT',
  tenant_entity text,
  created_at timestamptz not null default now(),
  unique (property_id, unit_number)
);

create table leases (
  id uuid primary key default gen_random_uuid(),
  lease_id text unique not null,
  locale_id uuid not null references locales (id) on delete restrict,
  tenant_entity text not null,
  permitted_use text,
  exclusive_use_clause text,
  maintenance_clause text,
  start_date date not null,
  end_date date not null,
  base_rent_monthly numeric,
  currency text not null default 'MXN',
  cam_share_basis text,
  cam_cap_controllable_pct numeric,
  admin_fee_pct numeric,
  created_at timestamptz not null default now()
);

create table contractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text not null,
  coverage_hours text,
  response_time_commitment text,
  rate numeric,
  license_expiry date,
  coi_expiry date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  locale_id uuid not null references locales (id) on delete cascade,
  make text,
  model text,
  install_date date,
  warranty_expiry date,
  service_contract_provider text,
  manual_url text,
  created_at timestamptz not null default now()
);

create table approval_tiers (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties (id) on delete cascade,
  min_amount numeric not null,
  max_amount numeric,
  level approval_level not null
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique not null,
  locale_id uuid not null references locales (id),
  tenant_entity text not null,
  reported_at timestamptz not null default now(),
  channel text,
  raw_report text not null,
  priority ticket_priority,
  sla_ack_target timestamptz,
  sla_onsite_target timestamptz,
  sla_resolution_target timestamptz,
  status ticket_status not null default 'pending_triage',
  diagnosis_question text,
  diagnosis_answer text,
  diagnosis_source text,
  asset_id uuid references assets (id),
  warranty_covered boolean,
  cost_bucket cost_bucket,
  lease_clause_citation text,
  estimated_cost numeric,
  final_cost numeric,
  approval_level approval_level,
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  contractor_id uuid references contractors (id),
  dispatched_at timestamptz,
  work_performed text,
  confirmed_by text,
  confirmed_at timestamptz,
  closed_status text,
  recurring_fault_flag boolean not null default false,
  jurisdiction_pack_ref text,
  unresolved_jd_keys text[] not null default '{}',
  workflow_run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ticket_status_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets (id) on delete cascade,
  from_status ticket_status,
  to_status ticket_status not null,
  changed_at timestamptz not null default now(),
  note text
);

create table agent_decisions (
  id uuid primary key default gen_random_uuid(),
  skill text not null,
  ticket_id uuid references tickets (id) on delete cascade,
  raw_input text not null,
  ai_draft jsonb not null,
  human_final jsonb,
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  edit_distance integer,
  created_at timestamptz not null default now()
);

create index tickets_status_idx on tickets (status);
create index tickets_locale_idx on tickets (locale_id);
create index tickets_priority_status_idx on tickets (priority, status);
create index agent_decisions_skill_ticket_idx on agent_decisions (skill, ticket_id);

-- RLS on every table, no policies yet: locks all access to service_role (the
-- orchestrator) until Phase 4 defines real per-landlord/per-tenant policies.
alter table properties enable row level security;
alter table locales enable row level security;
alter table leases enable row level security;
alter table contractors enable row level security;
alter table assets enable row level security;
alter table approval_tiers enable row level security;
alter table tickets enable row level security;
alter table ticket_status_history enable row level security;
alter table agent_decisions enable row level security;
