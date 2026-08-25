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
});
