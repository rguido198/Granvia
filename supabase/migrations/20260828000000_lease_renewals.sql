-- Mariana's renewal-drafting (lease-renewal-drafter SKILL.md), mirroring
-- lease_applications' shape — a draft for landlord review, never a live
-- write onto `leases`. Applying an approved renewal to the actual lease
-- (once the tenant has countersigned) is a separate, later action —
-- out of scope here, same boundary the skill itself states.
create type lease_renewal_status as enum ('needs_landlord_review', 'approved', 'rejected');

create table lease_renewals (
  id uuid primary key default gen_random_uuid(),
  renewal_number text unique not null,
  source_lease_id uuid not null references leases (id),
  locale_id uuid not null references locales (id),
  tenant_entity text not null,
  current_end_date date not null,
  new_start_date date not null,
  new_end_date date not null,
  current_base_rent_monthly numeric,
  new_base_rent_monthly numeric not null,
  -- Landlord-supplied, never invented by the model — same discipline as
  -- addTenantAction/NewLeaseForm: Claude drafts the legal prose around a
  -- figure a human gave it, it does not compute or guess rent numbers.
  escalation_pct numeric,
  escalation_method text not null,
  draft_markdown text not null,
  skeptic_flagged boolean not null default false,
  skeptic_concerns text[] not null default '{}',
  jurisdiction_pack_ref text,
  unresolved_jd_keys text[] not null default '{}',
  status lease_renewal_status not null default 'needs_landlord_review',
  workflow_run_id text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence lease_renewal_number_seq start 1;
alter table lease_renewals
  alter column renewal_number
  set default ('REN-' || lpad(nextval('lease_renewal_number_seq')::text, 3, '0'));

alter table lease_renewals enable row level security;

create policy "landlords full access" on lease_renewals for all using (is_landlord());
