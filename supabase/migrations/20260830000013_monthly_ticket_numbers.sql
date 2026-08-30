-- Replaces the flat, never-resetting global sequence (INC-013) with a
-- month-scoped counter that also stamps when the ticket was created
-- (INC-0226-0018 = created Feb 2026, 18th ticket that month). A counter
-- table + an atomic upsert avoids the same "count+1" race the original
-- ticket_number_seq migration's own comment already called out — INSERT ...
-- ON CONFLICT DO UPDATE ... RETURNING is row-locked, safe under concurrent
-- ticket creation within the same month.
--
-- Existing tickets keep their old-style INC-NNN numbers as-is — this only
-- changes the default applied to new rows going forward, not a retroactive
-- renumbering.
create table ticket_number_counters (
  year_month text primary key, -- 'MMYY', e.g. '0226' for Feb 2026
  last_number int not null default 0
);

create function next_ticket_number() returns text as $$
declare
  ym text := to_char(now(), 'MMYY');
  seq int;
begin
  insert into ticket_number_counters (year_month, last_number)
  values (ym, 1)
  on conflict (year_month) do update set last_number = ticket_number_counters.last_number + 1
  returning last_number into seq;
  return 'INC-' || ym || '-' || lpad(seq::text, 4, '0');
end;
$$ language plpgsql;

alter table tickets
  alter column ticket_number
  set default next_ticket_number();

drop sequence if exists ticket_number_seq;
