import { describe, expect, it, vi } from "vitest";
import { collectApprovedFeed } from "./compute-collection";

const source = { id: "feed", feedUrl: "https://merchant.example/feed", approved: true, maxCallsPerDay: 1,
  maxCostMicrosPerDay: 100, reservedCostMicros: 100 };
function dependencies(response: Response) {
  const settle = vi.fn();
  return { settle, reserve: vi.fn().mockResolvedValue({ settle }), fetch: vi.fn().mockResolvedValue(response), accept: vi.fn() };
}

describe("approved hardware feed", () => {
  it("avoids provider calls before approval and a successful reservation", async () => {
    const deps = dependencies(Response.json([]));
    expect(await collectApprovedFeed({ ...source, approved: false }, "run", deps)).toBe("disabled");
    deps.reserve.mockResolvedValueOnce(null);
    expect(await collectApprovedFeed(source, "run", deps)).toBe("budget-exhausted");
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it("bounds provider responses and records the reserved cost", async () => {
    const deps = dependencies(Response.json({ payload: "x".repeat(256 * 1024) }));
    expect(await collectApprovedFeed(source, "run", deps)).toMatchObject({ status: "rejected" });
    expect(deps.accept).not.toHaveBeenCalled();
    expect(deps.settle).toHaveBeenCalledWith({ status: "rejected", chargedAtMostMicros: 100 });
  });

  it("hands allowed JSON to the source-specific validator and respects throttling", async () => {
    const deps = dependencies(Response.json({ rows: [] }));
    expect(await collectApprovedFeed(source, "run", deps)).toMatchObject({ status: "collected" });
    expect(deps.fetch.mock.calls[0][1]).toMatchObject({ redirect: "error" });
    expect(deps.accept).toHaveBeenCalledWith("feed", expect.any(Uint8Array));
    const throttled = dependencies(new Response(null, { status: 429, headers: { "Retry-After": "120" } }));
    expect(await collectApprovedFeed(source, "another-run", throttled)).toEqual({ status: "retry", retryAfterSeconds: 120 });
  });
});
