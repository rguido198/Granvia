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
