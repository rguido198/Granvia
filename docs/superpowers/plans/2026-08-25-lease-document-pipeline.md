# Lease Document Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Digitize the 85 existing signed lease contracts — upload, OCR-gate, extract structured fields, two human-confirm gates, promote onto `leases` — so the Legal tab and Copiloto can finally reference the underlying documents instead of just short clause strings.

**Architecture:** Client uploads a PDF (bulk or single-replace, identical path) into the existing Phase-1 `documents` intake table, extended with a new `active_lease` kind. A new Vercel `workflow` function (`leaseDigitizationWorkflow`, mirroring the existing `marianaScreeningWorkflow`/`diegoTriageWorkflow` shape) extracts structured fields — `pdf-parse` first (free), a Claude vision call as fallback for scans, gated by a deterministic legibility check ported from `ocr_legibility_check.py` — fuzzy-matches the tenant name against `locales`, then suspends twice on `createHook`/`resumeHook` for the two human-confirm gates before promoting the confirmed fields onto the matching `leases` row.

**Tech Stack:** Next.js (App Router) + TypeScript, Supabase (Postgres + Storage), `@anthropic-ai/sdk` (Claude Opus 5, `messages.parse` + `zodOutputFormat`), Vercel `workflow` package, Zod, `pdf-parse`. Vitest added as this app's first test runner.

**Spec:** [`docs/superpowers/specs/2026-08-24-lease-document-pipeline-design.md`](../specs/2026-08-24-lease-document-pipeline-design.md)

## Global Constraints

- PDF only — no Word/.docx (spec confirmed decision).
- No RAG/embeddings — structured extraction at ingest, `raw_text` is a scoped fallback only.
- All IDs are `uuid`, never `integer` — this schema has no `users` table, only `profiles` (backed by `auth.users`).
- Both upload paths (bulk drag-drop, single-file replace) run through the identical pipeline — no special-casing either gate.
- Both human gates (tenant match, extracted-field accuracy) require explicit confirmation before their data is treated as ground truth — no auto-promotion on high confidence alone.
- `documents.kind`, `status`, `error_message`, `raw_text` already exist — extend the `kind` CHECK constraint, do not add duplicate columns.
- Build and test against Gran Via's Supabase **preview branch**, never the production project (holds the real 85 tenants' live data).
- No auto-sync of `locales.status` from this pipeline — that field is single-writer (`addTenantAction`/`vacateTenantAction` only).

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260825000000_lease_document_pipeline.sql` | Schema: extend `documents`, extend `leases` |
| `vitest.config.ts`, `package.json` (scripts) | Test runner, first one this app gets |
| `src/lib/ingest/lease-extraction-schema.ts` | Zod schema + TS type for `extracted_fields` |
| `src/lib/ingest/legibility-check.ts` | Deterministic PASS/FAIL on transcribed text (alpha ratio, clause anchors) — TS port of the two checks in `ocr_legibility_check.py` that apply once text is already in hand |
| `src/lib/ingest/fuzzy-match-tenant.ts` | Normalize + score a document's extracted tenant name against `locales.tenant_entity` |
| `src/lib/ingest/lease-extraction.ts` | Two Claude-calling functions: text-path extraction, vision-path extraction+transcription |
| `src/workflows/lease-digitization.ts` | The durable workflow — orchestrates extraction, fuzzy match, both gates, promotion |
| `src/app/api/ingest/route.ts` | **Modify** — add `active_lease` kind, relax the `locale_id`-required check for it, dispatch to the new workflow |
| `src/app/api/workflow/confirm-lease-match/route.ts` | Gate 1 resume endpoint |
| `src/app/api/workflow/confirm-lease-extraction/route.ts` | Gate 2 resume endpoint |
| `src/app/api/documents/[id]/signed-url/route.ts` | Short-lived signed URL for the private `intake` bucket, for the PDF viewer |
| `src/app/api/copiloto/ask/route.ts` | **Modify** — `leasesBlock` gains `responsibility_matrix`/`notice_period_days`, system prompt line corrected |
| `src/components/hub/legal-documents-panel.tsx` | New component: upload zone, per-document card, PDF viewer, both gate review forms — kept out of `landlord-dashboard.tsx` (already 2500+ lines) |
| `src/components/hub/landlord-dashboard.tsx` | **Modify** — mount `LegalDocumentsPanel` in the Legal tab |

---

### Task 1: Vitest test infrastructure

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm test` runs Vitest once; every later task with a `.test.ts` file depends on this.

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Create the config**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 3: Add the test script**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 4: Verify it runs with zero tests**

Run: `npm test`
Expected: Vitest starts, reports "No test files found" (or exits 0 with zero tests) — confirms the config and alias resolve without error before any real test exists.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "test: add Vitest as this app's first test runner"
```

---

### Task 2: Database migration — extend `documents` and `leases`

**Files:**
- Create: `supabase/migrations/20260825000000_lease_document_pipeline.sql`

**Interfaces:**
- Produces: `documents.kind` accepts `'active_lease'`; new columns `documents.suggested_locale_id`, `documents.match_confidence`, `documents.locale_id`, `documents.match_verified_at`, `documents.match_verified_by_id`, `documents.extracted_fields`, `documents.extraction_verified_at`, `documents.extraction_verified_by_id`; new columns `leases.responsibility_matrix`, `leases.notice_period_days`. Every later task that touches the DB depends on this.

- [ ] **Step 1: Confirm you're pointed at the Supabase preview branch, not production**

Run: `supabase branches list` (or check `SUPABASE_PROJECT_REF`/`.env.local` against the branch project ref, not the production ref)
Expected: the active project ref matches the preview branch created for this feature. **Stop and create/switch to a branch first if this doesn't match** — this migration must never apply to production before landlord review, per the spec's Isolation section.

- [ ] **Step 2: Write the migration**

```sql
-- supabase/migrations/20260825000000_lease_document_pipeline.sql

-- 'kind' already exists (text not null check (kind in ('maintenance_ticket','lease_application')))
-- — extend the constraint, do not add a duplicate column.
alter table documents drop constraint documents_kind_check;
alter table documents add constraint documents_kind_check
  check (kind in ('maintenance_ticket', 'lease_application', 'active_lease'));

alter table documents
  -- Gate 1: entity reconciliation (the tenant/locale match)
  add column suggested_locale_id uuid references locales (id) on delete set null,
  add column match_confidence numeric(3,2),
  add column locale_id uuid references locales (id) on delete set null,
  add column match_verified_at timestamptz,
  add column match_verified_by_id uuid references profiles (id),

  -- Gate 2: extraction accuracy
  add column extracted_fields jsonb not null default '{}'::jsonb,
  add column extraction_verified_at timestamptz,
  add column extraction_verified_by_id uuid references profiles (id);

