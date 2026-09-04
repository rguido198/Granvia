import { describe, it, expect, vi } from "vitest";
import { buildFullClauseList } from "./lease-clauses.server";
import type { LeaseExtractedFields } from "@/lib/ingest/lease-extraction-schema";

// Mock server-only to allow Vitest execution outside Next.js server context
vi.mock("server-only", () => ({}));

function makeFields(overrides: Partial<LeaseExtractedFields>): LeaseExtractedFields {
  return {
    tenant_entity: "Test Tenant",
    trade_name: null,
    area_sqm: 100,
    base_rent_monthly: 10000,
    start_date: "2024-01-01",
    end_date: "2027-01-01",
    permitted_use: null,
    exclusive_use_clause: null,
    parking_clause: null,
    directory_advertising_clause: null,
    expansion_option_clause: null,
    extended_hours_clause: null,
    signage_clause: null,
    pets_clause: null,
    sublease_restriction_clause: null,
    remodeling_clause: null,
    responsibility_matrix: null,
    notice_period_days: null,
    special_clauses: [],
    ...overrides,
  } as LeaseExtractedFields;
}

describe("buildFullClauseList", () => {
  it("returns an empty list when nothing was extracted", () => {
    expect(buildFullClauseList(makeFields({}))).toEqual([]);
  });

  it("includes exclusive_use_clause under its own label", () => {
    const result = buildFullClauseList(makeFields({ exclusive_use_clause: "Exclusividad de café." }));
    expect(result).toEqual([{ label: "Cláusula de Exclusividad", text: "Exclusividad de café." }]);
  });

  it("includes each populated named clause, skipping null ones", () => {
    const result = buildFullClauseList(
      makeFields({ parking_clause: "2 cajones reservados.", pets_clause: null, signage_clause: "Rótulo exterior permitido." }),
    );
    expect(result).toEqual([
      { label: "Estacionamiento Reservado", text: "2 cajones reservados." },
      { label: "Señalización Exterior", text: "Rótulo exterior permitido." },
    ]);
  });

  it("appends special_clauses after exclusivity and named clauses, in order", () => {
    const result = buildFullClauseList(
      makeFields({
        exclusive_use_clause: "Exclusividad.",
        parking_clause: "Estacionamiento.",
        special_clauses: [{ label: "Cláusula Novena", text: "Algo no cubierto por las columnas fijas." }],
      }),
    );
    expect(result).toEqual([
      { label: "Cláusula de Exclusividad", text: "Exclusividad." },
      { label: "Estacionamiento Reservado", text: "Estacionamiento." },
      { label: "Cláusula Novena", text: "Algo no cubierto por las columnas fijas." },
    ]);
  });
});
