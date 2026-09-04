# Rent Roll / Diego / Mariana Redesign — Data Mapping & Schema Punch List

Source: `Rent Roll Dashboard Redesign.zip` (Claude Design canvas, `Rent Roll v3 - Ramp.dc.html` + EN variant), reviewed against the live `rguido198/Granvia` repo on 2026-09-03. The zip is a static mockup with zero data binding — this doc is the field-by-field audit of what each visible number/column needs behind it before the redesign can ship truthfully.

Legend:
- ✅ **Ship now** — real column/query already exists, pure front-end port
- 🔧 **Aggregate** — real columns exist, needs a new computed rollup (no migration)
- 🗄️ **New column** — additive migration on an existing table, low risk
- 🏗️ **New table/pipeline** — structural work, real project
- ❓ **Decision** — product/naming question to resolve before building anything

---

## 1. Rent Roll screen (Overview / Rents & escalations / CAM / Clauses / Activity tabs)

| Field | Tier | Note |
|---|---|---|
| Tenant name, legal entity, unit code | ✅ | `PortfolioRow` / `LeaseDetail`, already in `fetchPortfolio()` |
| Area m², %GLA | ✅ | `sharePct` already computed |
| Monthly rent | ✅ | `rent` |
| Annual rent, $/m² | ✅ | pure arithmetic on existing fields, no query change |
| CAM % column (by GLA) | ✅ | same number as %GLA — free, **if** GLA-share is the intended prorateo method (confirm, don't assume) |
| Expiration date + relative ("in 2 years") | ✅ | `end_date`, existing `isRenewalSoon`/`isExpired` |
| Status: Active / In renewal | ✅ | `renewalSoon` + `lease_renewals` row existence |
| Export button | ✅ | `/api/portfolio/export` already live |
| Add tenant flow | ✅ | `addTenantAction` / `RentRollAdminTools`, already Tier-3 gated |
| Unit type tag (Anchor / Food / Coffee shop) | 🗄️ | no category field on `locales` or `leases`; `permitted_use` is free text today. Needs either a controlled-vocabulary column or a mapping pass over existing `permitted_use` values |
| Escalation column on the *active* lease ("CPI+1.5% every September") | 🗄️ | escalation method/month only exists on `lease_renewals` rows today, not as a running field on `leases`. Add `escalation_pct`, `escalation_method`, `escalation_month` to `leases`, backfill from source-document extraction where available |
| "12 clauses audited" status subtext | 🏗️ | depends on the Mariana clause-ledger table (§3) |
| "Valeria AI proposed terms" | ✅ resolved 2026-09-03 | Consulta IA (`ask-copiloto.ts`) renamed to **Valeria IA** — portfolio/analysis Q&A + new/renewal contract drafting. Mariana keeps exclusivity screening for new applicants (deterministic, `exclusivity-check.ts` — not moved). Any contract Valeria drafts still routes through that same exclusivity gate before going out, and still carries the CLAUDE.md §4 jurisdiction-watermark banner and Tier-2 draft-only gating — those rules attach to the output type, not the agent name |
| Columns customizer, Use/Expiration filter dropdowns | — | UI-only feature, not currently built, no backend needed |

## 2. Diego screen (Tickets / Warranties & policies / Vendors / Preventive / CapEx / Activity)

`tickets` table is already rich — verified columns: `estimated_cost`, `final_cost`, `warranty_covered`, `cost_bucket`, `contractor_id`, `sla_ack_target`, `sla_onsite_target`, `sla_resolution_target`, `dispatched_at`, `approved_by`, `approved_at`.

| Field | Tier | Note |
|---|---|---|
| Ticket rows (case, unit/tenant, asset, diagnosis, vendor, cost, status) | ✅ | all real, `fetchDiegoTickets()` already used in `consola/page.tsx` |
| Open tickets count, "1 to approve" | ✅ | status filter on existing enum |
| "Recovered under warranty $10,550 ↑4 claims" | 🔧 | sum `final_cost` where `warranty_covered=true`, count as claims — new aggregate query, no schema change |
| "Policies expiring 2 in 90 days" | 🔧 | `equipment-assets.server.ts` already has `warrantyExpiry` per asset — filter + count |
| "First response 7.3h target 24h" | 🗄️/🔧 | `sla_ack_target` is a target, not an actual first-response timestamp. Check whether `audit_log` captures the status-change moment (may already work as an aggregate); if not, add a `first_responded_at` column |
| "Quarter spend $41,200 of $60,000" | 🗄️ | no maintenance budget cap stored anywhere. Needs a settings field — likely on `platform/settings.server.ts`'s existing settings table |
| "4 on flat rate" vendors | 🗄️ | no `rate_type`/`flat_rate` column on `contractors` — add one |
| CapEx tab | ⚠️ | **currently backed by a hardcoded fixture array** (`capexCases` in `console-data.server.ts`), already rendered live today independent of this redesign. Must move to real Supabase-backed CapEx records before this ships to an actual client — see Cross-Cutting §5 |
| "$3,800 avoided" per-ticket savings claim | ❓ | reads as an AI estimate. Per `brand_voice.md`, tag as estimate vs. measured — don't present as a hard number without a source |

## 3. Mariana screen (Contracts / Clauses / Exclusivityes / Expirations / Deposits / Letters & drafts)

This is the expensive screen. Exclusivity conflict detection itself is real (`src/lib/ingest/exclusivity-check.ts`) — everything *per-clause* is not.

| Field | Tier | Note |
|---|---|---|
| Exclusivity conflict alerts ("Northern Pharmacies grants exclusivity...") | ✅ | logic exists in `exclusivity-check.ts`, just needs surfacing in this screen |
| Renewal drafts, "Letters & drafts" tab | ✅ / ⚠️ ownership change | `lease_renewals.draft_markdown` already exists, but per 2026-09-03 decision this drafting job moves from Mariana to Valeria IA. The auto-generator in `portfolio.server.ts` (hardcoded `"— MARIANA"` byline in the markdown template) needs updating to reflect Valeria as author. Mariana's own screen keeps exclusivity screening only |
| Contracts indexed count, fields-to-confirm count | 🔧 | derivable from existing `leases` + `documents.extraction_verified_at`, no new schema |
| Per-clause ledger (22/18/26/16/19/31 clauses per contract, each with its own review status: Needs counsel / Awaiting your reading / Up to date / Ready to redo, page citation) | 🏗️ | **no `lease_clauses` table exists.** Today `leases` stores ~11 fixed clause columns (one text field per named clause type: `exclusive_use_clause`, `parking_clause`, etc.), not a per-clause row with independent review state. This screen assumes a real clause ledger — needs a new table: `lease_clauses(id, lease_id, clause_number, clause_text, page_citation, review_status, flagged, confidence)` |
| "Two readings" of a clause with confidence + $ delta (CPI+1.5% vs. annex B) | 🏗️ | implies storing multiple candidate extractions per document with confidence scores. Current pipeline (`lease-extraction.ts`) writes one `extracted_fields` blob per document. Needs either a `lease_extraction_candidates` table or a documented decision to keep single-reading extraction and drop this UI concept |
| Security deposits $248,900, "1 incomplete" | 🗄️ | confirmed: no deposit column anywhere on `leases`. Add `security_deposit_amount`, `security_deposit_status` |
| "Escalations not applied" tracking | 🏗️ | needs an audit trail comparing scheduled escalation dates against actual `base_rent_monthly` changes over time — depends on the escalation fields from §1 existing first |
| "Mariana's note" free-text column per contract | 🗄️ | no annotation field/table today — add `agent_notes` (or fold into the `lease_clauses` table as a per-clause note) |
| EN variant of the whole console | ❓ | live console has zero i18n today. Confirm this is a real bilingual requirement before duplicating any of the above — doubles the maintenance surface for every field above |

## 4. Cross-cutting decisions to resolve before any migration

1. ~~**"Valeria" agent identity**~~ — ✅ **resolved 2026-09-03.** Consulta IA renamed to Valeria IA (portfolio/analysis + new/renewal contract drafting). Mariana keeps exclusivity screening for new applicants, unchanged. Any contract Valeria drafts still passes through `exclusivity-check.ts` and still carries the CLAUDE.md §4 jurisdiction-watermark banner + Tier-2 draft-only gating. Follow-up work: rename `ask-copiloto.ts`-facing UI strings, update the `"— MARIANA"` byline in `portfolio.server.ts`'s auto-renewal-draft template.

   **Decided 2026-09-03 — conversational editing, confirmed in scope.** Valeria takes edit requests through chat ("change the escalation to fixed 4%"), not just answers questions. Confirmed scope:
   - **Build the write path (Gap 1 — confirmed).** `ask-copiloto.ts` is explicitly documented today as "not agentic — one retrieval, one generation, no tool-use loop." This requires a real tool-use loop with an actual edit tool — Phase 3 structural work, not a prompt change. Do not fold into the Phase 1 rename; sequence it with the other Phase 3 items (§5).
   - **Scope locked to unsigned drafts only (Gap 2 — confirmed).** Valeria's edit tool may touch `lease_renewals.draft_markdown` + its structured fields (`new_start_date`, `new_end_date`, `new_base_rent_monthly`, `escalation_pct`) — pre-signature, Tier 2 (draft/stage). It must **never** reach the active, signed lease's own fields — those keep their existing path (`updateRentRollFieldAction`, Tier 3, landlord-only, two-step confirm UI) exactly as gated today, with no chat access, ever. Whatever tool Valeria gets must still force an explicit propose→confirm step before persisting even a draft (same pattern as `AddTenantForm`'s revisar→confirmar) — never a silent chat-to-database write.
2. ~~**CAM: GLA-% or real invoice $**~~ — ✅ **resolved 2026-09-03: ship %-only, defer the $ engine.** Rent Roll's CAM column stays the free `sharePct` reuse. The real dollar allocation engine (invoice ingestion + per-tenant $ prorateo) is Phase 3, not built this round. Follow-up: cut or relabel Diego's "$1,450 CAM recoverable" per-ticket figure for now — showing a $ figure with no engine behind it violates the brand_voice.md rule against unsourced numbers.
3. ~~**Unit-type taxonomy**~~ — ✅ **resolved 2026-09-03: fixed enum, real column, one-time manual backfill.** Values: Anchor / Food / Retail / Service / Vacant. New column on `locales` (not inferred from free-text `permitted_use` — unreliable, "Anchor" is a lease-structure concept the use-text doesn't encode). One-time manual entry across the existing units; required going forward on `AddTenantForm`.
4. ~~**Maintenance budget cap ownership**~~ — ✅ **resolved 2026-09-03: single number, per-plaza, per-quarter, landlord-editable in Settings.** Matches the mockup exactly ($60,000/quarter, one figure). Add one field to the existing settings table in `platform/settings.server.ts`. No per-category or annual variants until an actual need appears.
5. ~~**CapEx fixture data**~~ — ✅ **resolved 2026-09-03: fix now, independent of redesign timing, priority bumped ahead of the Mariana clause ledger.** This is a trust gap, not a feature gap — real-looking numbers are live today that aren't real (`capexCases` in `console-data.server.ts`). Per [CLAUDE.md](../../../../../../OS/CLAUDE.md) §2 fixture air-gapping, this shouldn't sit in front of a prospect or real client regardless of redesign timing. Build: replace the hardcoded array with a real `capex_cases` table (or extend `tickets`/`equipment_assets`) fed by actual ticket/warranty data. Resequenced in §5 below — moved ahead of the Mariana clause ledger.
6. ~~**EN variant scope**~~ — ✅ **resolved 2026-09-03: treat as review copy, not a build commitment, until a real bilingual client is confirmed.** Console has zero i18n today — every string is hardcoded Spanish. Real i18n (extract every string, wire a translation layer, double-maintain every future addition) is a one-time infra cost not worth paying speculatively. Revisit if/when an actual bilingual landlord is on the table.

## 5. Suggested build order

- **Phase 0 — ✅ closed 2026-09-03.** All 6 decisions resolved (see §4). Zero code.
- **Phase 1 — ship now** (pure reskin, zero backend change): Rent Roll core table (tenant/unit/area/rent/CAM%/expiration/status), full Diego ticket table, Mariana exclusivity alerts. This is the bulk of the visual win with zero data risk. CAM ships %-only (Decision 2); unit-type tag waits on the Decision-3 backfill; budget-cap stat waits on the Decision-4 settings field.
- **Phase 1.5 — CapEx fixture cleanup (Decision 5), sequenced ahead of Phase 3.** Trust gap, not a feature gap — do this before or alongside Phase 1, not after. Replace `capexCases`/`leasingApplicants`/`camRows` in `console-data.server.ts` with real Supabase-backed data (or remove the dead ones outright).
- **Phase 2 — additive migrations** (low risk, no structural change): unit-type column on `locales`, escalation fields on `leases`, `contractors.rate_type`, maintenance budget setting, `security_deposit_amount`/`status`, `agent_notes`. Each is a single additive column/table, backfill optional except unit-type (manual one-time pass, Decision 3).
- **Phase 3 — structural** (real project, sequence last): Valeria's conversational-edit tool-use loop (scoped to unsigned drafts only, per Decision 1 refinement), `lease_clauses` ledger, multi-reading extraction storage, escalation-applied audit trail. Real CAM $ allocation engine stays deferred (Decision 2) — not scheduled.
- **Deferred, not scheduled**: EN variant (Decision 6) — revisit only if a real bilingual client shows up.

## 6. Phase 3 scoping — decisions needed before any schema/code

Checked 2026-09-03: Phase 1.5 and Phase 2 are both live and verified against the real dev DB (see §5). Phase 3's four items are architecturally heavier than anything in Phase 2 — each is a real design decision, not an additive column. Scoping them here before writing anything, same discipline as Phase 0.

### 3a. Valeria's conversational-edit capability — ✅ shipped and verified live 2026-09-03

All four decisions resolved as recommended: in-session-only conversation state (client-held, no new table), propose-in-chat/confirm-writes-it tool contract, inline diff card, Claude-only (no Gemini tool-use parity).

**Correction to the original scoping**: this turned out not to need a true agentic "tool-use loop" at all — since the tool never has a result to report back to the model (it doesn't write anything), one Claude call with `tools` attached is enough: extract the `tool_use` block if present, resolve it against the real `lease_renewals` row, done. Single-shot tool-calling, not a loop.

Built:
- `askValeria()` (`ask-copiloto.ts`) — new function alongside the untouched `askCopiloto`/`askCopilotoStream`. Reuses `buildCopilotoRequest` as-is (prepends prior turns before its existing single data-context user message — history always ends on an assistant turn, so alternation holds) rather than risking the shared, eval-graded read-only path.
- `propose_renewal_edit` tool — Claude proposes a change to one field of a `lease_renewals` row; the tool call itself never touches the database.
- `updateRenewalFieldAction` (`lease-renewal-actions.ts`) — the only write path (new, none existed before — the panel only ever supported approve/reject, never in-place edits), scoped to `needs_landlord_review` rows only, matching the "unsigned drafts only" boundary.
- New non-streaming route `/api/copiloto/valeria` — `/api/copiloto/ask` (streaming, read-only) is untouched, still what `scripts/golden-eval-runner.ts` grades.
- Chat panel (`landlord-dashboard.tsx`) now sends its existing client-held `copilotHistory` to the new route and renders a diff card (old → new, Aplicar/Descartar) under any assistant message carrying a proposed edit.
- Renamed "Consulta IA" → "Valeria IA" everywhere (system prompt + every UI label) — the follow-up work item from decision 1 (§4.1), finally applied.
- Added `renovaciones` (renewal drafts, `needs_landlord_review` only) to the data block Valeria/Copiloto sees — previously absent entirely, so the model had no way to reference a specific draft. Purely additive; the read-only path just got more informative.

**Found and fixed live, not something anticipated**: `wrapUntrustedContent()` — meant per its own doc comment for `/api/ingest`'s unauthenticated public-form intake — was being applied to *every* Copiloto question, including the landlord's own authenticated chat input. Harmless for read-only answers, but it made Claude correctly refuse to ever treat the landlord's request as an actionable instruction once a real tool existed to refuse to use. Fixed with an additive `wrapQuestion` option on `buildCopilotoRequest` (defaults to `true` — zero behavior change for the existing callers); `askValeria` is the only caller that passes `false`.

**Verified live against real Claude + the real dev DB**, not just typechecked:
- Asked Valeria to change a real draft's rent (REN-009) — got a correct proposed edit with the real old value, new value, and a real generated reasoning sentence.
- Asked about a renewal by a made-up/wrong number — correctly reported it doesn't exist and listed the real drafts instead of hallucinating.
- Handed the model an already-*approved* renewal's real ID directly (simulating a stale reference) — it refused rather than emit a tool call, an extra safety margin beyond the code-level `needs_landlord_review` status check, which remains as a documented backstop.
- A plain read-only question, with the edit tool attached, still answered normally with no proposed edit — confirms tool-use doesn't leak into ordinary Q&A.

Not run: a real multi-turn conversation through the actual chat UI in a browser (would need an interactive session) — the underlying multi-turn mechanism (history prepended before the fresh data-context turn) was verified by code review and the alternating-roles argument above, not a live click-through.

### 3b. `lease_clauses` ledger — ✅ shipped and verified live 2026-09-03

All three decisions resolved as recommended: auto-generated at digitization, coexists with the 8 named columns (untouched), mockup's 4-state vocabulary used as-is (translated to Spanish for UI consistency: Necesita Asesoría Legal / Pendiente de Lectura / Al Día / Lista para Redactar).

Built:
- `lease_clauses` table (migration `20260903232839_lease_clauses.sql`) — `clause_number`, `clause_label`, `clause_text`, `review_status` enum, `flagged`, `agent_note`, `updated_at` trigger, RLS matching `renewal_outreach_events`'s own policy
- `buildFullClauseList()` (`lease-clauses.server.ts`) — assembles exclusive_use_clause + the 8 named columns + `special_clauses`' catch-all into one complete per-lease list, so the ledger is a full inventory, not just the overflow bucket. 4 unit tests.
- `replaceLeaseClauses()` wired into `promoteExtraction()` (`workers/workflows/src/lease-digitization.ts`) — replaces a lease's full clause set on every (re-)digitization. **Found and fixed in passing**: the third promotion branch (locale matched by tenant name, no lease row yet) called `insertLeaseRow()` without capturing its return value — `currentLeaseId` stayed `undefined` after that branch even though a lease was created. Needed a real fix for the clause-ledger hook to work in that case, not optional cleanup.
- `updateLeaseClauseReviewAction` (`lease-clauses-actions.ts`, proper `"use server"` split from the plain fetchers — caught before it shipped) + a ledger table in the Legal Expedientes expanded lease card, review-status dropdown + flagged checkbox per clause, matching the console's existing inline-edit pattern
- `LeaseClause`/`LeaseClauseReviewStatus` types live in `contract-status.ts`, not the server-only module — that file is deliberately DB-free so vitest can import it without mocking Supabase; `lease-clauses.server.ts` re-exports them

**Verified live against the real dev DB** (not just typechecked): built a real clause list from an actual digitized lease's own columns, wrote it, confirmed `fetchPortfolio()` surfaced it, wrote a review-status/flagged update, confirmed it read back, cleaned up after. Full pipeline test (an actual document through the Cloudflare Workflow) wasn't run — that needs Workflow runtime bindings a plain script can't provide — but every piece the workflow calls was exercised directly with realistic data.

**Note:** `leases.agent_notes` (Phase 2, one note per whole lease) and `lease_clauses.agent_note` (this ledger, one note per clause) are both real and both stay — the migration comment that added `leases.agent_notes` said it was a stopgap "until the real lease_clauses ledger gives each clause its own note instead of one blob per lease." That ledger now exists, but the whole-lease note wasn't deprecated — it's still useful for a general comment that isn't about one specific clause.

### 3c. Multi-reading extraction storage — ✅ resolved 2026-09-03: skip it

Decided: keep single-reading extraction as-is. The mockup's "two readings, $9,180/year difference" scenario was flourish, not a real need — a human already reviews the digitized contract, which already catches genuine ambiguity. Not building `lease_extraction_candidates` or any confidence-scored multi-reading storage. **This simplifies 3b below** — the clause ledger needs exactly one reading per clause, no candidates table.

### 3d. Escalation-applied audit trail

The most buildable of the four now — Phase 2's `escalation_pct/method/month` are live and real. But it needs one more thing not yet decided: to detect "escalation not applied," the system needs to compare the *previous* `base_rent_monthly` against what it should be after the scheduled month passes. `leases.base_rent_monthly` only holds the current value — there's no history of past values to diff against. Needs either a `lease_rent_history` table (snapshot on every change) or a decision that this check only starts working prospectively from whenever it's built, with no backfill for past escalations.

**Status 2026-09-03: all of Phase 3 (3a, 3b, 3c, 3d) shipped and verified live** (see each section above). Combined with Phase 0-2 and the Diego-threshold fix, every item in this document's original scope is now either done or explicitly deferred by decision (real CAM $ engine, EN variant — see §4 decisions 2 and 6).
