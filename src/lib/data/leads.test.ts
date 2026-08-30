import { describe, it, expect } from "vitest";
import { LEAD_STAGES, LEAD_STAGE_LABELS } from "./lead-types";

describe("lead-types utility", () => {
  it("defines standard lead stages in expected sequence", () => {
    expect(LEAD_STAGES).toEqual([
      "contacted",
      "touring_scheduled",
      "touring_done",
      "application_requested",
      "converted",
      "lost",
    ]);
  });

  it("provides human-readable labels in Spanish for all lead stages", () => {
    for (const stage of LEAD_STAGES) {
      expect(LEAD_STAGE_LABELS[stage]).toBeDefined();
      expect(typeof LEAD_STAGE_LABELS[stage]).toBe("string");
      expect(LEAD_STAGE_LABELS[stage].length).toBeGreaterThan(0);
    }
  });

  it("has valid labels for converted and lost stages", () => {
    expect(LEAD_STAGE_LABELS.converted).toBe("Convertido a Solicitud");
    expect(LEAD_STAGE_LABELS.lost).toBe("Perdido");
  });
});
