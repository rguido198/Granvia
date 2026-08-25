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
