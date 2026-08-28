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

// A short guard, not a real business-name length — this is a lower bound
// on how much of a normalized name has to precede a word boundary before a
// prefix match counts, to keep a two-letter fragment from matching almost
// anything.
const MIN_PREFIX_MATCH_LENGTH = 3;

/**
 * Found live: the plaza's own roster carries "PETCO" (the operational/brand
 * name a landlord actually recognizes), but a digitized contract's
 * declarative section always states the full legal name ("PETCO ANIMAL
 * SUPPLIES DE MÉXICO, S.A. DE C.V."). Whole-string Levenshtein similarity
 * scores that pair far under MIN_CONFIDENCE — ~25 of 32 characters differ —
 * even after normalize() strips the corporate suffix, so Gate 1 offered no
 * suggestion at all for an objectively unambiguous same-tenant case.
 *
 * A short name that appears as a whole word (or word sequence) at the start
 * of a longer one is exactly this pattern — a brand short-form is a prefix
 * of its own legal name, not a coincidental substring — so it's scored as a
 * near-certain match, high enough to clear MIN_CONFIDENCE on its own, but
 * short of full string-identity confidence.
 */
function prefixMatchScore(a: string, b: string): number {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length < MIN_PREFIX_MATCH_LENGTH || !longer.startsWith(shorter)) return 0;
  const rest = longer.slice(shorter.length);
  return rest === "" || rest.startsWith(" ") ? 0.9 : 0;
}

/** The single score both matchTenant (ranking candidates against a
 *  MIN_CONFIDENCE floor) and isSameTenant (a yes/no decision) are built on —
 *  they have to share this, not each run their own comparison, so a name
 *  Gate 1 confidently suggests can never be a name Gate 2 then treats as a
 *  different tenant (or vice versa). */
function nameSimilarity(a: string, b: string): number {
  return Math.max(similarity(a, b), prefixMatchScore(a, b));
}

export function matchTenant(
  extractedName: string,
  candidates: { id: string; tenantEntity: string }[],
): { localeId: string; confidence: number } | null {
  if (candidates.length === 0) return null;

  const normalizedExtracted = normalize(extractedName);
  let best: { localeId: string; confidence: number } | null = null;

  for (const candidate of candidates) {
    const confidence = nameSimilarity(normalizedExtracted, normalize(candidate.tenantEntity));
    if (!best || confidence > best.confidence) {
      best = { localeId: candidate.id, confidence };
    }
  }

  return best && best.confidence >= MIN_CONFIDENCE ? best : null;
}

/**
 * Is `a` and `b` close enough to be the same real-world tenant — a short
 * brand name against its own full legal name, an OCR-mangled spelling, a
 * formatting difference — rather than two different businesses? Same
 * MIN_CONFIDENCE floor and same nameSimilarity scoring matchTenant uses, so
 * a name Gate 1 suggests with confidence and a name Gate 2 checks for an
 * overwrite risk can never disagree about whether it's the same tenant.
 */
export function isSameTenant(a: string, b: string): boolean {
  return nameSimilarity(normalize(a), normalize(b)) >= MIN_CONFIDENCE;
}
