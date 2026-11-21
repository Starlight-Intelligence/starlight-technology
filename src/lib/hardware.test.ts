import { describe, expect, it } from "vitest";
import { bestOffer, compareCost, costPerCompletedTask, offerCost, sellerRisk, type Configuration, type Offer } from "./hardware";

const offer: Offer = {
  id: "test", seller: "Fixture", url: "https://example.invalid", currency: "EUR",
  itemMinor: 120_000, shippingMinor: 1_000, vatMinor: 21_000, vatMode: "invoice", condition: "new",
  availability: "in_stock", observedAt: "2026-11-21", risk: {},
};

const component: Configuration = {
  id: "component", brand: "Fixture", product: "GPU", category: "component", label: "Fixture",
  specs: {}, offers: [offer], sourceUrl: "https://example.invalid", observedAt: "2026-11-21",
  upgrades: [], benchmarks: [], components: [], compatibility: [],
};

describe("hardware comparison", () => {
  it("uses evidenced invoice VAT and preserves missing freight and unknown tax", () => {
    expect(offerCost(offer, .5)).toEqual({ gross: 121_000, net: 110_500 });
    expect(offerCost({ ...offer, shippingMinor: null }, 1)).toEqual({ gross: null, net: null });
    expect(offerCost({ ...offer, vatMode: "unknown", vatMinor: null }, 1).net).toBeNull();
    expect(offerCost({ ...offer, vatMode: "margin", vatMinor: null }, 1).net).toBe(121_000);
  });
  it("keeps seller uncertainty and ignores affiliate status in ordering", () => {
    expect(sellerRisk({ identity: "pass", warranty: "fail" })).toEqual({ minimum: 20, maximum: 70, coverage: 50 });
    const second = { ...offer, id: "a", affiliateUrl: "https://example.invalid/affiliate", itemMinor: 121_000 };
    expect(bestOffer([second, offer], 0)?.offer.id).toBe(offer.id);
    expect(bestOffer([{ ...offer, condition: "used" }, { ...offer, shippingMinor: null }], 1)).toBeNull();
  });
  it("refuses a partially evidenced build and prices the whole quantity once complete", () => {
    const build: Configuration = { ...component, category: "build", specs: {
      requiredSlots: ["graphics"], requiredChecks: { graphics: ["connector", "clearance"] },
    }, components: [{ slot: "graphics", id: component.id, quantity: 2 }],
    compatibility: [{ candidateId: component.id, dimension: "connector", outcome: "pass", rationale: "", url: component.sourceUrl }] };
    expect(compareCost(build, [component], 1).gross).toBeNull();
    build.compatibility.push({ ...build.compatibility[0], dimension: "clearance" });
    expect(compareCost(build, [component], 1)).toEqual({ gross: 242_000, net: 200_000, reason: null });
  });
  it("charges failed attempts to successful task completions and handles zero completions", () => {
    const run: Configuration["benchmarks"][number] = { workload: "fixture", version: 1, basis: "measured",
      attempted: 10, completed: 3, wallWh: 400, costMinor: 120, currency: "EUR", url: component.sourceUrl };
    expect(costPerCompletedTask(run)).toBe(40);
    expect(costPerCompletedTask({ ...run, completed: 0 })).toBeNull();
  });
});
