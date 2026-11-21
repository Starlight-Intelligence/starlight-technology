import evidence from "../../data/compute/decision-evidence.json";

export const workloads = {
  "code-assist": { label: "Code assistant inference", memoryGb: 20, cudaOnly: false, cloudAllowed: true },
  "private-llm": { label: "Private large-model inference", memoryGb: 48, cudaOnly: false, cloudAllowed: false },
  "cuda-creative": { label: "x86 CUDA creative pipeline", memoryGb: 24, cudaOnly: true, cloudAllowed: true }
} as const;

export type WorkloadId = keyof typeof workloads;
export type DecisionInput = { budgetEur: number; workload: WorkloadId; monthlyGpuHours: number };
type Variant = (typeof evidence.variants)[number];
export type Observation = {
  id: string; variantId: string; source: string; seller: string | null; market: string;
  shipsToNl: boolean | null; shippingMinor: number | null; currency: string; amountMinor: number;
  basis: string; availability: string; unit: string; observedOn: string | null; evidence: string;
  captureAgeDays: number; note: string;
};
const priceObservations: Observation[] = evidence.observations;
const sourceUrls: Record<string, string> = evidence.sources;
const DAY = 86_400_000;
const MAX_AGE_DAYS = 7;

export function parseDecisionInput(raw: unknown): DecisionInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { budgetEur, workload, monthlyGpuHours } = raw as Partial<DecisionInput>;
  if (typeof budgetEur !== "number" || !Number.isFinite(budgetEur) || budgetEur < 0 || budgetEur > 100_000 ||
      typeof monthlyGpuHours !== "number" || !Number.isFinite(monthlyGpuHours) || monthlyGpuHours < 0 || monthlyGpuHours > 744 ||
      typeof workload !== "string" || !Object.hasOwn(workloads, workload)) return null;
  return { budgetEur: Math.round(budgetEur * 100) / 100, workload, monthlyGpuHours };
}

function workloadFit(variant: Variant, workload: (typeof workloads)[WorkloadId]): "fails" | "conditional" | "documented-capacity" {
  if (variant.path === "cloud" && !workload.cloudAllowed) return "fails";
  if (workload.cudaOnly && variant.backend !== "cuda-x86") return "fails";
  if (variant.memoryKind === "dedicated") {
    if ((variant.acceleratorGb ?? 0) < workload.memoryGb) return "fails";
    return variant.specConfidence === "documented" ? "documented-capacity" : "conditional";
  }
  if ((variant.systemGb ?? 0) <= workload.memoryGb || (variant.acceleratorGb ?? Infinity) < workload.memoryGb) return "fails";
  return "conditional";
}

export function freshness(observation: Observation, asOf: string) {
  if (!observation.observedOn) return "undated";
  const age = (Date.parse(asOf) - Date.parse(observation.observedOn)) / DAY;
  if (!Number.isFinite(age) || age < 0) return "invalid";
  return age + observation.captureAgeDays <= MAX_AGE_DAYS ? "recent-observation" : "stale";
}

export function priceChange(previous: Observation, next: Observation) {
  if (previous.id !== next.id || previous.variantId !== next.variantId || previous.seller !== next.seller ||
      previous.evidence !== "source-read" || next.evidence !== "source-read" || !previous.seller ||
      previous.market !== next.market || previous.currency !== next.currency || previous.unit !== next.unit ||
      previous.basis !== next.basis || previous.basis === "unknown" ||
      !previous.observedOn || !next.observedOn || previous.observedOn >= next.observedOn) return null;
  return next.amountMinor - previous.amountMinor;
}

export function assessGpuUpgrade(check: {
  cardMm: number | null; caseMm: number | null; psuW: number | null; requiredW: number | null;
  connectorConfirmed: boolean | null; slotConfirmed: boolean | null;
}) {
  const { cardMm, caseMm, psuW, requiredW, connectorConfirmed, slotConfirmed } = check;
  if ((cardMm !== null && caseMm !== null && cardMm > caseMm) ||
      (psuW !== null && requiredW !== null && psuW < requiredW) ||
      connectorConfirmed === false || slotConfirmed === false) return "incompatible";
  if ([cardMm, caseMm, psuW, requiredW].some((value) => value === null || value <= 0) ||
      connectorConfirmed !== true || slotConfirmed !== true) return "unverified";
  return "documented-checks-pass";
}

