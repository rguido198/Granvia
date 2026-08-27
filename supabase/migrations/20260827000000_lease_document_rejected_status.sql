-- supabase/migrations/20260827000000_lease_document_rejected_status.sql

-- Gate 2 previously conflated two different landlord decisions under one
-- "reject" action: "re-read this same PDF, I don't trust the extraction"
-- (re-scan) vs. "discard this document entirely, promote nothing" (reject).
-- Splitting them needs a real terminal state for the second one, distinct
-- from 'failed' (an error) and from re-scanning (still in flight).
alter type document_status add value 'rejected';
