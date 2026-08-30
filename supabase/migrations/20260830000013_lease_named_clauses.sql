-- Promotes eight recurring special_clauses labels to their own nullable text
-- columns on `leases`, mirroring exclusive_use_clause/permitted_use — see
-- lease-extraction-schema.ts for the frequency data behind this list and the
-- .strict()-schema-compatibility reasoning.

alter table leases
  add column parking_clause text,
  add column directory_advertising_clause text,
  add column expansion_option_clause text,
  add column extended_hours_clause text,
  add column signage_clause text,
  add column pets_clause text,
  add column sublease_restriction_clause text,
  add column remodeling_clause text;
