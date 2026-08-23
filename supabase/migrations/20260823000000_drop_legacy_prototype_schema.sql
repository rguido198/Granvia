-- Removes a pre-existing prototype schema found in the "Landlord OS Master"
-- test project on first Phase 0 run: a multi-tenant design (clients.client_id
-- FK'd everywhere) referencing agents (Valeria, Mateo) not in this OS's
-- current skill set (.claude/skills/). Confirmed stale and safe to drop
-- before applying the Diego (maintenance-dispatcher) schema.
drop table if exists
  lease_embeddings,
  agent_trajectories,
  agent_memory,
  delinquency_ledger,
  maintenance_ledger,
  vendor_compliance,
  leases,
  tenants,
  units,
  contractors,
  properties,
  clients
cascade;
