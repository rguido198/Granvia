const MIN_CONFIDENCE = 0.5;

// Corporate legal-entity suffixes, matched after punctuation is stripped and
// the string is collapsed to single spaces — so "S.A. de C.V." and "S DE RL
// DE CV" both reduce to the same bare token sequence this matches against.
// Longer suffixes first so "sapi de cv" isn't left with a dangling "de cv"
// after a shorter alternative eats part of it.
const CORPORATE_SUFFIX = /\s+(sapi de cv|s de rl de cv|sa de cv|s de rl|sc|ac)$/i;

/**
 * Found live on contrato-arrendamiento-b10-mint-boutique.pdf: the extracted
 * name is a full legal name ("MINT Boutique, S.A. de C.V."), but this
 * plaza's own tenant roster is inconsistent about carrying the same suffix
 * (some rows are bare "MINT Boutique", others carry their own "... S.A. de
 * C.V."). Comparing full legal names means that near-universal suffix — a
 * long, shared substring on almost every Mexican corporate tenant — can
 * dominate the Levenshtein distance: it let an unrelated tenant that also
 * happened to carry "S.A. de C.V." score just over MIN_CONFIDENCE while the
 * actual match, missing that suffix in the roster, scored under it. Strip
 * the suffix from both sides before comparing so the score reflects the
 * business name, not shared corporate boilerplate.
 */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[.,]/g, "") // punctuation-insensitive: "S.A." and "SA" match the same
    .trim()
    .replace(/\s+/g, " ")
    .replace(CORPORATE_SUFFIX, "")
    .trim();
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
