import { describe, expect, it } from "vitest";
import { brandSupply, capacityTable, companies, expansionFindings, fits, headlinePrice, ladderGroups, ladderRows, machines, stats, workloads } from "./compute";

describe("compute data layer", () => {
  it("matches the validated .mjs rules on every machine and workload", async () => {
    const lib = (await import(/* @vite-ignore */ "../../scripts/compute/lib.mjs" as string)) as {
      fits: (m: unknown, w: unknown) => boolean | null;
      headlinePrice: (m: unknown) => unknown;
    };
    for (const m of machines) {
      expect(headlinePrice(m)).toEqual(lib.headlinePrice(m));
      for (const w of workloads) expect(fits(m, w)).toBe(lib.fits(m, w));
    }
  });

  it("builds a price ladder from page-read prices with Apple shown as reported", () => {
    const rows = ladderRows(64);
    expect(rows.length).toBeGreaterThan(8);
    expect(rows.every((r, i) => i === 0 || rows[i - 1].amountEur <= r.amountEur)).toBe(true);
    const mac = rows.find((r) => r.id === "apple-mac-studio-m5max-64");
    expect(mac?.evidence).toBe("reported");
    expect(rows.find((r) => r.id === "gmktec-evo-x2-128")?.evidence).toBe("page-read");
    const hp = rows.find((r) => r.id === "hp-z2-mini-g1a-128");
    expect(hp?.amountEur).toBe(3890.15);
    expect(hp?.tax).toBe("incl. VAT");
    expect(rows.find((r) => r.id === "gmktec-evo-x2-128")?.sourceUrl).toMatch(/^https:\/\/geizhals\.at\//);
    expect(rows.every((r) => r.verifiedOn === "2026-10-05")).toBe(true);
  });

  it("groups the ladder by memory size with a price range per group", () => {
    const groups = ladderGroups(64);
    expect(groups.map((g) => g.memoryGb)).toEqual([64, 96, 128, 192]);
    const g128 = groups.find((g) => g.memoryGb === 128)!;
    expect(g128.low).toBe(3499.99);
    expect(g128.high).toBe(3999);
    expect(g128.rows.some((r) => r.boardOnly)).toBe(true);
    expect(g128.rangeIsPageRead).toBe(true);
    expect(groups.find((g) => g.memoryGb === 96)!.rangeIsPageRead).toBe(false);
    expect(g128.rows.every((r) => r.memoryGb === 128)).toBe(true);
    expect(g128.rows.every((r, i) => i === 0 || g128.rows[i - 1].amountEur <= r.amountEur)).toBe(true);
    expect(groups.find((g) => g.memoryGb === 64)!.rows.some((r) => r.evidence === "reported")).toBe(true);
  });

  it("shortens long model names without losing the variant", () => {
    const names = ladderRows(64).map((r) => r.name);
    expect(names).toContain("HP Z2 Mini G1a 128GB/1TB");
    expect(names.every((n) => !/Ryzen AI Max/.test(n))).toBe(true);
  });

  it("never prices a machine from a forum post or a search snippet", () => {
    const rows = ladderRows(0);
    const ids = new Set(rows.map((r) => r.id));
    expect(ids.has("asus-ascent-gx10")).toBe(false);
    expect(ids.has("rtx-5090")).toBe(false);
  });

  it("answers capacity by memory class", () => {
    const table = capacityTable();
    const dense = table.find((t) => t.workload.id === "local-dense-70b-q4");
    expect(dense?.cells).toEqual([false, false, true, true, true]);
    const moe120 = table.find((t) => t.workload.id === "local-moe-120b");
    expect(moe120?.cells).toEqual([false, false, false, true, true]);
  });

  it("lists documented suppliers for a brand and carries evidence tags", () => {
    const framework = brandSupply("framework");
    expect(framework.map((s) => s.supplier)).toEqual(expect.arrayContaining(["FSP Group", "Cooler Master", "Noctua"]));
    expect(framework.every((s) => s.evidence === "documented")).toBe(true);
    expect(brandSupply("gmktec").some((s) => s.supplier === "Sixunited")).toBe(true);
  });

  it("lists non-stub company profiles and marks Framework as the one documented EU entity", () => {
    expect(companies.every((c) => c.depth !== "stub")).toBe(true);
    expect(companies.find((c) => c.brandId === "bosgame")?.depth).toBe("thin");
    expect(companies.filter((c) => c.euLegalEntity === true).map((c) => c.brandId)).toEqual(["framework"]);
    expect(companies.some((c) => c.brandId === "hp")).toBe(false);
  });

  it("summarises expansion evidence in short findings", () => {
    expect(expansionFindings.length).toBeGreaterThan(0);
    expect(expansionFindings.every((f) => f.length <= 280)).toBe(true);
  });

  it("counts open gaps separately from the total", () => {
    expect(stats.gaps).toBeLessThan(stats.gapsTotal);
    expect(stats.gaps).toBeGreaterThan(0);
  });

  it("reports counts that match the records", () => {
    expect(stats.machines).toBe(machines.length);
    expect(stats.sources).toBeGreaterThan(150);
  });
});
