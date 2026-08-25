# Lease Document Pipeline — Design Spec

**Date:** 2026-08-24
**Status:** Approved design, pending implementation plan
**Scope:** Digitize the 85 existing signed lease contracts (PDF only, for now) so they're viewable and queryable under the Legal tab. Insurance/policy triage explicitly out of scope — contracts only.

## Problem

The Legal ("Expedientes & Anomalías") tab shows 85 indexed contracts, but there's no source document behind any row — confirmed by the code's own comment in `landlord-dashboard.tsx`: *"No document storage, no per-contract hash... exist in the schema."* The Copiloto endpoint (`route.ts`) states outright it has no PDF access. The feature demoed — "digitize the physical contract, ask the chatbox about it" — was never built. This spec covers building it.

## Non-goals

- Insurance/policy documents (separate future scope, not this spec)
- Word/.docx source files (PDF only, per confirmed decision — revisit if landlord's real contracts arrive as Word originals)
- RAG / vector search (see "No-RAG rationale" below)
- Diego's cost-attribution consuming the responsibility matrix (natural phase 2 once `leases.responsibility_matrix` exists — not blocking, not spec'd in detail here)

## No-RAG rationale

`route.ts`'s existing comment justifies no-RAG on the grounds that the whole portfolio is small enough to pass in full to one Claude call. That reasoning doesn't transfer as-is once full contract text enters the picture — a real 20-50 page commercial lease is far larger than the short clause strings currently in `leases`. The fix isn't RAG (embeddings/similarity search) — it's **structured extraction at ingest**, the same pattern AP Control Tower already uses for invoices: parse once, extract a fixed field set into DB columns, query those columns deterministically. Full document `raw_text` is kept only as a fallback for the rare question the extraction didn't anticipate, scoped to the one relevant document, never dumped in bulk. Still "not RAG" in the sense originally decided — just extract-once-query-structured instead of embed-and-retrieve, because the object being handled got bigger.

## Architecture

```
[Client uploads PDF]              (bulk drag-drop OR single-file replace — same path both cases)
        |
        v
[documents row created, status='uploaded']
        |
        v
[OCR / legibility gate]  --reuses ocr_legibility_check.py's checks as-is--
        |  FAIL --> status='failed', error_message = check's own verdict string. Stop. No LLM call.
        v  PASS
[status='extracting']
        |
        v
[LLM extraction pass]  -->  raw_text (full) + extracted_fields (strict schema, see below)
        |                    + fuzzy tenant-name match against locales.tenant_entity
        v
[status='ready_for_triage']  (suggested_locale_id + match_confidence populated)
        |
        v
[Human Gate 1 — client confirms the tenant match]
        |   confirm/reassign -> locale_id set, match_verified_at set, match_verified_by_id set,
        |   status='attached'
        v
[Human Gate 2 — client reviews/edits extracted_fields, confirms]
        |   confirm -> extraction_verified_at set, extraction_verified_by_id set
        v
[PROMOTION] --> extracted_fields written onto the matching leases row
                (whichever row portfolio.server.ts's existing activeLeaseByLocale
                 logic already treats as current for that locale — no new
                 selection logic needed)
        |
        v
Copiloto (route.ts) and, later, Diego read leases.* as before — unchanged query shape.
```

Both upload paths (bulk onboarding, single-file replace/correction) run through this exact same pipeline — no special-casing. A single-file replace just starts with a smaller, more obvious match suggestion at Gate 1; it still requires explicit confirmation, per the earlier decision to require confirmation on both gates in both cases.

## Schema changes

Extends the existing Phase-1 `documents` table (`20260823000002_documents_intake.sql`) — does not replace it. Every column below is genuinely new; nothing here duplicates a column that table already has.

```sql
-- Migration: extend documents for the active_lease pipeline

-- 'kind' already exists as `text not null check (kind in ('maintenance_ticket','lease_application'))`.
-- Extend the constraint, don't add a new column.
alter table documents drop constraint documents_kind_check;
alter table documents add constraint documents_kind_check
  check (kind in ('maintenance_ticket', 'lease_application', 'active_lease'));

alter table documents
  -- Gate 1: entity reconciliation (the tenant/locale match)
  add column suggested_locale_id uuid references locales (id) on delete set null,
  add column match_confidence numeric(3,2),                -- 0.00-1.00
  add column locale_id uuid references locales (id) on delete set null,  -- promoted on Gate 1 confirm
  add column match_verified_at timestamptz,
  add column match_verified_by_id uuid references profiles (id),

  -- Gate 2: extraction accuracy
  add column extracted_fields jsonb not null default '{}'::jsonb,
  add column extraction_verified_at timestamptz,
  add column extraction_verified_by_id uuid references profiles (id);

create index documents_locale_idx on documents (locale_id);
create index documents_extracted_fields_gin on documents using gin (extracted_fields);
```

`status` (existing `document_status` enum: `uploaded / extracting / ready_for_triage / attached / failed`) and `error_message` (existing column) are reused as-is — no new parallel status/error columns. `raw_text` (existing column) holds the full OCR/native text; no new column needed there either.

`locales.id` / `profiles.id` are `uuid` throughout this schema (confirmed against `20260823000001_diego_schema.sql` and `20260823000005_real_auth.sql`) — every FK above is `uuid`, not `integer`. There is no `users` table; `profiles` (backed by `auth.users`) is the correct reference, matching the existing `invites.invited_by uuid references profiles (id)` pattern.

