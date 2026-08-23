-- Real auth: replaces the CONSOLA shared password (landlord) and the
-- hardcoded "first locale" resolution (tenant) with actual Supabase Auth
-- accounts, one per landlord staff member and one per tenant.

create type app_role as enum ('landlord', 'tenant');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role app_role not null,
  -- set only for role='tenant' — which unit this account may see.
  locale_id uuid references locales (id),
  full_name text,
  email text not null,
  created_at timestamptz not null default now()
);

-- security definer so these can be called from an RLS policy on `profiles`
-- itself without recursing (a policy that queries profiles from inside a
-- profiles policy deadlocks without this).
create function public.is_landlord()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'landlord');
$$;

create function public.my_locale_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select locale_id from profiles where id = auth.uid();
$$;

alter table profiles enable row level security;
create policy "read own profile" on profiles for select using (id = auth.uid());
create policy "landlords read all profiles" on profiles for select using (is_landlord());
create policy "landlords manage profiles" on profiles for all using (is_landlord());

-- Populates `profiles` automatically when an invited user completes signup.
-- inviteUserByEmail's `data` option lands in raw_user_meta_data — this is
-- how role/locale_id get set without a second round-trip after acceptance.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, locale_id, full_name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'tenant'),
    nullif(new.raw_user_meta_data->>'locale_id', '')::uuid,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role app_role not null,
  locale_id uuid references locales (id),
  invited_by uuid references profiles (id),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now()
);

alter table invites enable row level security;
create policy "landlords manage invites" on invites for all using (is_landlord());
