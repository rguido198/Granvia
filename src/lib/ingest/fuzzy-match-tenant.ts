const MIN_CONFIDENCE = 0.5;

/**
 * Pull the tenant name a lease document states for itself out of its
 * transcribed text — the "ARRENDATARIO: <name>" line every generated and real
 * contract in this set carries.
 *
 * Extracted here rather than inlined in the workflow because Gate 1's review
 * form needs the *same* string the matcher scored on: a landlord looking at
 * "Derma Club" vs "Derma Club 2" cannot verify a match from a unit code and a
 * percentage alone — they need to see what the document actually said. One
 * function, one regex, so the number and the displayed name can never drift.
 *
 * Returns null when no such line exists (a contract phrased differently, or
 * text that never got transcribed) — the caller shows "no encontrado" rather
 * than a misleading empty string.
 */
export function extractTenantNameFromDocumentText(rawText: string | null): string | null {
  if (!rawText) return null;
  const nameLine = rawText.split("\n").find((l) => /ARRENDATARIO/i.test(l));
  if (!nameLine) return null;
  // Non-greedy so a line like "EL ARRENDATARIO: X y el ARRENDATARIO sustituto"
  // cuts at the first label, not the last.
  const name = nameLine.replace(/^.*?ARRENDATARIO:?/i, "").trim();
  return name.length > 0 ? name : null;
}

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
