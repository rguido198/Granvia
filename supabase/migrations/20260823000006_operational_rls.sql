-- Landlord: full read/write. Tenant: their own locale only, via
-- is_landlord()/my_locale_id() (Phase "real auth" migration). Tables
-- without their own locale_id (documents, agent_decisions,
-- ticket_status_history) scope through their parent ticket instead.

create policy "landlords full access" on locales for all using (is_landlord());
create policy "tenants read own locale" on locales for select using (id = my_locale_id());

create policy "landlords full access" on properties for all using (is_landlord());
create policy "tenants read own property" on properties for select using (
  id in (select property_id from locales where id = my_locale_id())
);

create policy "landlords full access" on leases for all using (is_landlord());
create policy "tenants read own lease" on leases for select using (locale_id = my_locale_id());

create policy "landlords full access" on assets for all using (is_landlord());
create policy "tenants read own assets" on assets for select using (locale_id = my_locale_id());

create policy "landlords full access" on contractors for all using (is_landlord());
create policy "tenants read contractors" on contractors for select using (my_locale_id() is not null);

create policy "landlords full access" on approval_tiers for all using (is_landlord());

create policy "landlords full access" on tickets for all using (is_landlord());
create policy "tenants read own tickets" on tickets for select using (locale_id = my_locale_id());
create policy "tenants create own tickets" on tickets for insert with check (locale_id = my_locale_id());

create policy "landlords full access" on documents for all using (is_landlord());

create policy "landlords full access" on agent_decisions for select using (is_landlord());

create policy "landlords full access" on ticket_status_history for select using (is_landlord());
create policy "tenants read own ticket history" on ticket_status_history for select using (
  ticket_id in (select id from tickets where locale_id = my_locale_id())
);