create index documents_locale_idx on documents (locale_id);
create index documents_extracted_fields_gin on documents using gin (extracted_fields);

alter table leases
  add column responsibility_matrix jsonb,
  add column notice_period_days integer;
```

- [ ] **Step 3: Apply to the branch**

Run: `supabase db push` (or `supabase migration up`, matching however prior migrations in this repo were applied — check `supabase/migrations/` for a README or the last few commits touching this directory for the established command)
Expected: migration applies cleanly, no errors.

- [ ] **Step 4: Verify the constraint and columns**

Run:
```bash
supabase db execute --sql "select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'documents_kind_check';"
supabase db execute --sql "\d documents" # or an equivalent describe, confirm the 8 new columns
supabase db execute --sql "\d leases"    # confirm responsibility_matrix, notice_period_days
```
Expected: constraint definition includes `'active_lease'`; all new columns present with `uuid` types on the FK columns (not `integer`).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260825000000_lease_document_pipeline.sql
git commit -m "feat(db): extend documents and leases for the lease-digitization pipeline"
```

---

### Task 3: Zod extraction schema

**Files:**
- Create: `src/lib/ingest/lease-extraction-schema.ts`
- Test: `src/lib/ingest/lease-extraction-schema.test.ts`

**Interfaces:**
- Produces: `LeaseExtractedFieldsSchema` (Zod object), `type LeaseExtractedFields = z.infer<typeof LeaseExtractedFieldsSchema>`. Consumed by Task 6 (extraction functions) and Task 7 (workflow).

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/ingest/lease-extraction-schema.test.ts
import { describe, it, expect } from "vitest";
import { LeaseExtractedFieldsSchema } from "./lease-extraction-schema";

