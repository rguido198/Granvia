-- supabase/migrations/20260830000011_lead_pipeline.sql

-- 1. Create leads table
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  applicant_entity text not null,
  category text not null,
  target_locale_id uuid references public.locales(id) on delete set null,
  contact_channel text,
  source text,
  notes text,
  stage text not null default 'contacted',
  lost_reason text,
  converted_application_id uuid references public.lease_applications(id) on delete set null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_target_locale_id_idx on public.leads(target_locale_id);
create index if not exists leads_stage_idx on public.leads(stage);

alter table public.leads enable row level security;

drop policy if exists "landlords full access" on public.leads;
create policy "landlords full access" on public.leads
  for all using (is_landlord());

drop trigger if exists set_updated_at on public.leads;
create trigger set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- 2. Create lead_stage_history table
create table if not exists public.lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  note text,
  actor text not null,
  changed_at timestamptz not null default now()
);

create index if not exists lead_stage_history_lead_id_idx on public.lead_stage_history(lead_id);

alter table public.lead_stage_history enable row level security;

drop policy if exists "landlords full access" on public.lead_stage_history;
create policy "landlords full access" on public.lead_stage_history
  for all using (is_landlord());

-- 3. Add source_lead_id to lease_applications
alter table public.lease_applications
  add column if not exists source_lead_id uuid references public.leads(id) on delete set null;
