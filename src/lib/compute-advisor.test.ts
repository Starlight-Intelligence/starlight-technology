import { describe, expect, it } from "vitest";
import { assessGpuUpgrade, compareCompute, financeTotal, ownershipScenario, parseDecisionInput, priceChange } from "./compute-advisor";

const asOf = "2026-11-21";
const input = { budgetEur: 4500, workload: "code-assist", monthlyGpuHours: 40 } as const;

describe("Compute Advisor", () => {
  it("keeps a buyer quote out of actionable prices and keeps GPU variants distinct", () => {
    const result = compareCompute(input, asOf);
    const mobile = result.rows.find((row) => row.name === "Thunderobot MIX G2")!;
    const desktop = result.rows.find((row) => row.name === "MEMONKY P6")!;
    expect([mobile.acceleratorGb, desktop.acceleratorGb]).toEqual([24, 32]);
    expect(mobile.verifiedTotalMinor).toBeNull();
    expect(mobile.observations[0].freshness).toBe("undated");
    expect(result.rows.find((row) => row.name === "GMKtec EVO-X3")?.budget).toBe("unverified");
  });

  it("estimates only cloud GPU time and respects privacy, freshness, and zero spend", () => {
    const result = compareCompute(input, asOf);
    expect(result.action.kind).toBe("pilot-cloud");
    expect(result.rows.find((row) => row.path === "cloud")?.observations[0].scenarioAmountMinor).toBe(3560);
    expect(compareCompute({ ...input, workload: "private-llm" }, asOf).action.kind).toBe("hold");
    expect(compareCompute({ ...input, monthlyGpuHours: 0 }, asOf).action.kind).toBe("hold");
    expect(compareCompute({ ...input, budgetEur: 0 }, asOf).action.kind).toBe("hold");
    expect(compareCompute(input, "2026-12-01").action.kind).toBe("hold");
    const cached = compareCompute(input, "2026-11-24").rows.find((row) => row.name === "NVIDIA DGX Spark");
    expect(cached?.observations[0].freshness).toBe("stale");
  });

  it("rejects invalid workload keys, numbers and quote arithmetic", () => {
    expect(parseDecisionInput({ ...input, workload: "__proto__" })).toBeNull();
    expect(parseDecisionInput({ ...input, budgetEur: Infinity })).toBeNull();
    expect(financeTotal(50000, 15000, 24, 1500)).toBe(411500);
    expect(financeTotal(0, 1, 0, 0)).toBeNull();
  });

  it("does not treat an unknown connector or fit as compatible", () => {
    const check = { cardMm: 300, caseMm: 330, psuW: 1000, requiredW: 850, connectorConfirmed: true, slotConfirmed: true };
    expect(assessGpuUpgrade(check)).toBe("documented-checks-pass");
    expect(assessGpuUpgrade({ ...check, cardMm: 350 })).toBe("incompatible");
    expect(assessGpuUpgrade({ ...check, connectorConfirmed: null })).toBe("unverified");
  });

  it("compares consecutive prices only on the same tax and variant basis", () => {
    const observed = compareCompute(input, asOf).rows.find((row) => row.path === "cloud")!.observations[0];
    const previous = { ...observed, basis: "gross", observedOn: "2026-11-20" };
    expect(priceChange(previous, { ...observed, basis: "gross", amountMinor: 99 })).toBe(10);
    expect(priceChange(previous, { ...observed, basis: "net" })).toBeNull();
    expect(priceChange(previous, { ...observed, basis: "gross", variantId: "another" })).toBeNull();
  });

  it("isolates FX assumptions and accepted tasks in ownership scenarios", () => {
    expect(ownershipScenario({ purchaseEur: 1000, resaleEur: 0, averageKw: 0.2, powerEurKwh: 0.5,
      localHours: 100, otherLocalEur: 50, cloudRateUsd: 1, eurPerUsd: 0.8, cloudHours: 100,
      otherCloudEur: 20, acceptedTasks: 10 })).toEqual({ localEur: 1060, cloudEur: 100, localPerAcceptedTask: 106, cloudPerAcceptedTask: 10 });
  });
});
