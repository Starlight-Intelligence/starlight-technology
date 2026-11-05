import { describe, expect, it } from "vitest";
import { createFinderTools } from "./finder-webmcp";
import type { FinderInput } from "./decision-model";

describe("system finder browser tools", () => {
  function fixture() {
    let input: FinderInput = { workload: "local-ai", budget: "3000", priority: "balance" };
    const tools = createFinderTools(() => input, (next) => { input = next; });
    return { read: tools[0], configure: tools[1] };
  }
  it("updates the shared state before returning the planning direction", () => {
    const { read, configure } = fixture();
    const input = { workload: "travel", budget: "1500", priority: "mobility" };
    const result = configure.execute(input);
    expect(result).toEqual(read.execute({}));
    expect(result).toMatchObject({ input, status: "planning_direction", direction: { href: "/builds/portable-ai-music-studio-under-4kg" } });
  });
  it("rejects malformed arguments without changing the visible inputs", () => {
    const { read, configure } = fixture();
    const before = read.execute({});
    for (const invalid of [null, [], {}, { workload: "travel", budget: 1500, priority: "mobility" },
      { workload: "travel", budget: "1500", priority: "mobility", checkout: true }]) {
      expect(() => configure.execute(invalid)).toThrow();
      expect(read.execute({})).toEqual(before);
    }
  });
  it("reads fresh human edits and returns snapshots rather than mutable state", () => {
    let input: FinderInput = { workload: "local-ai", budget: "3000", priority: "balance" };
    const [read] = createFinderTools(() => input, () => {});
    const before = read.execute({});
    input = { workload: "studio", budget: "7000", priority: "performance" };
    expect(read.execute({})).toMatchObject({ input, direction: { href: "/builds/hybrid-desktop-travel-system" } });
    expect(before).toMatchObject({ input: { budget: "3000" } });
    expect(() => read.execute({ query: "private" })).toThrow();
  });
});
