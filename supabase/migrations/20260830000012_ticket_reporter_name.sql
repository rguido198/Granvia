-- Captures who actually reported the fault (a free-text name, not an
-- account) — distinct from tenant_entity, which names the business, not the
-- person. Nullable/optional everywhere: the WhatsApp/portal intake channels
-- this skill was designed for (maintenance-dispatcher/SKILL.md §1) may never
-- collect a name, and existing rows have none.
alter table documents add column reporter_name text;
alter table tickets add column reporter_name text;
