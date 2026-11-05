import { describe, expect, it } from "vitest";
import { allEditorial, builds, comparisons, guides } from "./content";
import { getSources } from "./sources";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

describe("editorial contracts", () => {
  it("uses unique slugs", () => {
    const slugs = allEditorial.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("publishes a meaningful launch set", () => {
    expect(builds.length).toBeGreaterThanOrEqual(3);
    expect(comparisons.length).toBeGreaterThanOrEqual(3);
    expect(guides.length).toBeGreaterThanOrEqual(3);
  });
  it("requires evidence, dates and substantive sections", () => {
    for (const entry of allEditorial) {
      expect(entry.evidenceStatus).toBeTruthy();
      expect(entry.lastVerified).toMatch(isoDate);
      expect(entry.summary.length).toBeGreaterThan(80);
      expect(entry.sections.length).toBeGreaterThanOrEqual(3);
      expect(() => getSources(entry.sourceIds)).not.toThrow();
    }
  });
});
