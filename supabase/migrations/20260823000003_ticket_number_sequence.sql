-- Atomic ticket numbering (#INC-NNN, per maintenance-dispatcher/SKILL.md's
-- own convention). A sequence-backed default avoids the race condition of
-- computing "count + 1" in application code under concurrent inserts.
create sequence ticket_number_seq start 1;

alter table tickets
  alter column ticket_number
  set default ('INC-' || lpad(nextval('ticket_number_seq')::text, 3, '0'));
