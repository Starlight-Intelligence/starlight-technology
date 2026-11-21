export type Market = "NL" | "DE";
type Outcome = "pass" | "fail" | "unknown";
type Currency = "EUR" | "USD" | "GBP";
const riskWeights = { identity: 30, returns: 20, warranty: 20, payment: 20, invoice: 10 };

export interface Offer {
  id: string;
  seller: string;
  url: string;
  currency: Currency;
  itemMinor: number;
  shippingMinor: number | null;
  vatMinor: number | null;
  vatMode: "invoice" | "margin" | "private" | "unknown";
  condition: "new" | "refurbished" | "used";
  availability: "in_stock" | "backorder" | "unavailable" | "unknown";
  observedAt: string;
  risk: Partial<Record<keyof typeof riskWeights, Outcome>>;
  history?: { observedAt: string; itemMinor: number; currency: Currency; url: string }[];
  affiliateUrl?: string | null;
  grade?: string | null;
  warrantyMonths?: number | null;
}

export interface Configuration {
  id: string;
  brand: string;
  product: string;
  category: "desktop" | "mini" | "laptop" | "component" | "build";
  label: string;
  specs: {
    processor?: string; ramGb?: number; storageGb?: number; gpu?: string;
    memory?: string; os?: string; requiredSlots?: string[];
    requiredChecks?: Record<string, string[]>;
  };
  sourceUrl: string;
  observedAt: string;
  offers: Offer[];
  upgrades: { targetId: string; action: string; url: string }[];
  components: { slot: string; id: string; quantity: number }[];
  compatibility: { candidateId: string; dimension: string; outcome: Outcome; rationale: string; url: string }[];
  benchmarks: { workload: string; version: number; basis: "measured" | "third-party" | "modeled";
    completed: number; attempted: number; wallWh: number; costMinor: number; currency: Currency; url: string }[];
  references?: { id: string; url: string; itemMinor: number; observedAt: string; condition: string }[];
  sold?: { soldAt: string; grade: string; realizedMinor: number; currency: Currency; url: string }[];
}

export function offerCost(offer: Offer, recoverableShare = 0) {
  const gross = offer.shippingMinor === null ? null : offer.itemMinor + offer.shippingMinor;
  const vat = offer.vatMode === "invoice" ? offer.vatMinor : null;
  const validShare = Number.isFinite(recoverableShare) && recoverableShare >= 0 && recoverableShare <= 1;
  const net = gross === null || !validShare || (vat === null && offer.vatMode === "unknown")
    ? null : gross - Math.round((vat ?? 0) * recoverableShare);
  return { gross, net };
}

export function sellerRisk(signals: Offer["risk"]) {
  let confirmedRisk = 0;
  let unknownWeight = 0;
  for (const [dimension, weight] of Object.entries(riskWeights)) {
    const signal = signals[dimension as keyof typeof riskWeights];
    if (signal === "fail") confirmedRisk += weight;
    if (!signal || signal === "unknown") unknownWeight += weight;
  }
  return { minimum: confirmedRisk, maximum: confirmedRisk + unknownWeight, coverage: 100 - unknownWeight };
}

export function bestOffer(offers: Offer[], recoverableShare: number) {
  return offers.filter((offer) => offer.currency === "EUR" && offer.availability === "in_stock" && offer.condition === "new")
    .map((offer) => ({ offer, ...offerCost(offer, recoverableShare) }))
    .filter((entry) => (recoverableShare > 0 ? entry.net : entry.gross) !== null)
    .sort((a, b) => (recoverableShare > 0 ? a.net! - b.net! : a.gross! - b.gross!) ||
      sellerRisk(a.offer.risk).maximum - sellerRisk(b.offer.risk).maximum ||
      b.offer.observedAt.localeCompare(a.offer.observedAt) || a.offer.id.localeCompare(b.offer.id))[0] ?? null;
}

export function compareCost(configuration: Configuration, catalog: Configuration[], recoverableShare: number) {
  if (configuration.category !== "build") {
    const best = bestOffer(configuration.offers, recoverableShare);
    return best ? { gross: best.gross, net: best.net, reason: null }
      : { gross: null, net: null, reason: "A new in-stock EUR offer with the required cost evidence is pending." };
  }

  const open = (reason: string) => ({ gross: null, net: null, reason });
  const slots = configuration.specs.requiredSlots ?? [];
  if (!slots.length || slots.some((slot) => !configuration.components.some((part) => part.slot === slot))) {
    return open("The bill of materials is incomplete.");
  }
  let gross = 0;
  let net = 0;
  let knownNet = true;
  for (const part of configuration.components) {
    const checks = configuration.compatibility.filter((check) => check.candidateId === part.id);
    const required = configuration.specs.requiredChecks?.[part.slot] ?? [];
    if (!required.length || checks.some((check) => check.outcome !== "pass") ||
      required.some((dimension) => !checks.some((check) => check.dimension === dimension && check.outcome === "pass"))) {
      return open("Compatibility evidence is incomplete or identifies a conflict.");
    }
    const component = catalog.find((item) => item.id === part.id);
    const best = bestOffer(component?.offers ?? [], recoverableShare);
    if (!best || best.gross === null) return open("A component is missing a complete delivered offer.");
    gross += best.gross * part.quantity;
    if (best.net === null) knownNet = false;
    else net += best.net * part.quantity;
  }
  return { gross, net: knownNet ? net : null, reason: null };
}

export function costPerCompletedTask(run: Configuration["benchmarks"][number]) {
  return run.completed > 0 ? run.costMinor / run.completed : null;
}
