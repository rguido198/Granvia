-- supabase/migrations/20260827010000_lease_source_document.sql

-- Nothing on `leases` pointed back to the digitized document that produced
-- or last updated it, so the SSOT contracts table had no way to offer
-- "Ver documento" from a lease's own row — only the digitization queue
-- (Legal tab's Digitalización de Contratos card) could show the scan.
alter table leases
  add column source_document_id uuid references documents (id) on delete set null;
