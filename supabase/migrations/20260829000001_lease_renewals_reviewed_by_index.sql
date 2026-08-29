-- supabase/migrations/20260829000001_lease_renewals_reviewed_by_index.sql

-- Same unindexed-FK class the prior migration closed for source_lease_id/
-- locale_id, surfaced by get_advisors after that one landed: reviewed_by
-- (references auth.users) had no covering index either.
create index lease_renewals_reviewed_by_idx on lease_renewals (reviewed_by);
