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

  it("passes real-world Mexican lease style: spelled ordinals, no per-clause 'Cláusula' prefix", () => {
    // Matches the exact heading style found in a real (non-synthetic) Mexican
    // commercial lease: a single "CLÁUSULAS" heading, then each clause opens
    // with a capitalized spelled-out ordinal + period, never repeating the
    // word "Cláusula".
    const realDocStyle = `CLÁUSULAS
PRIMERA. OBJETO Y LOCALIZACIÓN. El Arrendador otorga en arrendamiento al Arrendatario el Local A-01 ubicado en la planta baja.
SEGUNDA. IMPORTE DE LA RENTA. El Arrendatario pagará una renta mensual conforme a lo establecido en el presente contrato.
TERCERA. PLAZO Y VIGENCIA. El plazo del presente contrato será de cinco años contados a partir de la fecha de firma.`;
    const result = checkLegibility(realDocStyle);
    expect(result.passed).toBe(true);
    expect(result.clauseAnchors).toEqual(["PRIMERA.", "SEGUNDA.", "TERCERA."]);
  });

  it("still passes a digit-numbered document (existing behavior preserved)", () => {
    const digitDoc =
      "Cláusula 1. Objeto del Contrato. El Arrendador otorga en arrendamiento al Arrendatario el Local A-01. " +
      "Cláusula 2. Renta. El Arrendatario pagará puntualmente la renta mensual pactada.";
    const result = checkLegibility(digitDoc);
    expect(result.passed).toBe(true);
    expect(result.clauseAnchors.length).toBe(2);
  });

  it("does not treat a bare ordinal word mid-sentence as a clause anchor", () => {
    // "primera" appears in ordinary prose, not at the start of a line
    // followed by a period like a clause heading — should not count.
    const midSentence =
      "Esta es la primera vez que las partes celebran un contrato similar, sin que ello implique relación previa.";
    const result = checkLegibility(midSentence);
    expect(result.clauseAnchors.length).toBe(0);
    expect(result.passed).toBe(false);
  });
});
