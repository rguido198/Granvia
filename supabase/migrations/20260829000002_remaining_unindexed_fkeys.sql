-- supabase/migrations/20260829000002_remaining_unindexed_fkeys.sql

-- Rest of get_advisors' unindexed_foreign_keys sweep, same class closed for
-- lease_renewals/leases.source_document_id in the two prior migrations.
-- Postgres never auto-indexes a FK; these 18 were never covered.
create index agent_decisions_approved_by_idx on agent_decisions (approved_by);
create index agent_decisions_ticket_id_idx on agent_decisions (ticket_id);

create index approval_tiers_property_id_idx on approval_tiers (property_id);

create index assets_locale_id_idx on assets (locale_id);

create index documents_extraction_verified_by_id_idx on documents (extraction_verified_by_id);
create index documents_match_verified_by_id_idx on documents (match_verified_by_id);
create index documents_suggested_locale_id_idx on documents (suggested_locale_id);

create index invites_invited_by_idx on invites (invited_by);
create index invites_locale_id_idx on invites (locale_id);

create index lease_applications_matched_locale_id_idx on lease_applications (matched_locale_id);
create index lease_applications_reviewed_by_idx on lease_applications (reviewed_by);
create index lease_applications_target_locale_id_idx on lease_applications (target_locale_id);

create index leases_locale_id_idx on leases (locale_id);

create index profiles_locale_id_idx on profiles (locale_id);

create index ticket_status_history_ticket_id_idx on ticket_status_history (ticket_id);

create index tickets_approved_by_idx on tickets (approved_by);
create index tickets_asset_id_idx on tickets (asset_id);
create index tickets_contractor_id_idx on tickets (contractor_id);