### Promotion target — new columns on `leases`

```sql
alter table leases
  add column responsibility_matrix jsonb,   -- null until a verified document promotes one
  add column notice_period_days integer;
```

On Gate 2 confirm, the pipeline writes `extracted_fields.responsibility_matrix` and `extracted_fields.notice_period_days` onto whichever `leases` row `portfolio.server.ts`'s existing `activeLeaseByLocale` map already resolves as current for that `locale_id`. No new versioning/history mechanism — a corrected or renewed contract's document just updates whatever `leases` row is current at that time, the same way every other lease field already works. `documents` stays the immutable audit trail (what was uploaded, what the LLM saw, who verified it, when); `leases` stays the single operational ground truth Copiloto and (later) Diego read — neither has to know the other exists.

### `extracted_fields` — strict schema (Pydantic/JSON-Schema enforced, not free-form LLM output)

```json
{
  "responsibility_matrix": {
    "hvac": "landlord",              // "landlord" | "tenant" | "shared"
    "roof": "landlord",
    "plumbing": "tenant",
    "electrical": "tenant",
    "storefront_glass": "tenant"
  },
  "notice_period_days": 90,
  "special_clauses": [
    {"label": "señalización exterior", "text": "..."}
  ]
}
```

Universal five-field matrix (`hvac`, `roof`, `plumbing`, `electrical`, `storefront_glass`) applies to every lease regardless of tenant category — a furniture store and a taquería both have HVAC and a roof. Category-specific items (grease trap, hood suppression, walk-in cooler) are not forced into the universal matrix; they land in `special_clauses` when the extraction encounters them, gated on the tenant's actual business category rather than assumed present for everyone.

## OCR legibility gate

`ocr_legibility_check.py` already computes `overall_verdict` (PASS/REVIEW/FAIL) from native-text-layer presence, DPI floor, alpha-character ratio, and clause-anchor recovery — confirmed working against the synthetic noisy test set (control/faded/noisy_fax → PASS, skewed → FAIL, 0 words, fully garbled). The pipeline must **gate on this verdict**, not just log it:

- **FAIL** → `status='failed'`, `error_message` = the check's verdict string, verbatim. No LLM extraction call — don't spend tokens on a document that's already known unreadable.
- **REVIEW** → proceeds to extraction, but the check's verdict string is surfaced to the client during Gate 1/2 review so a borderline scan doesn't look identical to a clean PASS.
- **PASS** → proceeds normally.

Known gap surfaced during test-set validation: skew alone defeats tesseract completely (0 words) because the pipeline has no deskew preprocessing step. Real landlord-scanned contracts are plausibly tilted (phone photo, not a flatbed scanner). Flagging as a follow-up — a deskew pass (OpenCV or tesseract's own OSD) before the OCR step — not blocking this spec, since the legibility gate correctly catches and rejects a skewed scan rather than silently producing garbage data.

## UI changes (Legal tab)

- New document panel per tenant row (or a dedicated "Documentos" sub-view) — inline PDF viewer via a short-lived signed URL (the `intake` storage bucket is private, service-role-only per the Phase-1 migration; viewer needs a server-generated signed URL, not direct bucket access).
- Extracted fields shown with a visible `[EXTRACCIÓN NO VERIFICADA]` badge until `extraction_verified_at` is set — same visual pattern already used elsewhere in this OS for unresolved-jurisdiction-key watermarking. Never silently promoted without the badge disappearing only on explicit confirm.
- Bulk drag-drop zone: multiple files at once, each shows its suggested tenant match + confidence, client confirms or reassigns per file before anything attaches.
- Single-file replace: same components, pre-filled/near-certain suggested match — still requires explicit confirm on both gates, per the earlier decision that both upload paths use the identical flow.

## Copiloto integration

`route.ts`'s `leasesBlock` mapping gains `responsibility_matrix` and `notice_period_days` once those columns exist on `leases` — no change to the query shape, no join against `documents`. The system prompt's current line — *"No tienes acceso a... documentos PDF — esos datos no existen en este sistema"* — gets corrected once this ships; replace with a citation instruction (cite the tenant + local the same way it already does for `leases`, since the fields now live there).

## Isolation

Build and test against Gran Via's Supabase **preview branch**, not the production project — that project already holds the real 85 tenants' live data. Per root `CLAUDE.md` §5, promote the migration to production only after landlord review, following the same branch → merge flow already established for this project.

## Testing

The 82-lease synthetic set (`gran_via_test_leases/` — 77 clean native-text PDFs + 5 defected noisy scans, generated and validated against `ocr_legibility_check.py`) becomes the pipeline's eval fixture: run all 82 through the real pipeline end-to-end, check `extracted_fields` output against `ground_truth.json`'s known answers per lease. The skewed test file's correct FAIL result is itself a passing test case for the legibility gate, not a fixture bug.

## Explicitly deferred (raised and cut during design, for the record)

- **Historical-lease versioning trigger** — cut. `leases` already supports multiple rows per locale with "latest end_date wins" logic in `portfolio.server.ts`; a corrected/replacement document updates the already-current row rather than needing a new trigger-driven archival mechanism.
- **Auto-syncing `locales.status` from document verification** — cut. `locales.status` is single-writer today (`addTenantAction`/`vacateTenantAction` only). These are already-occupied units being digitized after the fact; the document pipeline writing that field too would create a second writer and a desync risk for no actual benefit in this scope.