describe("LeaseExtractedFieldsSchema", () => {
  it("accepts a well-formed extraction", () => {
    const result = LeaseExtractedFieldsSchema.safeParse({
      responsibility_matrix: {
        hvac: "landlord",
        roof: "landlord",
        plumbing: "tenant",
        electrical: "tenant",
        storefront_glass: "tenant",
      },
      notice_period_days: 90,
      special_clauses: [{ label: "señalización exterior", text: "..." }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a responsibility value outside the enum", () => {
    const result = LeaseExtractedFieldsSchema.safeParse({
      responsibility_matrix: {
        hvac: "nobody", // not landlord | tenant | shared
        roof: "landlord",
        plumbing: "tenant",
        electrical: "tenant",
        storefront_glass: "tenant",
      },
      notice_period_days: 90,
      special_clauses: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a matrix missing one of the five required systems", () => {
    const result = LeaseExtractedFieldsSchema.safeParse({
      responsibility_matrix: {
        hvac: "landlord",
        roof: "landlord",
        plumbing: "tenant",
        electrical: "tenant",
        // storefront_glass omitted
      },
      notice_period_days: 90,
      special_clauses: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an arbitrary hallucinated top-level key", () => {
    const result = LeaseExtractedFieldsSchema.safeParse({
      responsibility_matrix: {
        hvac: "landlord",
        roof: "landlord",
        plumbing: "tenant",
        electrical: "tenant",
        storefront_glass: "tenant",
      },
      notice_period_days: 90,
      special_clauses: [],
      deposit_amount_mxn: 50000, // not in the schema
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- lease-extraction-schema`
Expected: FAIL — `lease-extraction-schema.ts` doesn't exist yet.

- [ ] **Step 3: Write the schema**

```typescript
// src/lib/ingest/lease-extraction-schema.ts
import { z } from "zod";

const ResponsibilitySchema = z.enum(["landlord", "tenant", "shared"]);

export const LeaseExtractedFieldsSchema = z
  .object({
    responsibility_matrix: z
      .object({
        hvac: ResponsibilitySchema,
        roof: ResponsibilitySchema,
        plumbing: ResponsibilitySchema,
        electrical: ResponsibilitySchema,
        storefront_glass: ResponsibilitySchema,
      })
      .strict(),
    notice_period_days: z.number().int().positive(),
    special_clauses: z.array(
      z.object({ label: z.string(), text: z.string() }).strict(),
    ),
  })
  .strict();

export type LeaseExtractedFields = z.infer<typeof LeaseExtractedFieldsSchema>;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- lease-extraction-schema`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest/lease-extraction-schema.ts src/lib/ingest/lease-extraction-schema.test.ts
git commit -m "feat: add strict Zod schema for lease extracted_fields"
```

---

### Task 4: Legibility check (TS port)

**Files:**
- Create: `src/lib/ingest/legibility-check.ts`
- Test: `src/lib/ingest/legibility-check.test.ts`

**Interfaces:**
- Produces: `checkLegibility(text: string): { passed: boolean; alphaRatio: number; clauseAnchors: string[]; reason: string | null }`. Consumed by Task 6's vision-path extraction function.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/ingest/legibility-check.test.ts
import { describe, it, expect } from "vitest";
import { checkLegibility } from "./legibility-check";

describe("checkLegibility", () => {
  it("passes clean text with clause anchors", () => {
    const result = checkLegibility(
      "Cláusula 1. Objeto del Contrato. El Arrendador otorga en arrendamiento al Arrendatario el Local A-01.",
    );
    expect(result.passed).toBe(true);
    expect(result.clauseAnchors.length).toBeGreaterThan(0);
  });

  it("fails on empty input (alpha ratio 0)", () => {
    const result = checkLegibility("");
    expect(result.passed).toBe(false);
    expect(result.alphaRatio).toBe(0);
  });

  it("fails garbled text even if long", () => {
    // simulates a broken OCR/vision transcription: mostly punctuation/digits, few letters
    const garbled = "1.2.3 ### %%% 456 *** 789 !!! 000 ### 111 %%% 222";
    const result = checkLegibility(garbled);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("alpha ratio");
  });

  it("fails clean-looking prose with no clause anchors", () => {
    const noAnchors = "El presente documento describe la relación comercial entre las partes.";
    const result = checkLegibility(noAnchors);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("clause anchors");
  });

  it("recognizes Artículo and § anchors, not just Cláusula", () => {
    const result = checkLegibility("Artículo 5 y también § 3 se aplican a este caso con suficiente texto alrededor.");
    expect(result.clauseAnchors.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- legibility-check`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the port**

Same math as `ocr_legibility_check.py`'s `alpha_ratio()` and `clause_anchors()`, applied to already-transcribed text (no DPI/native-layer concepts here — those only apply to the Python script's tesseract-on-a-rasterized-page path, which this pipeline doesn't use).

```typescript
// src/lib/ingest/legibility-check.ts
const ALPHA_PATTERN = /[A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g;
const CLAUSE_PATTERN = /(Cl[aá]usula|Art[ií]culo|§)\s*\d+/gi;
const ALPHA_RATIO_FLOOR = 0.6;

export function checkLegibility(text: string): {
  passed: boolean;
  alphaRatio: number;
  clauseAnchors: string[];
  reason: string | null;
} {
  const stripped = text.replace(/\s/g, "");
  const alphaCount = stripped.match(ALPHA_PATTERN)?.length ?? 0;
  const alphaRatio = stripped.length === 0 ? 0 : alphaCount / stripped.length;
  const clauseAnchors = text.match(CLAUSE_PATTERN) ?? [];

  const reasons: string[] = [];
  if (alphaRatio < ALPHA_RATIO_FLOOR) {
    reasons.push(`OCR/vision output looks garbled (alpha ratio ${alphaRatio.toFixed(2)})`);
  }
  if (clauseAnchors.length === 0) {
    reasons.push("no clause anchors (Cláusula/Artículo/§ + number) recovered");
  }

  return {
    passed: reasons.length === 0,
    alphaRatio,
    clauseAnchors,
    reason: reasons.length ? reasons.join("; ") : null,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- legibility-check`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest/legibility-check.ts src/lib/ingest/legibility-check.test.ts
git commit -m "feat: port ocr_legibility_check.py's deterministic checks to TS"
```

---

### Task 5: Fuzzy tenant-name match

**Files:**
- Create: `src/lib/ingest/fuzzy-match-tenant.ts`
- Test: `src/lib/ingest/fuzzy-match-tenant.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `matchTenant(extractedName: string, candidates: {id: string; tenantEntity: string}[]): {localeId: string; confidence: number} | null`. Consumed by Task 7 (workflow).

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/ingest/fuzzy-match-tenant.test.ts
import { describe, it, expect } from "vitest";
import { matchTenant } from "./fuzzy-match-tenant";

const CANDIDATES = [
  { id: "loc-1", tenantEntity: "Ashley Furniture" },
  { id: "loc-2", tenantEntity: "MINT Boutique" },
  { id: "loc-3", tenantEntity: "Derma Club" },
];

describe("matchTenant", () => {
  it("matches an exact name with confidence 1.0", () => {
    const result = matchTenant("Ashley Furniture", CANDIDATES);
    expect(result?.localeId).toBe("loc-1");
    expect(result?.confidence).toBe(1);
  });

  it("matches a case/accent/whitespace-different name with high confidence", () => {
    const result = matchTenant("  ashley   furniture ", CANDIDATES);
    expect(result?.localeId).toBe("loc-1");
    expect(result!.confidence).toBeGreaterThan(0.9);
  });

  it("matches a name with an OCR-typo with lower but non-trivial confidence", () => {
    const result = matchTenant("Ashiey Fumiture", CANDIDATES); // two character substitutions
    expect(result?.localeId).toBe("loc-1");
    expect(result!.confidence).toBeGreaterThan(0.5);
    expect(result!.confidence).toBeLessThan(1);
  });

  it("returns null when nothing is close enough to be a plausible suggestion", () => {
    const result = matchTenant("Completely Unrelated Business Name Inc", CANDIDATES);
    expect(result).toBeNull();
  });

  it("returns null on an empty candidate list", () => {
    const result = matchTenant("Ashley Furniture", []);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- fuzzy-match-tenant`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the matcher**

Normalized Levenshtein similarity (hand-rolled — no new dependency, matches this codebase's stated preference for avoiding libraries where a small correct implementation suffices, per `rag_lookup.py`'s "embeddings buy nothing at this size" reasoning applied one level down).

```typescript
// src/lib/ingest/fuzzy-match-tenant.ts
const MIN_CONFIDENCE = 0.5;

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[rows - 1][cols - 1];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export function matchTenant(
  extractedName: string,
  candidates: { id: string; tenantEntity: string }[],
): { localeId: string; confidence: number } | null {
  if (candidates.length === 0) return null;

  const normalizedExtracted = normalize(extractedName);
  let best: { localeId: string; confidence: number } | null = null;

  for (const candidate of candidates) {
    const confidence = similarity(normalizedExtracted, normalize(candidate.tenantEntity));
    if (!best || confidence > best.confidence) {
      best = { localeId: candidate.id, confidence };
    }
  }

  return best && best.confidence >= MIN_CONFIDENCE ? best : null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- fuzzy-match-tenant`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest/fuzzy-match-tenant.ts src/lib/ingest/fuzzy-match-tenant.test.ts
git commit -m "feat: add hand-rolled Levenshtein fuzzy match for tenant-name reconciliation"
```

---

### Task 6: Claude extraction functions (text path + vision path)

**Files:**
- Create: `src/lib/ingest/lease-extraction.ts`

**Interfaces:**
- Consumes: `LeaseExtractedFieldsSchema` (Task 3), `checkLegibility` (Task 4).
- Produces: `extractFromText(rawText: string): Promise<LeaseExtractedFields>`, `extractFromVision(bytes: Uint8Array, mimeType: string): Promise<{rawText: string; extractedFields: LeaseExtractedFields}>`. Consumed by Task 7 (workflow).

No unit test for this task — these functions call the live Anthropic API and there's no mocking infrastructure in this repo yet (Vitest's justification here, per the earlier discussion, was scoped to pure functions: schema validation and legibility math, not the LLM calls themselves). Verified instead in Task 12 against the synthetic fixture set, the same way `ocr_legibility_check.py` was validated earlier in this project.

- [ ] **Step 1: Write the extraction prompt and text-path function**

Follows `mariana-screening.ts`'s `draftScreening` shape exactly — `messages.parse` + `zodOutputFormat`.

```typescript
// src/lib/ingest/lease-extraction.ts
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { LeaseExtractedFieldsSchema, type LeaseExtractedFields } from "./lease-extraction-schema";
import { checkLegibility } from "./legibility-check";

const EXTRACTION_SYSTEM_PROMPT = `Extraes datos estructurados de un contrato de arrendamiento comercial mexicano.

Para la matriz de responsabilidad de mantenimiento, clasifica cada uno de estos cinco sistemas como "landlord" (Arrendador), "tenant" (Arrendatario), o "shared" según lo que diga el contrato — si el contrato no lo especifica para un sistema, usa "shared" y anótalo en special_clauses en vez de adivinar:
- hvac (climatización)
- roof (techo / impermeabilización)
- plumbing (plomería)
- electrical (instalación eléctrica)
- storefront_glass (cristal de fachada)

notice_period_days: días de aviso previo requeridos para terminación anticipada, según el contrato.

special_clauses: cualquier cláusula fuera de lo estándar (uso de suelo específico, señalización, estacionamiento, restricciones de giro, elementos específicos de cocina/restaurante como trampa de grasa o campana de extracción, etc.) — no fuerces estos elementos en la matriz de responsabilidad universal, van aquí.

Responde solo con los campos estructurados solicitados.`;

export async function extractFromText(rawText: string): Promise<LeaseExtractedFields> {
  const client = new Anthropic();

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4000,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Texto del contrato:\n${rawText}` }],
    output_config: { format: zodOutputFormat(LeaseExtractedFieldsSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("lease extraction (text path) returned no parsed output");
  }
  return response.parsed_output;
}
```

- [ ] **Step 2: Write the vision-path function**

Combines transcription and extraction in one multimodal call, then gates on the deterministic legibility check (Task 4) applied to the transcription the model returns — not the model's own self-reported confidence, per the spec's stated principle.

```typescript
// append to src/lib/ingest/lease-extraction.ts
import { z } from "zod";

const VisionExtractionSchema = z.object({
  transcribed_text: z.string(),
  fields: LeaseExtractedFieldsSchema,
});

const VISION_SYSTEM_PROMPT = `${EXTRACTION_SYSTEM_PROMPT}

Antes de extraer los campos, transcribe el texto completo del documento tal como aparece — esta transcripción se usa para verificar la calidad de la lectura, así que debe ser fiel al documento, no un resumen.`;

export async function extractFromVision(
  bytes: Uint8Array,
  mimeType: string,
): Promise<{ rawText: string; extractedFields: LeaseExtractedFields }> {
  const client = new Anthropic();
  const base64 = Buffer.from(bytes).toString("base64");

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 6000,
    system: VISION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: mimeType as "application/pdf", data: base64 },
          },
          { type: "text", text: "Transcribe y extrae los campos de este contrato." },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(VisionExtractionSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("lease extraction (vision path) returned no parsed output");
  }

  const { transcribed_text, fields } = response.parsed_output;
  const legibility = checkLegibility(transcribed_text);
  if (!legibility.passed) {
    throw new Error(`illegible scan: ${legibility.reason}`);
  }

  return { rawText: transcribed_text, extractedFields: fields };
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `src/lib/ingest/lease-extraction.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ingest/lease-extraction.ts
git commit -m "feat: add text-path and vision-path Claude extraction functions"
```

---

### Task 7: `leaseDigitizationWorkflow`

**Files:**
- Create: `src/workflows/lease-digitization.ts`

**Interfaces:**
- Consumes: `extractFromText`/`extractFromVision` (Task 6), `matchTenant` (Task 5), `LeaseExtractedFields` type (Task 3).
- Produces: `leaseDigitizationWorkflow(documentId: string): Promise<{documentId: string; status: "attached" | "failed"}>` — invoked via `start(leaseDigitizationWorkflow, [documentId])` from Task 8's route. Hook tokens `lease-doc-match:${documentId}` and `lease-doc-extraction:${documentId}` are consumed by Task 9's two routes.

- [ ] **Step 1: Write the context-loading step**

Mirrors `loadApplicationContext` in `mariana-screening.ts` — but this workflow doesn't know the target locale ahead of time (that's what fuzzy match determines), so it loads every occupied locale in the plaza to match against, not one target.

```typescript
// src/workflows/lease-digitization.ts
import { createHook, FatalError, getWorkflowMetadata } from "workflow";

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { extractFromText, extractFromVision } from "@/lib/ingest/lease-extraction";
import { matchTenant } from "@/lib/ingest/fuzzy-match-tenant";
import type { LeaseExtractedFields } from "@/lib/ingest/lease-extraction-schema";

type DocumentContext = {
  documentId: string;
  storagePath: string;
  mimeType: string;
  rawText: string | null; // populated by pdf-parse in the ingest route, if native text existed
  candidates: { id: string; tenantEntity: string }[];
};

async function loadDocumentContext(documentId: string): Promise<DocumentContext> {
  "use step";
  const supabase = getSupabaseServiceClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, storage_path, mime_type, raw_text")
    .eq("id", documentId)
    .single();
  if (documentError || !document) {
    throw new FatalError(`document ${documentId} not found: ${documentError?.message}`);
  }

  const { data: locales } = await supabase
    .from("locales")
    .select("id, tenant_entity")
    .eq("status", "OCCUPIED")
    .not("tenant_entity", "is", null);

  return {
    documentId,
    storagePath: document.storage_path,
    mimeType: document.mime_type,
    rawText: document.raw_text,
    candidates: (locales ?? []).map((l) => ({ id: l.id, tenantEntity: l.tenant_entity as string })),
  };
}
```

- [ ] **Step 2: Write the extraction-dispatch step**

```typescript
// append to src/workflows/lease-digitization.ts
type ExtractionResult = { rawText: string; extractedFields: LeaseExtractedFields };

async function extractDocument(context: DocumentContext): Promise<ExtractionResult> {
  "use step";

  const hasNativeText = !!context.rawText && context.rawText.trim().split(/\s+/).length >= 20;
  if (hasNativeText) {
    const extractedFields = await extractFromText(context.rawText!);
    return { rawText: context.rawText!, extractedFields };
  }

  const supabase = getSupabaseServiceClient();
  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("intake")
    .download(context.storagePath);
  if (downloadError || !fileBlob) {
    throw new FatalError(`could not download ${context.storagePath}: ${downloadError?.message}`);
  }
  const bytes = new Uint8Array(await fileBlob.arrayBuffer());
  return extractFromVision(bytes, context.mimeType);
}
```

- [ ] **Step 3: Write the fuzzy-match and match-promotion steps**

```typescript
// append to src/workflows/lease-digitization.ts
async function suggestMatch(
  context: DocumentContext,
  extraction: ExtractionResult,
): Promise<{ suggestedLocaleId: string | null; confidence: number | null }> {
  "use step";
  // The extraction's special_clauses/rawText don't carry a clean "tenant name"
  // field by design (the schema is scoped to the fields Diego/Renata/Mariana
  // need, not document metadata) — pull the likely name from the first line
  // of the transcription, which every generated and real contract puts the
  // tenant name on ("ARRENDATARIO: <name>").
  const nameLine = extraction.rawText.split("\n").find((l) => /ARRENDATARIO/i.test(l));
  const extractedName = nameLine?.replace(/ARRENDATARIO:?/i, "").trim() ?? "";

  const match = matchTenant(extractedName, context.candidates);
  return { suggestedLocaleId: match?.localeId ?? null, confidence: match?.confidence ?? null };
}

async function recordSuggestion(
  documentId: string,
  extraction: ExtractionResult,
  suggestion: { suggestedLocaleId: string | null; confidence: number | null },
): Promise<void> {
  "use step";
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("documents")
    .update({
      raw_text: extraction.rawText,
      extracted_fields: extraction.extractedFields,
      suggested_locale_id: suggestion.suggestedLocaleId,
      match_confidence: suggestion.confidence,
      status: "ready_for_triage",
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}

async function promoteMatch(
  documentId: string,
  decision: { confirmed: boolean; correctedLocaleId?: string },
): Promise<string | null> {
  "use step";
  const supabase = getSupabaseServiceClient();

  if (!decision.confirmed && !decision.correctedLocaleId) {
    // Client rejected the suggestion without picking a replacement — leave
    // the document sitting in ready_for_triage rather than guessing.
    return null;
  }

  const { data: document } = await supabase
    .from("documents")
    .select("suggested_locale_id")
    .eq("id", documentId)
    .single();

  const finalLocaleId = decision.correctedLocaleId ?? document?.suggested_locale_id ?? null;
  if (!finalLocaleId) return null;

  await supabase
    .from("documents")
    .update({
      locale_id: finalLocaleId,
      match_verified_at: new Date().toISOString(),
      status: "attached",
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  return finalLocaleId;
}
```

- [ ] **Step 4: Write the extraction-promotion step**

Resolves the "current" lease for the matched locale the same way `portfolio.server.ts` already does — latest `end_date` among that locale's `leases` rows — rather than inventing new selection logic.

```typescript
// append to src/workflows/lease-digitization.ts
async function promoteExtraction(
  documentId: string,
  localeId: string,
  decision: { confirmed: boolean; correctedFields?: LeaseExtractedFields },
): Promise<void> {
  "use step";
  const supabase = getSupabaseServiceClient();

  if (!decision.confirmed) return; // client rejected — leave attached, unverified, for a human to redo later

  const { data: document } = await supabase
    .from("documents")
    .select("extracted_fields")
    .eq("id", documentId)
    .single();

  const finalFields = decision.correctedFields ?? (document?.extracted_fields as LeaseExtractedFields);

  const { data: leaseRows } = await supabase
    .from("leases")
    .select("id, end_date")
    .eq("locale_id", localeId)
    .order("end_date", { ascending: false })
    .limit(1);

  const currentLeaseId = leaseRows?.[0]?.id;
  if (!currentLeaseId) {
    throw new FatalError(`no leases row found for locale ${localeId} — cannot promote extraction`);
  }

  await supabase
    .from("leases")
    .update({
      responsibility_matrix: finalFields.responsibility_matrix,
      notice_period_days: finalFields.notice_period_days,
    })
    .eq("id", currentLeaseId);

  await supabase
    .from("documents")
    .update({
      extracted_fields: finalFields,
      extraction_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}
```

- [ ] **Step 5: Write the workflow orchestration**

Two sequential `createHook`/`resumeHook` suspensions, exactly mirroring `marianaScreeningWorkflow`'s single-hook shape.

```typescript
// append to src/workflows/lease-digitization.ts
export async function leaseDigitizationWorkflow(
  documentId: string,
): Promise<{ documentId: string; status: "attached" | "failed" }> {
  "use workflow";

  const context = await loadDocumentContext(documentId);

  let extraction: ExtractionResult;
  try {
    extraction = await extractDocument(context);
  } catch (error) {
    const supabase = getSupabaseServiceClient();
    await supabase
      .from("documents")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "extraction failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);
    return { documentId, status: "failed" };
  }

  const suggestion = await suggestMatch(context, extraction);
  await recordSuggestion(documentId, extraction, suggestion);

  const matchHook = createHook<{ confirmed: boolean; correctedLocaleId?: string }>({
    token: `lease-doc-match:${documentId}`,
  });
  const matchDecision = await matchHook;
  const localeId = await promoteMatch(documentId, matchDecision);

  if (!localeId) {
    return { documentId, status: "failed" }; // rejected with no replacement — stays ready_for_triage
  }

  const extractionHook = createHook<{ confirmed: boolean; correctedFields?: LeaseExtractedFields }>({
    token: `lease-doc-extraction:${documentId}`,
  });
  const extractionDecision = await extractionHook;
  await promoteExtraction(documentId, localeId, extractionDecision);

  return { documentId, status: "attached" };
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `src/workflows/lease-digitization.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/workflows/lease-digitization.ts
git commit -m "feat: add leaseDigitizationWorkflow with the two human-confirm gates"
```

---

### Task 8: Wire `active_lease` into the ingest route

**Files:**
- Modify: `src/app/api/ingest/route.ts`

**Interfaces:**
- Consumes: `leaseDigitizationWorkflow` (Task 7).
- Produces: `POST /api/ingest` accepts `kind=active_lease` without requiring `locale_id` up front (bulk-drop doesn't know the target locale yet — that's what the workflow's fuzzy match determines).

- [ ] **Step 1: Add the new kind to the allow-list**

```typescript
// src/app/api/ingest/route.ts — modify line 12
const ALLOWED_KINDS = ["maintenance_ticket", "lease_application", "active_lease"] as const;
```

- [ ] **Step 2: Relax the `locale_id`-required check for `active_lease` only**

Modify the existing block (originally unconditional for both kinds):

```typescript
// src/app/api/ingest/route.ts — modify the locale_id validation block
if (kind !== "active_lease" && typeof localeId !== "string") {
  // Diego's ticket and Mariana's application both name a target local up
  // front. A lease document doesn't — bulk-drop matches it via fuzzy
  // tenant-name match inside leaseDigitizationWorkflow instead.
  return NextResponse.json(
    { error: "locale_id is required" },
    { status: 400 },
  );
}
```

- [ ] **Step 3: Add the workflow dispatch branch**

```typescript
// src/app/api/ingest/route.ts — modify the after() dispatch block
import { leaseDigitizationWorkflow } from "@/workflows/lease-digitization";

// ... inside after(), replacing the existing `if (typeof localeId === "string")` dispatch:
if (kind === "active_lease") {
  const run = await start(leaseDigitizationWorkflow, [documentId]);
  await supabase.from("documents").update({ workflow_run_id: run.runId }).eq("id", documentId);
} else if (typeof localeId === "string") {
  const run =
    kind === "maintenance_ticket"
      ? await start(diegoTriageWorkflow, [documentId, localeId])
      : await start(marianaScreeningWorkflow, [documentId, localeId]);
  await supabase.from("documents").update({ workflow_run_id: run.runId }).eq("id", documentId);
}
```

- [ ] **Step 4: Add `active_lease` to the intake status set correctly**

The existing insert sets `status: "extracting"` unconditionally — that's already correct for `active_lease` too (the workflow itself progresses it to `ready_for_triage`/`failed`/`attached`), so no change needed there. Confirm by re-reading the insert block — no edit, just verification.

Run: `grep -n 'status: "extracting"' src/app/api/ingest/route.ts`
Expected: one match, in the `documents` insert — applies to all three kinds uniformly, no kind-specific branch needed here.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run the dev server (`npm run dev`), then:
```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "file=@/path/to/a/clean_pdfs/contrato_A-01.pdf" \
  -F "kind=active_lease"
```
Expected: `202` with a `documentId`, no `locale_id is required` error (confirming Step 2's relaxation took effect). Check the `documents` row in Supabase — `status` progresses from `extracting` toward `ready_for_triage` shortly after.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/ingest/route.ts
git commit -m "feat: wire active_lease kind into the ingest route, dispatch to leaseDigitizationWorkflow"
```

---

### Task 9: Gate-resume routes and the signed-URL viewer route

**Files:**
- Create: `src/app/api/workflow/confirm-lease-match/route.ts`
- Create: `src/app/api/workflow/confirm-lease-extraction/route.ts`
- Create: `src/app/api/documents/[id]/signed-url/route.ts`

**Interfaces:**
- Consumes: hook tokens `lease-doc-match:${documentId}` / `lease-doc-extraction:${documentId}` (Task 7).
- Produces: three POST/GET endpoints consumed by Task 11's UI.

- [ ] **Step 1: Gate 1 resume route**

```typescript
// src/app/api/workflow/confirm-lease-match/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { resumeHook } from "workflow/api";

import { getCurrentProfile } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { documentId, confirmed, correctedLocaleId } = body as {
    documentId?: string;
    confirmed?: boolean;
    correctedLocaleId?: string;
  };

  if (typeof documentId !== "string" || typeof confirmed !== "boolean") {
    return NextResponse.json({ error: "documentId and confirmed are required" }, { status: 400 });
  }

  await resumeHook(`lease-doc-match:${documentId}`, { confirmed, correctedLocaleId });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Gate 2 resume route**

```typescript
// src/app/api/workflow/confirm-lease-extraction/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { resumeHook } from "workflow/api";

import { getCurrentProfile } from "@/lib/auth/server";
import { LeaseExtractedFieldsSchema } from "@/lib/ingest/lease-extraction-schema";

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "landlord") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { documentId, confirmed, correctedFields } = body as {
    documentId?: string;
    confirmed?: boolean;
    correctedFields?: unknown;
  };

  if (typeof documentId !== "string" || typeof confirmed !== "boolean") {
    return NextResponse.json({ error: "documentId and confirmed are required" }, { status: 400 });
  }

  let parsedFields;
  if (correctedFields !== undefined) {
    const parsed = LeaseExtractedFieldsSchema.safeParse(correctedFields);
    if (!parsed.success) {
      return NextResponse.json({ error: "correctedFields failed schema validation" }, { status: 400 });
    }
    parsedFields = parsed.data;
  }

  await resumeHook(`lease-doc-extraction:${documentId}`, { confirmed, correctedFields: parsedFields });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Signed-URL viewer route**

```typescript
// src/app/api/documents/[id]/signed-url/route.ts
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes — long enough to open and view, short-lived per spec

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (documentError || !document) {
    return NextResponse.json({ error: "document not found" }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("intake")
    .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed) {
    return NextResponse.json({ error: signError?.message ?? "failed to sign URL" }, { status: 502 });
  }

  return NextResponse.json({ url: signed.signedUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS });
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors across all three new files.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/workflow/confirm-lease-match/route.ts src/app/api/workflow/confirm-lease-extraction/route.ts src/app/api/documents/\[id\]/signed-url/route.ts
git commit -m "feat: add gate-resume routes and signed-URL viewer route for lease documents"
```

---

### Task 10: Copiloto integration

**Files:**
- Modify: `src/app/api/copiloto/ask/route.ts`

**Interfaces:**
- Consumes: `leases.responsibility_matrix`, `leases.notice_period_days` (Task 2).
- Produces: Copiloto answers questions about responsibility/notice period once a lease has been through both gates.

- [ ] **Step 1: Extend the `leasesBlock` query and mapping**

```typescript
// src/app/api/copiloto/ask/route.ts — modify fetchPortfolio() call site's leasesBlock mapping
const leasesBlock = leases.map((l) => ({
  inquilino: l.tenantEntity,
  local: l.unitCode,
  m2: l.sqm,
  renta_mensual_mxn: l.rentMonthly,
  uso_permitido: l.permittedUse,
  clausula_exclusividad: l.exclusiveUseClause,
  inicio: l.startDate,
  vencimiento: l.endDate,
  matriz_responsabilidad: l.responsibilityMatrix ?? null,
  dias_aviso_terminacion: l.noticePeriodDays ?? null,
}));
```

This requires `fetchPortfolio()`'s `LeaseDetail` type (`portfolio.server.ts`) to also select and expose `responsibility_matrix`/`notice_period_days` — add `responsibilityMatrix: Record<string, string> | null` and `noticePeriodDays: number | null` to `LeaseDetail`, select the two new columns in the `leases` query, and map them through in the `leases` array construction, following the exact pattern already used for `permittedUse`/`exclusiveUseClause` a few lines above.

- [ ] **Step 2: Correct the system prompt's PDF-access disclaimer**

```typescript
// src/app/api/copiloto/ask/route.ts — modify SYSTEM_PROMPT
const SYSTEM_PROMPT = `Eres el Copiloto IA de La Gran Vía Mexicali — cubres tanto los contratos de arrendamiento (antes "Mariana") como los tickets de mantenimiento y CapEx (antes "Diego"). Respondes preguntas del propietario usando únicamente los datos reales que se te proporcionan a continuación.

Reglas:
- Responde en español, de forma directa y ejecutiva.
- Cita el inquilino y el local (ej. "Ashley Furniture, Local A-01") cuando refieras un contrato, y el número de ticket y el local (ej. "INC-006, Local LOC-12") cuando refieras un caso de mantenimiento.
- La matriz de responsabilidad de mantenimiento (matriz_responsabilidad) y los días de aviso de terminación (dias_aviso_terminacion) provienen del contrato digitalizado y verificado por el propietario — cítalos como tales cuando los uses. Si son null, dilo explícitamente: ese contrato aún no ha sido digitalizado o verificado.
- Si la pregunta no puede responderse con los datos proporcionados, dilo explícitamente — nunca inventes cifras, cláusulas, diagnósticos, costos o fechas que no aparezcan en los datos.
- No tienes acceso a pólizas de seguro ni a garantías en depósito — esos datos no existen en este sistema.`;
```

Note the PDF-access line is removed entirely (was: *"No tienes acceso a... documentos PDF... esos datos no existen en este sistema"*) — that's now false, and the new line above tells the model how to represent a not-yet-digitized lease honestly instead.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `route.ts` or `portfolio.server.ts`.

- [ ] **Step 4: Manual verification**

Run the dev server, open the Copiloto chat, ask about a lease that has been through both gates (from Task 8's test upload): "¿Quién es responsable del HVAC en el Local A-01?"
Expected: an answer citing the tenant/local and the responsibility value from `responsibility_matrix`, not a "no tengo acceso" refusal.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/copiloto/ask/route.ts src/lib/data/portfolio.server.ts
git commit -m "feat: extend Copiloto to read responsibility_matrix and notice_period_days"
```

---

### Task 11: Legal-tab UI — upload, viewer, both gate-review forms

**Files:**
- Create: `src/components/hub/legal-documents-panel.tsx`
- Modify: `src/components/hub/landlord-dashboard.tsx`

**Interfaces:**
- Consumes: `POST /api/ingest` (Task 8), `POST /api/workflow/confirm-lease-match` and `confirm-lease-extraction` (Task 9), `GET /api/documents/[id]/signed-url` (Task 9).

- [ ] **Step 1: Build the component — document list, badge, viewer**

```tsx
// src/components/hub/legal-documents-panel.tsx
"use client";

import { useState } from "react";

type DocumentRow = {
  id: string;
  originalFilename: string;
  status: string;
  suggestedLocaleUnit: string | null;
  matchConfidence: number | null;
  extractedFields: Record<string, unknown> | null;
  extractionVerifiedAt: string | null;
};

export function LegalDocumentsPanel({ documents }: { documents: DocumentRow[] }) {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  async function openViewer(documentId: string) {
    const res = await fetch(`/api/documents/${documentId}/signed-url`);
    const json = await res.json();
    if (res.ok) setViewerUrl(json.url);
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div key={doc.id} className="border border-hairline rounded-xl p-3.5 bg-white">
          <div className="flex items-center justify-between">
            <p className="font-bold text-xs text-ink">{doc.originalFilename}</p>
            {!doc.extractionVerifiedAt && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                EXTRACCIÓN NO VERIFICADA
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => openViewer(doc.id)}
            className="text-xs font-semibold text-ink-700 underline mt-2"
          >
            Ver documento
          </button>
        </div>
      ))}
      {viewerUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewerUrl(null)}>
          <iframe src={viewerUrl} className="w-3/4 h-3/4 bg-white rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the bulk drag-drop upload zone to the same file**

```tsx
// append to src/components/hub/legal-documents-panel.tsx
export function LeaseUploadZone({ onUploaded }: { onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList) {
    setUploading(true);
    try {
      await Promise.all(
        Array.from(files).map((file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("kind", "active_lease");
          return fetch("/api/ingest", { method: "POST", body: formData });
        }),
      );
      onUploaded();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
      }}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-hairline-strong rounded-xl p-8 text-center text-xs text-ink-500"
    >
      {uploading ? "Subiendo..." : "Arrastra aquí uno o varios contratos (PDF) — o reemplaza uno existente arrastrándolo de nuevo."}
    </div>
  );
}
```

- [ ] **Step 3: Add the Gate 1 (match) review form**

```tsx
// append to src/components/hub/legal-documents-panel.tsx
export function MatchReviewForm({
  documentId,
  suggestedUnit,
  confidence,
  allUnits,
  onResolved,
}: {
  documentId: string;
  suggestedUnit: string | null;
  confidence: number | null;
  allUnits: { id: string; unitCode: string; tenantEntity: string }[];
  onResolved: () => void;
}) {
  const [selectedLocaleId, setSelectedLocaleId] = useState<string>("");

  async function confirm(confirmed: boolean) {
    await fetch("/api/workflow/confirm-lease-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId,
        confirmed,
        correctedLocaleId: selectedLocaleId || undefined,
      }),
    });
    onResolved();
  }

  return (
    <div className="space-y-2 text-xs">
      <p>
        Coincidencia sugerida: <strong>{suggestedUnit ?? "(ninguna)"}</strong>{" "}
        {confidence !== null && `(confianza ${(confidence * 100).toFixed(0)}%)`}
      </p>
      <select
        value={selectedLocaleId}
        onChange={(e) => setSelectedLocaleId(e.target.value)}
        className="border border-hairline rounded-lg px-2 py-1"
      >
        <option value="">-- corregir local --</option>
        {allUnits.map((u) => (
          <option key={u.id} value={u.id}>
            {u.unitCode} — {u.tenantEntity}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button type="button" onClick={() => confirm(true)} className="bg-ink text-white px-3 py-1 rounded-lg font-bold">
          Confirmar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add the Gate 2 (extraction) review form**

```tsx
// append to src/components/hub/legal-documents-panel.tsx
const RESPONSIBILITY_SYSTEMS = ["hvac", "roof", "plumbing", "electrical", "storefront_glass"] as const;

export function ExtractionReviewForm({
  documentId,
  extractedFields,
  onResolved,
}: {
  documentId: string;
  extractedFields: {
    responsibility_matrix: Record<(typeof RESPONSIBILITY_SYSTEMS)[number], "landlord" | "tenant" | "shared">;
    notice_period_days: number;
    special_clauses: { label: string; text: string }[];
  };
  onResolved: () => void;
}) {
  const [fields, setFields] = useState(extractedFields);

  async function confirm(confirmed: boolean) {
    await fetch("/api/workflow/confirm-lease-extraction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, confirmed, correctedFields: confirmed ? fields : undefined }),
    });
    onResolved();
  }

  return (
    <div className="space-y-2 text-xs">
      {RESPONSIBILITY_SYSTEMS.map((system) => (
        <div key={system} className="flex items-center justify-between">
          <span>{system}</span>
          <select
            value={fields.responsibility_matrix[system]}
            onChange={(e) =>
              setFields({
                ...fields,
                responsibility_matrix: {
                  ...fields.responsibility_matrix,
                  [system]: e.target.value as "landlord" | "tenant" | "shared",
                },
              })
            }
            className="border border-hairline rounded-lg px-2 py-1"
          >
            <option value="landlord">Arrendador</option>
            <option value="tenant">Arrendatario</option>
            <option value="shared">Compartido</option>
          </select>
        </div>
      ))}
      <button type="button" onClick={() => confirm(true)} className="bg-ink text-white px-3 py-1 rounded-lg font-bold">
        Confirmar extracción
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Add the server-side fetch for active-lease documents**

Add to `src/lib/data/portfolio.server.ts`, following the exact query/mapping shape already used for `leases` a few lines above:

```typescript
// append to src/lib/data/portfolio.server.ts
export type LeaseDocumentRow = {
  id: string;
  originalFilename: string;
  status: string;
  suggestedLocaleUnit: string | null;
  matchConfidence: number | null;
  extractedFields: Record<string, unknown> | null;
  extractionVerifiedAt: string | null;
};

export async function fetchActiveLeaseDocuments(): Promise<LeaseDocumentRow[]> {
  const supabase = getSupabaseServiceClient();

  const { data: rows, error } = await supabase
    .from("documents")
    .select("id, original_filename, status, suggested_locale_id, match_confidence, extracted_fields, extraction_verified_at")
    .eq("kind", "active_lease")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const localeIds = [...new Set((rows ?? []).map((r) => r.suggested_locale_id).filter((id): id is string => !!id))];
  const { data: locales } = await supabase.from("locales").select("id, unit_number").in("id", localeIds);
  const unitByLocaleId = new Map((locales ?? []).map((l) => [l.id, l.unit_number]));

  return (rows ?? []).map((r) => ({
    id: r.id,
    originalFilename: r.original_filename,
    status: r.status,
    suggestedLocaleUnit: r.suggested_locale_id ? (unitByLocaleId.get(r.suggested_locale_id) ?? null) : null,
    matchConfidence: r.match_confidence,
    extractedFields: r.extracted_fields as Record<string, unknown> | null,
    extractionVerifiedAt: r.extraction_verified_at,
  }));
}
```

- [ ] **Step 6: Mount the panel in the Legal tab**

The component calling `landlord-dashboard.tsx`'s Legal tab is the same server component that already calls `fetchPortfolio()` for `rentRoll`/`leases` (confirmed in Task 1's exploration — `landlord-dashboard.tsx` around the `85 Contratos Indexados` table). Add the new fetch alongside it, and pass the result down as a prop:

```tsx
// wherever fetchPortfolio() is currently awaited and passed into landlord-dashboard.tsx
import { fetchActiveLeaseDocuments } from "@/lib/data/portfolio.server";

const activeLeaseDocuments = await fetchActiveLeaseDocuments();
// ... pass activeLeaseDocuments as a new prop into <LandlordDashboard ... activeLeaseDocuments={activeLeaseDocuments} />
```

```tsx
// src/components/hub/landlord-dashboard.tsx — add to the component's props type, and
// inside the "expedientes" sub-tab JSX, directly below the closing </div> of the
// existing contracts table (the one rendering `leases.map((c) => ...)`):
import { LegalDocumentsPanel, LeaseUploadZone } from "./legal-documents-panel";

// ... inside the JSX:
<LeaseUploadZone onUploaded={() => window.location.reload()} />
<LegalDocumentsPanel documents={activeLeaseDocuments} />
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Manual verification in the browser**

Run the dev server, open the Legal tab. Drag a clean fixture PDF (`gran_via_test_leases/clean_pdfs/contrato_A-01.pdf`) onto the upload zone.
Expected: upload succeeds, a new document card appears (may take a few seconds for the workflow to reach `ready_for_triage`), the match-review form shows a suggested tenant with high confidence, confirming advances to the extraction-review form, confirming that clears the `EXTRACCIÓN NO VERIFICADA` badge.

- [ ] **Step 9: Commit**

```bash
git add src/components/hub/legal-documents-panel.tsx src/components/hub/landlord-dashboard.tsx
git commit -m "feat: add Legal-tab document upload, viewer, and both gate-review UIs"
```

---

### Task 12: End-to-end validation against the synthetic fixture set

**Files:**
- No new files — this is a verification pass against everything built in Tasks 1-11.

**Interfaces:**
- Consumes: the entire pipeline. Produces: a pass/fail report against `ground_truth.json`.

- [ ] **Step 1: Move the fixture set out of ephemeral scratch, if it hasn't been already**

The 82-lease synthetic set (`gran_via_test_leases/`) was generated into the session scratchpad during design and won't survive session end. Copy it somewhere durable before running this task — either `fixtures/gran_via_test_leases/` in the `OS` repo (matches the existing air-gapped synthetic-data convention) or a location of your choosing; either way, confirm the 77 clean PDFs, 5 noisy PDFs, and `ground_truth.json` all exist before proceeding.

- [ ] **Step 2: Run all 77 clean documents through the real pipeline**

```bash
for f in gran_via_test_leases/clean_pdfs/*.pdf; do
  curl -s -X POST http://localhost:3000/api/ingest -F "file=@$f" -F "kind=active_lease" | python3 -c "import json,sys; print(json.load(sys.stdin))"
done
```
Expected: every upload returns `202` with a `documentId`, no errors.

- [ ] **Step 3: Confirm every clean document reaches `ready_for_triage`**

Query the `documents` table (via `supabase db execute` or the Supabase dashboard) for `kind='active_lease'` rows created in this run.
Expected: all 77 reach `status='ready_for_triage'` within a reasonable time (a few minutes, given `workflow`'s durable execution), none land on `failed`. Any `failed` row's `error_message` should be investigated before proceeding — a clean synthetic PDF failing at this stage is a real bug, not fixture noise.

- [ ] **Step 4: Spot-check extraction accuracy against `ground_truth.json`**

For at least 10 of the 77 documents, compare `documents.extracted_fields` against the corresponding entry in `ground_truth.json` (matched by `unit_code`/tenant name).
Expected: `responsibility_matrix` values and `notice_period_days` match the ground truth exactly (this is deterministic template-generated data — the extraction either reads it correctly or it doesn't, no fuzzy tolerance needed here).

- [ ] **Step 5: Run the 5 noisy documents through the pipeline**

```bash
for f in gran_via_test_leases/noisy_pdfs/*.pdf; do
  curl -s -X POST http://localhost:3000/api/ingest -F "file=@$f" -F "kind=active_lease"
done
```

- [ ] **Step 6: Confirm the Claude-vision legibility gate's verdicts against the established fixture ground truth**

Expected, per the spec's Testing section: control, both faded, and noisy_fax reach `ready_for_triage` (legible). The skewed document's outcome should be **observed, not assumed** — record whether it reaches `failed` (matching tesseract's result) or successfully extracts (a genuine improvement over tesseract, worth noting). Either result is acceptable; a silent wrong extraction from a skewed scan with no failure signal is the only actually-bad outcome, so specifically verify that if it does fail, `error_message` clearly states why.

- [ ] **Step 7: Manually confirm both gates end-to-end for one document**

Pick one `ready_for_triage` document from Step 3, walk it through the UI from Task 11: confirm the match, confirm the extraction, verify `leases.responsibility_matrix`/`notice_period_days` are populated on the correct row and `documents.extraction_verified_at` is set.

- [ ] **Step 8: Record results**

Write a short summary (pass count, any failures and their cause, the skewed-scan outcome) — no fixed file location prescribed; note it wherever this plan's execution is being tracked (PR description, a comment on this plan file, or directly back to Roberto) so the skewed-scan finding doesn't get lost the way the earlier tesseract failure almost did.

---

## Explicitly out of scope for this plan (per spec)

- Diego (`maintenance-dispatcher`) consuming `leases.responsibility_matrix` for cost attribution — natural phase 2, the column exists and is populated by this plan, but no consuming code is written here.
- Insurance/policy document digitization.
- Word/.docx source documents.
