import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Ownership (locale_id match) now lives inside confirm_ticket_resolution()
// itself (supabase/migrations/20260829000008_ticket_transition_rpcs.sql),
// not in this route — so these mocked tests can only prove
// profile.localeId is actually threaded into the RPC call, not that a
// real mismatched locale is rejected. That's what
// supabase/tests/ticket_transitions.sql exists for.
const mockGetCurrentProfile = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/auth/server", () => ({
  getCurrentProfile: () => mockGetCurrentProfile(),
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceClient: () => ({ rpc: mockRpc }),
}));

const { POST } = await import("./route");

function makeRequest() {
  return new NextRequest("http://localhost/api/tickets/t1/confirm-resolved", { method: "POST" });
}

const params = { params: Promise.resolve({ id: "t1" }) };
const tenant = { role: "tenant", fullName: "Tenant Name", email: "tenant@example.com", id: "p2", localeId: "loc-1" };

describe("POST /api/tickets/[id]/confirm-resolved", () => {
  beforeEach(() => {
    mockGetCurrentProfile.mockReset();
    mockRpc.mockReset();
  });

  it("rejects non-tenant roles without calling the RPC", async () => {
    mockGetCurrentProfile.mockResolvedValue({ ...tenant, role: "landlord" });
    const res = await POST(makeRequest(), params);
    expect(res.status).toBe(401);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a tenant profile with no localeId without calling the RPC", async () => {
    mockGetCurrentProfile.mockResolvedValue({ ...tenant, localeId: null });
    const res = await POST(makeRequest(), params);
    expect(res.status).toBe(401);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("passes the authenticated profile's own localeId to the RPC — the actual ownership check", async () => {
    mockGetCurrentProfile.mockResolvedValue(tenant);
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
    await POST(makeRequest(), params);
    expect(mockRpc).toHaveBeenCalledWith("confirm_ticket_resolution", {
      p_ticket_id: "t1",
      p_locale_id: "loc-1",
      p_confirmed_by: "Tenant Name",
    });
  });

  it("maps the RPC's forbidden result to 401 (a real ownership mismatch, verified against Postgres in ticket_transitions.sql, not here)", async () => {
    mockGetCurrentProfile.mockResolvedValue(tenant);
    mockRpc.mockResolvedValue({ data: { ok: false, reason: "forbidden" }, error: null });
    const res = await POST(makeRequest(), params);
    expect(res.status).toBe(401);
  });

  it("maps invalid_status to 409", async () => {
    mockGetCurrentProfile.mockResolvedValue(tenant);
    mockRpc.mockResolvedValue({ data: { ok: false, reason: "invalid_status", previous_status: "closed" }, error: null });
    const res = await POST(makeRequest(), params);
    expect(res.status).toBe(409);
  });

  it("a second concurrent-style call after success is rejected, not double-applied", async () => {
    mockGetCurrentProfile.mockResolvedValue(tenant);
    mockRpc.mockResolvedValueOnce({ data: { ok: true }, error: null });
    mockRpc.mockResolvedValueOnce({ data: { ok: false, reason: "invalid_status", previous_status: "closed" }, error: null });

    const first = await POST(makeRequest(), params);
    const second = await POST(makeRequest(), params);

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
  });
});
