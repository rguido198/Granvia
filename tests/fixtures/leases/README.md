# Lease digitization test fixtures

Synthetic lease contract PDFs — **not real client data** — generated to validate
the lease-document digitization pipeline (`src/workflows/lease-digitization.ts`)
end to end, from upload through extraction, fuzzy tenant/locale matching, and
both human confirmation gates.

## Contents

- `clean_pdfs/` — 77 cleanly rendered synthetic lease contracts, one per unit
  code (e.g. `contrato_C-41.pdf`), exercising native-text extraction.
- `noisy_pdfs/` — 5 degraded scans (faded, skewed, faxed, etc. — see each
  filename's suffix) of the same kind of contract, exercising the
  vision-extraction fallback path and OCR-legibility edge cases.
- `ground_truth.json` — the known-correct answer for every one of the 82
  lease PDFs above, keyed by `unit_code`.

## `ground_truth.json` shape

A JSON array of 82 objects, one per PDF, each shaped like:

```json
{
  "unit_code": "C-41",
  "tenant_name": "Derma Club 2",
  "is_noisy_scan": false,
  "defect_type": null,
  "responsibility_matrix": {
    "HVAC / Clima": "Arrendador",
    "Techo / Impermeabilización": "Arrendador",
    "Plomería": "Arrendador",
    "Instalación Eléctrica": "Arrendador"
  },
  "notice_period_days": 60,
  "questions": [
    { "question": "...", "answer": "..." }
  ]
}
```

- `unit_code` / `tenant_name` — identify which PDF (in `clean_pdfs/` or
  `noisy_pdfs/`) this entry grades.
- `is_noisy_scan` / `defect_type` — `true`/non-null only for entries in
  `noisy_pdfs/`, naming the degradation applied (e.g. `faded`, `skewed`,
  `noisy_fax`).
- `responsibility_matrix` / `notice_period_days` — the exact fields
  `promoteExtraction()` in `src/workflows/lease-digitization.ts` writes onto a
  `leases` row once a landlord confirms Gate 2 — compare the pipeline's
  extraction output against these directly.
- `questions` — a per-lease Q&A set (in Spanish, matching the app's locale)
  covering vencimiento, notice period, per-system responsibility, special
  clauses, and exclusivity — useful for grading a retrieval/QA layer on top of
  the extracted fields, not just the raw field match.

## Regenerating or extending the set

Generation scripts are not checked in here — regenerate via whatever produced
the original 82-lease set (Task 12's validation run), keeping the same
`unit_code`-per-file convention and the `ground_truth.json` shape above so
existing pipeline tests keep working unmodified. When adding new fixtures,
append new entries to `ground_truth.json` rather than replacing it, and keep
`is_noisy_scan`/`defect_type` accurate for anything placed under
`noisy_pdfs/`.
