/**
 * Runs the 82-lease synthetic fixture set (tests/fixtures/leases/) through
 * the real extraction logic (src/lib/ingest/lease-extraction.ts) and grades
 * the output against tests/fixtures/leases/ground_truth.json — the
 * pipeline-design spec's own prescribed eval ("run all 82 through the real
 * pipeline end-to-end, check extracted_fields output against
 * ground_truth.json's known answers per lease").
 *
 * Deliberately NOT a vitest test: makes real, paid Anthropic API calls (one
 * vision call per fixture, 82 by default) and takes minutes to run — must
 * never run as part of `npm test`. Invoke explicitly:
 *
 *   npm run eval:lease-extraction [-- --limit N]
 *
 * Scope: extraction only, via extractFromVision uniformly for every fixture
 * (both clean_pdfs and noisy_pdfs) — not the full Cloudflare Workflow
 * (leaseDigitizationWorkflow's two human-approval gates, DB writes onto
 * `documents`/`leases`). That workflow requires a running Workflow binding
 * (wrangler dev), a separate and heavier harness than what's being graded
 * here: extraction accuracy, specifically for the eight clause fields just
 * promoted out of special_clauses (parking, directory advertising, expansion
 * option, extended hours, signage, pets, sublease restriction, remodeling).
 * extractFromVision uses the same EXTRACTION_SYSTEM_PROMPT as the text path
 * (VISION_SYSTEM_PROMPT = EXTRACTION_SYSTEM_PROMPT + a transcription
 * instruction), so extraction quality is the same signal either path would
 * give — running vision uniformly here isn't testing pdf-parse itself, which
 * this change never touched.
 *
 * Requires ANTHROPIC_API_KEY (same as the running app). `server-only`
 * (imported by lease-extraction.ts) resolves to a no-op only under Node's
 * "react-server" condition — see package.json's eval:lease-extraction script
 * for the required --conditions flag, same as eval:copiloto.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractFromVision } from "../src/lib/ingest/lease-extraction";
import type { LeaseExtractedFields } from "../src/lib/ingest/lease-extraction-schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "..", "tests", "fixtures", "leases");

type GroundTruthEntry = {
  unit_code: string;
  tenant_name: string;
  is_noisy_scan: boolean;
  defect_type: string | null;
  responsibility_matrix: Record<string, "Arrendador" | "Arrendatario">;
  notice_period_days: number;
  questions: { question: string; answer: string }[];
};

// Ground truth's Spanish system labels -> the schema's five system keys.
// Ground truth never states cristal de fachada (storefront_glass) for any of
// the 82 fixtures (confirmed: every entry has exactly 4 keys) — not graded.
const SYSTEM_LABEL_TO_KEY: Record<string, keyof LeaseExtractedFields["responsibility_matrix"]> = {
  "HVAC / Clima": "hvac",
  "Techo / Impermeabilización": "roof",
  "Plomería": "plumbing",
  "Instalación Eléctrica": "electrical",
};
const PARTY_LABEL_TO_KEY: Record<string, "landlord" | "tenant"> = {
  Arrendador: "landlord",
  Arrendatario: "tenant",
};

// Ground truth's single free-text "special clause" answer, when present, is
// shaped "label: text". If that label maps to one of the eight now-named
// clause fields, extraction should have promoted it there instead of leaving
// it in special_clauses — this is the actual behavior this eval exists to
// check, not just re-verifying pre-existing responsibility_matrix/
// notice_period_days accuracy (already covered by the design spec's original
// testing intent).
const LABEL_TO_NAMED_FIELD: Record<string, keyof LeaseExtractedFields> = {
  "estacionamiento reservado": "parking_clause",
  "publicidad en directorio": "directory_advertising_clause",
  "ampliación futura": "expansion_option_clause",
  "horario extendido": "extended_hours_clause",
  "señalización exterior": "signage_clause",
  mascotas: "pets_clause",
  "subarrendamiento restringido": "sublease_restriction_clause",
  remodelación: "remodeling_clause",
};

function findFixturePath(unitCode: string): { filePath: string; isNoisy: boolean } {
  for (const [dir, isNoisy] of [
    ["clean_pdfs", false],
    ["noisy_pdfs", true],
  ] as const) {
    const files = readdirSync(path.join(FIXTURES_DIR, dir));
    const match = files.find((f) => f === `contrato_${unitCode}.pdf` || f.startsWith(`contrato_${unitCode}_`));
    if (match) return { filePath: path.join(FIXTURES_DIR, dir, match), isNoisy };
  }
  throw new Error(`no fixture PDF found for unit_code ${unitCode}`);
}

function findSpecialClauseAnswer(entry: GroundTruthEntry): string | null {
  const q = entry.questions.find((q) => q.question.includes("cláusula especial"));
  return q?.answer ?? null;
}

type CaseResult = {
  unitCode: string;
  isNoisy: boolean;
  notice: "match" | "mismatch";
  responsibility: "match" | "mismatch";
  responsibilityDetail: string | null;
  namedClausePromotion: "match" | "mismatch" | "n/a";
  namedClauseDetail: string | null;
  error: string | null;
};

async function runCase(entry: GroundTruthEntry): Promise<CaseResult> {
  const { filePath, isNoisy } = findFixturePath(entry.unit_code);
  const bytes = new Uint8Array(readFileSync(filePath));

  let fields: LeaseExtractedFields;
  try {
    const result = await extractFromVision(bytes, "application/pdf");
    fields = result.extractedFields;
  } catch (error) {
    return {
      unitCode: entry.unit_code,
      isNoisy,
      notice: "mismatch",
      responsibility: "mismatch",
      responsibilityDetail: null,
      namedClausePromotion: "mismatch",
      namedClauseDetail: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const notice = fields.notice_period_days === entry.notice_period_days ? "match" : "mismatch";

  const responsibilityMismatches: string[] = [];
  for (const [label, party] of Object.entries(entry.responsibility_matrix)) {
    const key = SYSTEM_LABEL_TO_KEY[label];
    const expected = PARTY_LABEL_TO_KEY[party];
    if (!key || !expected) continue;
    if (fields.responsibility_matrix[key] !== expected) {
      responsibilityMismatches.push(`${key}: expected ${expected}, got ${fields.responsibility_matrix[key]}`);
    }
  }

  const specialClauseAnswer = findSpecialClauseAnswer(entry);
  let namedClausePromotion: CaseResult["namedClausePromotion"] = "n/a";
  let namedClauseDetail: string | null = null;
  if (specialClauseAnswer && specialClauseAnswer.includes(":")) {
    const label = specialClauseAnswer.split(":", 1)[0].trim().toLowerCase();
    const namedField = LABEL_TO_NAMED_FIELD[label];
    if (namedField) {
      const value = fields[namedField];
      namedClausePromotion = typeof value === "string" && value.length > 0 ? "match" : "mismatch";
      namedClauseDetail = `expected ${namedField} to be non-null (ground truth label "${label}"), got ${JSON.stringify(value)}`;
    }
  }

  return {
    unitCode: entry.unit_code,
    isNoisy,
    notice,
    responsibility: responsibilityMismatches.length === 0 ? "match" : "mismatch",
    responsibilityDetail: responsibilityMismatches.length > 0 ? responsibilityMismatches.join("; ") : null,
    namedClausePromotion,
    namedClauseDetail,
    error: null,
  };
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
  const noisyOnly = process.argv.includes("--noisy-only");

  const groundTruth: GroundTruthEntry[] = JSON.parse(
    readFileSync(path.join(FIXTURES_DIR, "ground_truth.json"), "utf-8"),
  );
  const filtered = noisyOnly ? groundTruth.filter((e) => e.is_noisy_scan) : groundTruth;
  const cases = limit ? filtered.slice(0, limit) : filtered;

  console.log(`Running ${cases.length} of ${groundTruth.length} fixtures through extractFromVision...\n`);

  const results: CaseResult[] = [];
  for (const entry of cases) {
    process.stdout.write(`${entry.unit_code} (${entry.tenant_name})... `);
    const result = await runCase(entry);
    results.push(result);
    console.log(
      result.error
        ? `ERROR: ${result.error}`
        : `notice=${result.notice} responsibility=${result.responsibility} named_clause=${result.namedClausePromotion}`,
    );
  }

  const errors = results.filter((r) => r.error !== null);
  const noticeMismatches = results.filter((r) => r.notice === "mismatch" && !r.error);
  const responsibilityMismatches = results.filter((r) => r.responsibility === "mismatch" && !r.error);
  const namedClauseCases = results.filter((r) => r.namedClausePromotion !== "n/a");
  const namedClauseMismatches = namedClauseCases.filter((r) => r.namedClausePromotion === "mismatch");

  console.log("\n=== Summary ===");
  console.log(`Total: ${results.length}, errors: ${errors.length}`);
  console.log(`notice_period_days: ${results.length - errors.length - noticeMismatches.length}/${results.length - errors.length} match`);
  console.log(
    `responsibility_matrix: ${results.length - errors.length - responsibilityMismatches.length}/${results.length - errors.length} match`,
  );
  console.log(
    `named clause promotion (of ${namedClauseCases.length} cases where ground truth's special clause maps to a named field): ${namedClauseCases.length - namedClauseMismatches.length}/${namedClauseCases.length} match`,
  );

  if (errors.length > 0) {
    console.log("\n--- Errors ---");
    for (const r of errors) console.log(`${r.unitCode}: ${r.error}`);
  }
  if (noticeMismatches.length > 0) {
    console.log("\n--- notice_period_days mismatches ---");
    for (const r of noticeMismatches) console.log(`${r.unitCode}`);
  }
  if (responsibilityMismatches.length > 0) {
    console.log("\n--- responsibility_matrix mismatches ---");
    for (const r of responsibilityMismatches) console.log(`${r.unitCode}: ${r.responsibilityDetail}`);
  }
  if (namedClauseMismatches.length > 0) {
    console.log("\n--- named clause promotion mismatches ---");
    for (const r of namedClauseMismatches) console.log(`${r.unitCode}: ${r.namedClauseDetail}`);
  }

  if (errors.length > 0 || noticeMismatches.length > 0 || responsibilityMismatches.length > 0 || namedClauseMismatches.length > 0) {
    process.exitCode = 1;
  }
}

main();
