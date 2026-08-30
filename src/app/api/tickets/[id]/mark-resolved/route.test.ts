import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// New pattern for this repo — no existing route-handler test precedent
// (only pure-function vitest tests, e.g. src/lib/site-session.test.ts).
// Mocks the two server-only modules the route imports and calls the
// exported POST handler directly, same way Next.js route handlers are
// meant to be unit-tested — no server process needed.
const mockGetCurrentProfile = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/auth/server", () => ({
  getCurrentProfile: () => mockGetCurrentProfile(),
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServiceClient: () => ({ rpc: mockRpc }),
}));

const { POST } = await import("./route");

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/tickets/t1/mark-resolved", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "t1" }) };
const landlord = { role: "landlord", fullName: "Landlord Name", email: "landlord@example.com", id: "p1", localeId: null };

describe("POST /api/tickets/[id]/mark-resolved", () => {
  beforeEach(() => {
    mockGetCurrentProfile.mockReset();
    mockRpc.mockReset();
  });

  it("rejects non-landlord roles without calling the RPC", async () => {
    mockGetCurrentProfile.mockResolvedValue({ ...landlord, role: "tenant" });
    const res = await POST(makeRequest({ workPerformed: "did stuff" }), params);
    expect(res.status).toBe(401);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects empty workPerformed without calling the RPC", async () => {
    mockGetCurrentProfile.mockResolvedValue(landlord);
    const res = await POST(makeRequest({ workPerformed: "   " }), params);
    expect(res.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a negative final cost without calling the RPC", async () => {
    mockGetCurrentProfile.mockResolvedValue(landlord);
    const res = await POST(makeRequest({ workPerformed: "Reemplacé la válvula.", finalCost: -1 }), params);
    expect(res.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects an absurdly large final cost without calling the RPC", async () => {
    mockGetCurrentProfile.mockResolvedValue(landlord);
    const res = await POST(makeRequest({ workPerformed: "Reemplacé la válvula.", finalCost: 50_000_000 }), params);
    expect(res.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("maps an already-transitioned ticket to 409, previous status included", async () => {
    mockGetCurrentProfile.mockResolvedValue(landlord);
    mockRpc.mockResolvedValue({ data: { ok: false, reason: "invalid_status", previous_status: "closed" }, error: null });
    const res = await POST(makeRequest({ workPerformed: "Reemplacé la válvula." }), params);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toContain("closed");
  });

  it("a second call against an already-resolved ticket is rejected the same way, not double-applied", async () => {
    mockGetCurrentProfile.mockResolvedValue(landlord);
    mockRpc.mockResolvedValueOnce({ data: { ok: true }, error: null });
    mockRpc.mockResolvedValueOnce({ data: { ok: false, reason: "invalid_status", previous_status: "pending_confirmation" }, error: null });

    const first = await POST(makeRequest({ workPerformed: "Reemplacé la válvula." }), params);
    const second = await POST(makeRequest({ workPerformed: "Reemplacé la válvula otra vez." }), params);

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it("trims workPerformed and forwards the actor's name to the RPC on success", async () => {
    mockGetCurrentProfile.mockResolvedValue(landlord);
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
    const res = await POST(makeRequest({ workPerformed: "  Reemplacé la válvula.  ", finalCost: 1200 }), params);
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("mark_ticket_work_done", {
      p_ticket_id: "t1",
      p_actor: "Landlord Name",
      p_work_performed: "Reemplacé la válvula.",
      p_final_cost: 1200,
    });
  });
});