export function financeTotal(downPaymentMinor: number, paymentMinor: number, months: number, feesMinor: number) {
  const inputs = [downPaymentMinor, paymentMinor, months, feesMinor];
  if (inputs.some((value) => !Number.isSafeInteger(value) || value < 0) || months < 1 || months > 120) return null;
  const total = downPaymentMinor + paymentMinor * months + feesMinor;
  return Number.isSafeInteger(total) ? total : null;
}

export function ownershipScenario(input: {
  purchaseEur: number; resaleEur: number; averageKw: number; powerEurKwh: number;
  localHours: number; otherLocalEur: number; cloudRateUsd: number; eurPerUsd: number;
  cloudHours: number; otherCloudEur: number; acceptedTasks: number;
}) {
  if (Object.values(input).some((value) => !Number.isFinite(value) || value < 0) ||
      input.resaleEur > input.purchaseEur || input.eurPerUsd === 0) return null;
  const localEur = input.purchaseEur - input.resaleEur + input.averageKw * input.powerEurKwh * input.localHours + input.otherLocalEur;
  const cloudEur = input.cloudRateUsd * input.eurPerUsd * input.cloudHours + input.otherCloudEur;
  if (![localEur, cloudEur].every(Number.isFinite)) return null;
  return { localEur, cloudEur, localPerAcceptedTask: input.acceptedTasks ? localEur / input.acceptedTasks : null,
    cloudPerAcceptedTask: input.acceptedTasks ? cloudEur / input.acceptedTasks : null };
}

export function compareCompute(input: DecisionInput, asOf = new Date().toISOString().slice(0, 10)) {
  const workload = workloads[input.workload];
  const budgetMinor = Math.round(input.budgetEur * 100);
  const rows = evidence.variants.map((variant) => {
    const fit = workloadFit(variant, workload);
    const observations = priceObservations.filter((offer) => offer.variantId === variant.id)
      .map((offer) => ({ ...offer, freshness: freshness(offer, asOf),
        url: sourceUrls[offer.source], scenarioAmountMinor: offer.unit === "hour" ? Math.round(offer.amountMinor * input.monthlyGpuHours) : null }));
    const currentPrices = observations.filter((item) => item.evidence === "source-read" &&
      item.freshness === "recent-observation" && item.currency === "EUR" && item.unit === "purchase");
    const deliveredPrices = currentPrices.flatMap((offer) =>
      offer.shipsToNl === true && offer.shippingMinor !== null && offer.basis === "gross" && offer.availability === "in-stock" ?
        [{ totalMinor: offer.amountMinor + offer.shippingMinor, observationId: offer.id }] : []);
    const selected = deliveredPrices.sort((a, b) => a.totalMinor - b.totalMinor || a.observationId.localeCompare(b.observationId))[0];
    const verifiedTotalMinor = selected?.totalMinor ?? null;
    const budget = verifiedTotalMinor !== null ? (verifiedTotalMinor <= budgetMinor ? "within" : "above") :
      currentPrices.length && currentPrices.every((offer) => offer.amountMinor > budgetMinor && offer.basis === "gross") ?
        "listed-price-above" : "unverified";
    return { ...variant, fit, budget, verifiedTotalMinor, selectedObservationId: selected?.observationId ?? null, observations,
      sources: variant.sources.map((id) => ({ id, url: sourceUrls[id] })) };
  });
  const eligible = rows.filter((row) => row.fit === "documented-capacity" && row.budget === "within")
    .sort((a, b) => a.verifiedTotalMinor! - b.verifiedTotalMinor!);
  const cloud = input.monthlyGpuHours > 0 && budgetMinor > 0 && rows.find((row) =>
    row.path === "cloud" && row.fit === "documented-capacity" && row.observations.some((offer) =>
      offer.evidence === "source-read" && offer.unit === "hour" && offer.freshness === "recent-observation"));
  const action: { kind: "verify-and-buy" | "pilot-cloud" | "hold"; variantId: string | null; reason: string } = eligible.length ?
    { kind: "verify-and-buy", variantId: eligible[0].id, reason: "Compare the final invoice and run your workload acceptance check before ordering." } :
    cloud ? { kind: "pilot-cloud", variantId: cloud.id, reason: "Price a capped trial in the required region and measure accepted tasks before committing to hardware. Check the full cloud quote before spending." } :
      { kind: "hold", variantId: null, reason: "Get a dated delivered quote and run a local memory and runtime check before committing funds." };
  return { revision: evidence.revision, modelVersion: "compute-advisor.v1", asOf, input, workload, action, rows };
}
