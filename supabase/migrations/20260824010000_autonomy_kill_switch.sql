-- Real persistence for the RBAC tab's emergency kill-switch. Previously the
-- toggle was local React state only — flipping it did not touch Diego's
-- autonomous-dispatch decision at all, so the UI claimed an effect it never had.
alter table properties
  add column autonomy_frozen boolean not null default false,
  add column autonomy_frozen_by text,
  add column autonomy_frozen_at timestamptz;
