-- Two independent additions to `leases`:
--   - security_deposit_amount/status: previously confirmed absent from this
--     schema entirely (portfolio.server.ts's own doc comment: "leases has no
--     deposit/garantía column... had nothing real behind them and aren't
--     recreated here"). status stays free text (e.g. "completo", "incompleto",
--     "carta de crédito activa") rather than a rigid enum — the real
--     vocabulary landlords use for deposit state varies by instrument
--     (cash deposit vs. letter of credit) and isn't settled yet.
--   - agent_notes: free-text running note field for Valeria/Mariana's
--     commentary on a contract, until the real lease_clauses ledger (Phase 3)
--     gives each clause its own note instead of one blob per lease.

alter table leases
  add column security_deposit_amount numeric,
  add column security_deposit_status text,
  add column agent_notes text;
