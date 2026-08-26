const ALPHA_PATTERN = /[A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g;
// Mexican commercial leases often number clauses with spelled-out Spanish
// ordinals ("PRIMERA. OBJETO...", "SEGUNDA. IMPORTE...") instead of repeating
// "Cláusula" + a digit before every clause — the keyword usually appears only
// once, in a document-level heading ("CLÁUSULAS"). To stay conservative (an
// ordinal word alone can appear anywhere in prose, e.g. "por primera vez"),
// the spelled-ordinal branch only counts as an anchor when it sits at the
// start of a line and is immediately followed by a period, mirroring the
// real heading style. Covers ordinals through 20th (vigésima); accented and
// unaccented forms are handled the same way the existing keyword group
// handles Cl[aá]usula/Art[ií]culo, via character classes rather than listing
// each accent variant twice.
const SPELLED_ORDINAL =
  "(?:primera|segunda|tercera|cuarta|quinta|sexta|s[eé]ptima|octava|novena|d[eé]cima|" +
  "und[eé]cima|duod[eé]cima|decimotercera|decimocuarta|decimoquinta|decimosexta|" +
  "decimos[eé]ptima|decimoctava|decimonovena|vig[eé]sima)";
const CLAUSE_PATTERN = new RegExp(
  `(Cl[aá]usula|Art[ií]culo|§)\\s*\\d+|^\\s*${SPELLED_ORDINAL}\\.`,
  "gim",
);
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
