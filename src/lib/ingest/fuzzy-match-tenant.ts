const MIN_CONFIDENCE = 0.5;

/**
 * Pull the tenant name a lease document states for itself out of its
 * transcribed text.
 *
 * Extracted here rather than inlined in the workflow because Gate 1's review
 * form needs the *same* string the matcher scored on: a landlord looking at
 * "Derma Club" vs "Derma Club 2" cannot verify a match from a unit code and a
 * percentage alone — they need to see what the document actually said. One
 * function, so the number and the displayed name can never drift.
 *
 * Two shapes, tried in order:
 *
 * 1. A label line that OPENS with "ARRENDATARIO" (optionally "EL "-prefixed)
 *    and states the name right after the colon — this repo's synthetic
 *    fixtures ("ARRENDATARIO: MINT Boutique") and some real contracts. The
 *    anchor to line-start matters: a narrative clause that merely mentions
 *    the word mid-sentence — "II. Declara el ARRENDATARIO: Que es una
 *    persona moral..." — has a colon too, but does not open the line, so it
 *    is never mistaken for the name.
 * 2. A standalone "EL ARRENDATARIO" label line with no colon and nothing
 *    else on it, immediately followed by the name on its own line — the
 *    signature-block shape most real Mexican commercial leases actually use.
 *    Needed because those contracts typically never state the name on a
 *    labeled line at all: the preamble instead *defines* ARRENDATARIO as a
 *    term after already naming the party — "...LA SOCIEDAD MERCANTIL
 *    DENOMINADA MINT BOUTIQUE, S.A. DE C.V. ... (EN LO SUCESIVO DENOMINADA
 *    COMO EL 'ARRENDATARIO'), AL TENOR DE..." — which has no colon
 *    immediately after the word and would otherwise be misread as the name
 *    line, since the text after it ("AL TENOR DE LAS SIGUIENTES...") is not
 *    the tenant's name.
 *
 * Returns null when neither shape is found (a contract phrased some other
 * way, or text that never got transcribed) — the caller shows "no
 * encontrado" rather than a misleading empty string.
 */
export function extractTenantNameFromDocumentText(rawText: string | null): string | null {
  if (!rawText) return null;
  const lines = rawText.split("\n");

  const labelLine = lines.find((l) => /^\s*(el\s+)?arrendatario\s*:/i.test(l));
  if (labelLine) {
    const name = labelLine.replace(/^\s*(el\s+)?arrendatario\s*:/i, "").trim();
    return name.length > 0 ? name : null;
  }

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(el\s+)?arrendatario\s*$/i.test(lines[i])) {
      const next = lines[i + 1]?.trim();
      if (next) return next;
    }
  }

  return null;
}

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
function normalize(s: string): string {
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
